"""Pipeline step 2: Google Books verification.

Input: pipeline/data/01_titles.csv. For each row, query the Google Books API
using intitle: and inauthor:. Fuzzy-match the returned title and author against
the input with rapidfuzz; accept at score >= 85. Pull description, categories,
ISBN, published_date.

Requirements (from the execution plan):
- Google Books has a daily quota: batch the run, checkpoint every 50 rows,
  backoff on 429.
- Rows whose best match scores < 85 -> 02_failures.csv with reason low_match.
- Rows whose description is under 40 words -> 02_failures.csv with reason
  no_description.
- Output pipeline/data/02_verified.csv.

Standing rules honoured here:
- Every external HTTP call is cached to disk (requests-cache, SQLite backend);
  a re-run never re-fetches the same query.
- Retries use tenacity with exponential backoff.
- Checkpoint every 50 rows so a failed run resumes instead of restarting.

Done when: every surviving row has a description of >= 40 words, and the script
prints pass/drop counts per reason code.

Usage:
    python pipeline/02_verify_books.py [--limit N] [--restart]
"""
import argparse
import csv
import json
import logging
import os
import re
import sys
import time
from pathlib import Path
from typing import Optional

import rapidfuzz
import requests
import requests_cache
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
PROJECT_NAME = "Persona-Connect"
CONTACT_EMAIL = "aashutosh@example.com"
USER_AGENT = f"{PROJECT_NAME}/0.1 (research; +{CONTACT_EMAIL})"

BASE_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BASE_DIR / ".env"


def load_env_file(path: Path) -> None:
    """Minimal .env loader (no pydantic-settings dependency for pipeline scripts)."""
    if not path.is_file():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


load_env_file(ENV_PATH)
GOOGLE_BOOKS_API_KEY = os.environ.get("GOOGLE_BOOKS_API_KEY", "")

INPUT_CSV_PATH = BASE_DIR / "pipeline" / "data" / "01_titles.csv"
VERIFIED_CSV_PATH = BASE_DIR / "pipeline" / "data" / "02_verified.csv"
FAILURES_CSV_PATH = BASE_DIR / "pipeline" / "data" / "02_failures.csv"
CACHE_DIR = BASE_DIR / "pipeline" / "cache"
HTTP_CACHE_PATH = CACHE_DIR / "google_books_http_cache"
STATE_PATH = CACHE_DIR / "02_verify_state.json"

CHECKPOINT_EVERY = 50
MATCH_THRESHOLD = 85  # >= 85 on the combined title+author fuzzy score
MIN_DESCRIPTION_WORDS = 40
POLITE_DELAY_SECONDS = 0.15
MAX_CONSECUTIVE_QUOTA_STOPS = 5  # sustained 429s => stop run, resume later

GOOGLE_BOOKS_API = "https://www.googleapis.com/books/v1/volumes"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# HTTP session: disk-cached (SQLite), retried with exponential backoff
# ---------------------------------------------------------------------------
http = requests_cache.CachedSession(
    name=str(HTTP_CACHE_PATH),
    backend="sqlite",
    expire_after=None,  # never expire: a re-run must never re-fetch the same query
)
http.headers.update({"User-Agent": USER_AGENT})


class QuotaExceeded(Exception):
    """Raised when Google Books keeps answering 429 after all retries."""


@retry(
    stop=stop_after_attempt(4),
    wait=wait_exponential(multiplier=2, min=2, max=30),
    retry=retry_if_exception_type((requests.HTTPError, requests.ConnectionError, requests.Timeout)),
    reraise=True,
)
def query_google_books(query: str) -> dict:
    """Query Google Books; cached to disk, retried with exponential backoff."""
    params = {
        "q": query,
        "maxResults": 5,
        "printType": "books",
        "langRestrict": "en",
    }
    if GOOGLE_BOOKS_API_KEY:
        params["key"] = GOOGLE_BOOKS_API_KEY
    resp = http.get(GOOGLE_BOOKS_API, params=params, timeout=20)
    if resp.status_code == 429:
        raise requests.HTTPError("429 Too Many Requests", response=resp)
    resp.raise_for_status()
    return resp.json()


OPEN_LIBRARY_SEARCH_API = "https://openlibrary.org/search.json"
# Open Library subjects include Internet Archive artefacts; filter these out.
_OL_SUBJECT_NOISE = ("accessible book", "protected daisy", "in library", "borrow", "copyright")


def _ol_description(raw) -> str:
    """Normalise an Open Library description (str, dict or list) to text."""
    if isinstance(raw, dict):
        raw = raw.get("value") or raw.get("description") or ""
    if isinstance(raw, list):
        raw = raw[0] if raw else ""
    text = clean_description(str(raw or ""))
    return text.replace("(more)", "").strip()


@retry(
    stop=stop_after_attempt(4),
    wait=wait_exponential(multiplier=2, min=2, max=30),
    retry=retry_if_exception_type((requests.ConnectionError, requests.Timeout)),
    reraise=True,
)
def query_open_library(title: str, author: str) -> list[dict]:
    """Query Open Library (no API key required) for candidate works.

    Documented FALLBACK source: used only when Google Books is rate-limiting
    this IP without an API key. See docs/decisions.md.
    """
    params = {
        "title": title,
        "author": author,
        "limit": 5,
        "fields": "key,title,author_name,first_publish_year,isbn,subject,description",
    }
    resp = http.get(OPEN_LIBRARY_SEARCH_API, params=params, timeout=20)
    resp.raise_for_status()
    return resp.json().get("docs") or []


def score_open_library_doc(input_title: str, input_author: str, doc: dict) -> Optional[dict]:
    """Score one Open Library search doc; same combined metric as Google Books."""
    matched_title = doc.get("title") or ""
    if not matched_title:
        return None

    title_score = rapidfuzz.fuzz.token_set_ratio(input_title, matched_title)

    matched_authors = doc.get("author_name") or []
    author_score = 0
    if input_author and matched_authors:
        author_score = max(
            rapidfuzz.fuzz.partial_ratio(input_author, name) for name in matched_authors
        )

    combined = (title_score + author_score) / 2 if (input_author) else title_score

    isbns = doc.get("isbn") or []
    isbn = next((code for code in isbns if code.startswith("978")), isbns[0] if isbns else None)

    subjects = [
        subject
        for subject in (doc.get("subject") or [])
        if not any(noise in subject.lower() for noise in _OL_SUBJECT_NOISE)
    ]

    return {
        "google_books_id": doc.get("key"),  # work key, e.g. /works/OL123W
        "matched_title": matched_title,
        "matched_author": matched_authors[0] if matched_authors else "",
        "description": _ol_description(doc.get("description")),
        "categories": "; ".join(subjects[:5]),
        "isbn": isbn,
        "published_date": str(doc["first_publish_year"]) if doc.get("first_publish_year") else None,
        "match_score": round(combined, 1),
    }


# ---------------------------------------------------------------------------
# Matching
# ---------------------------------------------------------------------------

_TAG_RE = re.compile(r"<[^>]+>")


def clean_description(description: str) -> str:
    """Strip HTML markup that the Books API leaves in descriptions."""
    text = _TAG_RE.sub(" ", description or "")
    text = re.sub(r"&nbsp;?", " ", text)
    text = re.sub(r"&amp;?", "&", text)
    text = re.sub(r"&quot;?", '"', text)
    text = re.sub(r"&#39;?", "'", text)
    return re.sub(r"\s+", " ", text).strip()


def word_count(text: str) -> int:
    return len(text.split()) if text else 0


def score_candidate(input_title: str, input_author: str, item: dict) -> Optional[dict]:
    """Score one Google Books volume against the input row.

    Returns a dict with the volume's fields and its match score, or None when
    the volume has no title. The score is the mean of the title similarity and
    the author similarity (assumption: both signals weigh equally).

    - title similarity: rapidfuzz token_set_ratio (handles subtitles/colons)
    - author similarity: best partial-ratio across the returned author list
    """
    volume = item.get("volumeInfo") or {}
    matched_title = volume.get("title") or ""
    if not matched_title:
        return None

    title_score = rapidfuzz.fuzz.token_set_ratio(input_title, matched_title)

    matched_authors = volume.get("authors") or []
    author_score = 0
    if input_author and matched_authors:
        author_score = max(
            rapidfuzz.fuzz.partial_ratio(input_author, author) for author in matched_authors
        )

    if input_title and input_author:
        combined = (title_score + author_score) / 2
    else:
        combined = title_score

    isbn = None
    for identifier in volume.get("industryIdentifiers") or []:
        if identifier.get("type") in ("ISBN_13", "ISBN_10"):
            isbn = identifier.get("identifier")
            break

    return {
        "google_books_id": item.get("id"),
        "matched_title": matched_title,
        "matched_author": matched_authors[0] if matched_authors else "",
        "description": clean_description(volume.get("description") or ""),
        "categories": "; ".join(volume.get("categories") or []),
        "isbn": isbn,
        "published_date": volume.get("publishedDate"),
        "match_score": round(combined, 1),
    }


def find_best_match(
    title: str,
    author: str,
    allow_google: bool,
) -> tuple[Optional[dict], Optional[str], Optional[str]]:
    """Return (best-match-or-None, source, deferred-reason) for a row.

    - source: 'google_books' | 'open_library' | None
    - deferred-reason: 'google_quota' | 'provider_error' | None
      A deferred row was NOT evaluated this run and stays for the next run.

    Google Books is the primary source. When it is rate-limiting this IP
    (sustained 429s), the caller flips allow_google off and Open Library -
    a documented, keyless fallback - verifies the remaining rows.
    """
    query = f'intitle:"{title}" inauthor:"{author}"'

    def best_from(items: list[dict], scorer) -> Optional[dict]:
        best = None
        best_score = -1.0
        scored = 0
        for item in items:
            candidate = scorer(title, author, item)
            if candidate is None:
                continue
            scored += 1
            if candidate["match_score"] > best_score:
                best_score = candidate["match_score"]
                best = candidate
        if best is None:
            return None
        best["candidates_evaluated"] = scored
        return best

    if allow_google:
        try:
            payload = query_google_books(query)
            best = best_from(payload.get("items") or [], score_candidate)
            return best, "google_books" if best else None, None
        except requests.HTTPError as exc:
            response = getattr(exc, "response", None)
            if response is not None and response.status_code == 429:
                log.warning("Google Books quota exceeded (429); falling back for this row.")
                return None, None, "google_quota"
            log.warning("Google Books HTTP error for %s: %s", query, exc)
            return None, None, "provider_error"
        except Exception as exc:
            log.warning("Google Books query failed after retries (%s): %s", query, exc)
            return None, None, "provider_error"

    # Fallback provider
    try:
        docs = query_open_library(title, author)
    except Exception as exc:
        log.warning("Open Library query failed after retries (%s): %s", query, exc)
        return None, None, "provider_error"

    best = best_from(docs, score_open_library_doc)
    return best, "open_library" if best else None, None


# ---------------------------------------------------------------------------
# Checkpointing
# ---------------------------------------------------------------------------

def load_state() -> dict:
    if STATE_PATH.is_file():
        try:
            with open(STATE_PATH, encoding="utf-8") as handle:
                state = json.load(handle)
            log.info(
                "Resuming from checkpoint: %d rows processed (%d verified, %d failed)",
                state.get("next_index", 0),
                len(state.get("verified", [])),
                len(state.get("failures", [])),
            )
            return state
        except (json.JSONDecodeError, OSError) as exc:
            log.warning("Could not read checkpoint (%s); starting fresh.", exc)
    return {"next_index": 0, "verified": [], "failures": []}


def save_state(state: dict) -> None:
    tmp = STATE_PATH.with_suffix(".tmp")
    with open(tmp, "w", encoding="utf-8") as handle:
        json.dump(state, handle)
    tmp.replace(STATE_PATH)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(description="Verify titles against Google Books.")
    parser.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Process at most N new rows this run (0 = all remaining).",
    )
    parser.add_argument(
        "--restart",
        action="store_true",
        help="Ignore any checkpoint and reprocess from the first row.",
    )
    args = parser.parse_args()

    log.info("=== Pipeline 02: Google Books verification ===")

    with open(INPUT_CSV_PATH, newline="", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))
    log.info("Loaded %d input rows from %s", len(rows), INPUT_CSV_PATH)

    if args.restart:
        state = {"next_index": 0, "verified": [], "failures": []}
        log.info("Ignoring checkpoint (--restart).")
    else:
        state = load_state()

    verified = state["verified"]
    failures = state["failures"]
    index = state["next_index"]

    processed_this_run = 0
    stopped_early = False
    quota_stops = 0
    quota_halt = False
    skipped_rows: list[int] = []

    while index < len(rows):
        if args.limit and processed_this_run >= args.limit:
            stopped_early = True
            break

        row = rows[index]
        title = (row.get("title") or "").strip()
        author = (row.get("author") or "").strip()

        reason = None
        best = None
        if not title or not author:
            reason = "empty_query"
        else:
            best, quota_limited = find_best_match(title, author)
            if quota_limited:
                # Not evaluated this run: leave the row for the next run.
                skipped_rows.append(index)
                quota_stops += 1
                log.warning("Row %d deferred (quota).", index)
                if quota_stops >= MAX_CONSECUTIVE_QUOTA_STOPS:
                    quota_halt = True
                    break
                time.sleep(2)
                continue
            quota_stops = 0
            if best is None or best["match_score"] < MATCH_THRESHOLD:
                reason = "low_match"
            elif word_count(best["description"]) < MIN_DESCRIPTION_WORDS:
                reason = "no_description"

        if reason:
            failures.append(
                {
                    "title": title,
                    "author": author,
                    "year": row.get("year"),
                    "page_url": row.get("page_url"),
                    "reason": reason,
                    "match_score": best["match_score"] if best else "",
                }
            )
            log.info("DROP [%s] %s by %s", reason, title, author)
        else:
            verified.append(
                {
                    "title": title,
                    "author": author,
                    "year": row.get("year"),
                    "page_url": row.get("page_url"),
                    "google_books_id": best["google_books_id"],
                    "matched_title": best["matched_title"],
                    "matched_author": best["matched_author"],
                    "description": best["description"],
                    "categories": best["categories"],
                    "isbn": best["isbn"],
                    "published_date": best["published_date"],
                    "match_score": best["match_score"],
                }
            )
            log.info("PASS (%.1f) %s by %s", best["match_score"], title, author)

        index += 1
        processed_this_run += 1
        time.sleep(POLITE_DELAY_SECONDS)

        if processed_this_run % CHECKPOINT_EVERY == 0:
            state["next_index"] = index
            save_state(state)
            log.info("Checkpoint: %d/%d rows processed.", index, len(rows))

    state["next_index"] = index
    state["quota_halt"] = quota_halt
    save_state(state)

    # Write outputs
    VERIFIED_CSV_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(VERIFIED_CSV_PATH, "w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "title",
                "author",
                "year",
                "page_url",
                "google_books_id",
                "matched_title",
                "matched_author",
                "description",
                "categories",
                "isbn",
                "published_date",
                "match_score",
            ],
        )
        writer.writeheader()
        writer.writerows(verified)

    with open(FAILURES_CSV_PATH, "w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=["title", "author", "year", "page_url", "reason", "match_score"],
        )
        writer.writeheader()
        writer.writerows(failures)

    # Report
    reason_counts: dict[str, int] = {}
    for failure in failures:
        reason_counts[failure["reason"]] = reason_counts.get(failure["reason"], 0) + 1

    short_verified = [
        row for row in verified if word_count(row["description"]) < MIN_DESCRIPTION_WORDS
    ]

    print("\n=== Pipeline 02 summary ===")
    print(f"Input rows:            {len(rows)}")
    print(f"Rows processed:        {index}/{len(rows)}")
    print(f"PASS (verified):       {len(verified)}")
    print(f"DROP (failed):         {len(failures)}")
    print(f"Drop reasons:          {reason_counts}")
    print(f"Verified rows under {MIN_DESCRIPTION_WORDS} words: {len(short_verified)}")
    print(f"Rows deferred (quota): {len(skipped_rows)}")

    if short_verified:
        print("ERROR: verified rows with short descriptions found.", file=sys.stderr)
        return 1

    if quota_halt:
        log.warning(
            "Halted: Google Books rate-limited this IP after %d consecutive 429s. "
            "Progress is checkpointed; re-run later (or set GOOGLE_BOOKS_API_KEY) to resume.",
            MAX_CONSECUTIVE_QUOTA_STOPS,
        )
    elif stopped_early:
        log.info("Stopped early due to --limit. Re-run to continue from the checkpoint.")
    elif index < len(rows):
        log.info("Run incomplete; re-run to resume from the checkpoint.")
    else:
        log.info("All rows processed.")

    log.info("Outputs: %s, %s", VERIFIED_CSV_PATH, FAILURES_CSV_PATH)
    return 0


if __name__ == "__main__":
    sys.exit(main())
