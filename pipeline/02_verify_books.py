"""Pipeline step 2: Google Books verification.

Input: pipeline/data/01_titles.csv.
For each row, query the Google Books API using intitle: and inauthor:.
Fuzzy-match the returned title and author against the input with rapidfuzz;
accept at score >= 85.
Pull description, categories, ISBN, published_date.

Requirements:
- Google Books has a daily quota: batch the run, checkpoint every 50 rows, backoff on 429.
- Rows whose best match scores < 85 → failures.csv with reason low_match.
- Rows whose description is under 40 words → failures.csv with reason no_description.
- Output pipeline/data/02_verified.csv.

Done when: every surviving row has a description of >= 40 words, and the script prints
pass/drop counts per reason code.
"""
import csv
import os
import re
import sys
import time
import logging
from pathlib import Path
from typing import Dict, List, Optional

import rapidfuzz
import requests

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
PROJECT_NAME = "Persona-Connect"
CONTACT_EMAIL = "aashutosh@example.com"
USER_AGENT = f"{PROJECT_NAME} (+{CONTACT_EMAIL})"

BASE_DIR = Path(__file__).resolve().parent.parent
TITLES_CSV_PATH = BASE_DIR / "pipeline" / "data" / "01_titles.csv"
VERIFIED_CSV_PATH = BASE_DIR / "pipeline" / "data" / "02_verified.csv"
FAILURES_CSV_PATH = BASE_DIR / "pipeline" / "data" / "02_failures.csv"

VERIFIED_CSV_PATH.parent.mkdir(parents=True, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Google Books API configuration
# ---------------------------------------------------------------------------
GOOGLE_BOOKS_API = "https://www.googleapis.com/books/v1/volumes"
BATCH_SIZE = 50  # Process in batches to respect API quotas
CHECKPOINT_EVERY = 50  # Save progress every CHECKPOINT_EVERY rows

# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

def search_google_books(title: str, author: str, batch_id: int, session: requests.Session) -> Optional[Dict]:
    """Search Google Books for a title and author, returning the best match.

    Returns a dict with:
    - id: volume ID
    - title: matched title
    - author: matched author
    - description: book description
    - categories: list of categories
    - isbn: ISBN (or None)
    - published_date: publication date (or None)
    - match_score: similarity score (0-100)

    Returns None if no match found.
    """
    # Construct query: combine title and author
    query_parts = []
    if title:
        query_parts.append(f"intitle:{title}")
    if author:
        query_parts.append(f"inauthor:{author}")

    if not query_parts:
        return None

    query = " ".join(query_parts)

    params = {
        "q": query,
        "maxResults": 5,  # Get multiple results to find the best match
        "userAgent": USER_AGENT,
        "printType": "books",
        "langRestrict": "en",
    }

    delay = 0.1
    max_delay = 2.0
    for attempt in range(5):
        try:
            resp = session.get(GOOGLE_BOOKS_API, params=params, timeout=15)
            time.sleep(delay)
            delay = min(delay * 2, max_delay)

            if resp.status_code == 429:
                # Too many requests – back off and retry
                continue
            elif resp.status_code != 200:
                log.warning("Google Books API error: %s", resp.status_code)
                continue

            data = resp.json()

            if not data.get("items"):
                return None

            best_match = None
            best_score = 0

            for item in data["items"]:
                volume_info = item.get("volumeInfo", {})
                if not volume_info:
                    continue

                # Extract book info
                book_title = volume_info.get("title", "")
                book_authors = volume_info.get("authors", [])

                if not book_title:
                    continue

                # Calculate similarity scores
                title_score = rapidfuzz.process.extractOne(title, [book_title]) if title else 0
                title_score = title_score[1] if title_score else 0

                author_score = 0
                if author and book_authors:
                    # Check if any author matches
                    for book_author in book_authors:
                        author_score = max(author_score, rapidfuzz.process.extractOne(author, [book_author])[1] if rapidfuzz.process.extractOne(author, [book_author]) else 0)

                # Average the scores (both title and author must be considered)
                combined_score = (title_score + author_score) / 2 if (title and author) else title_score

                # Only consider matches above threshold
                if combined_score >= 85:
                    if combined_score > best_score:
                        best_score = combined_score
                        best_match = {
                            "id": item["id"],
                            "title": book_title,
                            "author": book_authors[0] if book_authors else "",
                            "description": volume_info.get("description", ""),
                            "categories": volume_info.get("categories", []),
                            "isbn": None,
                            "published_date": None,
                            "match_score": combined_score,
                        }

            return best_match

        except requests.HTTPError as exc:
            if resp.status_code in (429, 500, 502, 503, 504) and attempt < 4:
                continue
            log.error("HTTP error fetching Google Books for %s: %s", query, exc)
            break
        except Exception as exc:
            log.error("Unexpected error fetching Google Books for %s: %s", query, exc)
            break

    return None


def load_titles(csv_path: Path) -> List[Dict]:
    """Load titles from CSV file."""
    titles = []
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            titles.append({
                "title": row["title"],
                "author": row["author"],
                "year": row.get("year"),
                "page_url": row.get("page_url", ""),
            })
    log.info("Loaded %d titles from %s", len(titles), csv_path)
    return titles


def save_checkpoint(verified: List[Dict], failures: List[Dict], checkpoint_num: int):
    """Save progress to checkpoint files."""
    if verified:
        verified_path = BASE_DIR / "pipeline" / "cache" / f"02_verified_checkpoint_{checkpoint_num}.csv"
        with open(verified_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["title", "author", "year", "page_url", "book_id", "verified_title", "verified_author", "description", "categories", "isbn", "published_date", "match_score"])
            for entry in verified:
                writer.writerow([
                    entry["title"],
                    entry["author"],
                    entry.get("year"),
                    entry.get("page_url", ""),
                    entry.get("book_id", ""),
                    entry.get("verified_title", ""),
                    entry.get("verified_author", ""),
                    entry.get("description", ""),
                    entry.get("categories", ""),
                    entry.get("isbn", ""),
                    entry.get("published_date", ""),
                    entry.get("match_score", 0),
                ])

    if failures:
        failures_path = BASE_DIR / "pipeline" / "cache" / f"02_failures_checkpoint_{checkpoint_num}.csv"
        with open(failures_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["title", "author", "year", "page_url", "reason"])
            for entry in failures:
                writer.writerow([
                    entry["title"],
                    entry["author"],
                    entry.get("year"),
                    entry.get("page_url", ""),
                    entry["reason"],
                ])

    log.info("Checkpoint saved after %d verified, %d failed", len(verified), len(failures))


def load_checkpoint(checkpoint_num: int) -> tuple[List[Dict], List[Dict]]:
    """Load progress from checkpoint files."""
    verified = []
    failures = []

    verified_path = BASE_DIR / "pipeline" / "cache" / f"02_verified_checkpoint_{checkpoint_num}.csv"
    failures_path = BASE_DIR / "pipeline" / "cache" / f"02_failures_checkpoint_{checkpoint_num}.csv"

    if verified_path.is_file():
        with open(verified_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                verified.append({
                    "title": row["title"],
                    "author": row["author"],
                    "year": row.get("year"),
                    "page_url": row.get("page_url", ""),
                    "book_id": row.get("book_id", ""),
                    "verified_title": row.get("verified_title", ""),
                    "verified_author": row.get("verified_author", ""),
                    "description": row.get("description", ""),
                    "categories": row.get("categories", ""),
                    "isbn": row.get("isbn", ""),
                    "published_date": row.get("published_date", ""),
                    "match_score": float(row.get("match_score", 0)),
                })
        log.info("Loaded %d verified from checkpoint", len(verified))

    if failures_path.is_file():
        with open(failures_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                failures.append({
                    "title": row["title"],
                    "author": row["author"],
                    "year": row.get("year"),
                    "page_url": row.get("page_url", ""),
                    "reason": row["reason"],
                })
        log.info("Loaded %d failed from checkpoint", len(failures))

    return verified, failures


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    log.info("=== Pipeline 02: Google Books verification ===")

    # Load titles
    titles = load_titles(TITLES_CSV_PATH)

    # Try to load from checkpoint if exists
    checkpoint_files = list(BASE_DIR.joinpath("pipeline", "cache").glob("02_verified_checkpoint_*.csv"))
    if checkpoint_files:
        # Find the latest checkpoint
        latest_checkpoint = max(checkpoint_files, key=lambda x: int(x.stem.split("_")[-1]))
        checkpoint_num = int(latest_checkpoint.stem.split("_")[-1])
        log.info("Loading from checkpoint %d", checkpoint_num)
        verified, failures = load_checkpoint(checkpoint_num)
        # Convert failures dict keys to match expected format
        processed_failures = []
        for failure in failures:
            processed_failures.append({
                "title": failure["title"],
                "author": failure["author"],
                "reason": failure["reason"],
                "original_data": {k: v for k, v in failure.items() if k not in ["title", "author", "reason"]}
            })
        failures = processed_failures
        # Track which titles have been processed
        processed_titles = {(v["title"], v["author"]) for v in verified}
    else:
        verified = []
        failures = []
        processed_titles = set()
        checkpoint_num = 0

    # Initialize session
    session = requests.Session()
    session.headers.update({"User-Agent": USER_AGENT})

    # Process titles
    total_processed = 0
    for i, title_entry in enumerate(titles):
        title = title_entry["title"]
        author = title_entry["author"]

        # Skip if already processed (from checkpoint)
        if (title, author) in processed_titles:
            continue

        # Search Google Books
        result = search_google_books(title, author, checkpoint_num, session)

        if result:
            # Check description length
            description = result.get("description", "")
            if description and len(description.split()) >= 40:
                verified.append({
                    "title": title,
                    "author": author,
                    "year": title_entry.get("year"),
                    "page_url": title_entry.get("page_url", ""),
                    "book_id": result["id"],
                    "verified_title": result["title"],
                    "verified_author": result["author"],
                    "description": description,
                    "categories": ", ".join(result["categories"]),
                    "isbn": result.get("isbn", ""),
                    "published_date": result.get("published_date", ""),
                    "match_score": result["match_score"],
                })
                log.info("Verified: %s by %s (score: %.1f)", title, author, result["match_score"])
            else:
                failures.append({
                    "title": title,
                    "author": author,
                    "reason": "no_description",
                    "year": title_entry.get("year"),
                    "page_url": title_entry.get("page_url", ""),
                })
                log.info("Failed - no description: %s by %s", title, author)
        else:
            failures.append({
                "title": title,
                "author": author,
                "reason": "low_match",
                "year": title_entry.get("year"),
                "page_url": title_entry.get("page_url", ""),
            })
            log.info("Failed - low match: %s by %s", title, author)

        total_processed += 1

        # Save checkpoint every CHECKPOINT_EVERY rows
        if total_processed % CHECKPOINT_EVERY == 0:
            checkpoint_num += 1
            save_checkpoint(verified, failures, checkpoint_num)

        # Respect API rate limits
        time.sleep(0.1)

    # Save final results
    save_checkpoint(verified, failures, checkpoint_num + 1)

    # Write to output files
    with open(VERIFIED_CSV_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow([
            "title", "author", "year", "page_url", "book_id", "verified_title",
            "verified_author", "description", "categories", "isbn", "published_date", "match_score"
        ])
        for entry in verified:
            writer.writerow([
                entry["title"], entry["author"], entry.get("year"), entry.get("page_url", ""),
                entry.get("book_id", ""), entry.get("verified_title", ""), entry.get("verified_author", ""),
                entry.get("description", ""), entry.get("categories", ""), entry.get("isbn", ""),
                entry.get("published_date", ""), entry.get("match_score", 0)
            ])

    # Write failures to CSV
    with open(FAILURES_CSV_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["title", "author", "year", "page_url", "reason"])
        for entry in failures:
            writer.writerow([
                entry["title"], entry["author"], entry.get("year"), entry.get("page_url", ""), entry["reason"]
            ])

    # Print summary
    pass_count = len(verified)
    drop_count = len(failures)
    reason_counts = {}
    for failure in failures:
        reason = failure["reason"]
        reason_counts[reason] = reason_counts.get(reason, 0) + 1

    print(f"Verification complete:")
    print(f"  Pass: {pass_count}")
    print(f"  Drop: {drop_count}")
    print(f"  Reasons: {reason_counts}")

    # Done check: every surviving row must have a description >= 40 words
    if verified:
        for entry in verified:
            desc_words = len(entry.get("description", "").split())
            if desc_words < 40:
                print(f"ERROR: Verified row with description < 40 words: {entry['title']}")
                sys.exit(1)
        print("All verified rows have descriptions >= 40 words.")
    else:
        print("ERROR: No verified rows!")
        sys.exit(1)

    log.info("Pipeline 02 complete: %d verified, %d failed", pass_count, drop_count)


if __name__ == "__main__":
    main()