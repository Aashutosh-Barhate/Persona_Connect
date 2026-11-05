"""Pipeline step 1: Extract titles from Wikipedia.

Reads Wikipedia's list of autobiographies via the MediaWiki API,
parses wikitext with mwparserfromhell, and outputs pipeline/data/01_titles.csv.

Requirements:
- Descriptive User-Agent header identifying the project and a contact; respect rate limits.
- Cache the raw API response in pipeline/cache/.
- Output pipeline/data/01_titles.csv.
- Log every skipped line with a reason code.

Done when: no duplicate (title, author) pairs, every row has a non-empty author,
and at least 800 rows are produced. Print the row count and the skip-reason histogram.
"""
import csv
import os
import re
import sys
import time
import logging
from pathlib import Path

import mwparserfromhell
import requests

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
PROJECT_NAME = "Persona-Connect"
CONTACT_EMAIL = "aashutosh@example.com"
USER_AGENT = f"{PROJECT_NAME} (+{CONTACT_EMAIL})"

BASE_DIR = Path(__file__).resolve().parent.parent
API_CACHE_DIR = BASE_DIR / "pipeline" / "cache"
TITLES_CSV_PATH = BASE_DIR / "pipeline" / "data" / "01_titles.csv"

API_CACHE_DIR.mkdir(parents=True, exist_ok=True)
TITLES_CSV_PATH.parent.mkdir(parents=True, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# MediaWiki API helpers
# ---------------------------------------------------------------------------

WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php"


def fetch_wikitext(page_title: str, session: requests.Session) -> str:
    """Fetch the wikitext of a Wikipedia page, caching the response.

    The cache key is the page title; responses are stored on disk under
    pipeline/cache/.  A re-run will never re-fetch the same query because
    the cached response is returned immediately.
    """
    cache_file = API_CACHE_DIR / f"{page_title}.json"
    if cache_file.is_file():
        import json
        with open(cache_file) as f:
            data = json.load(f)
        return data["wikitext"]

    params = {
        "action": "parse",
        "page": page_title,
        "prop": "wikitext",
        "format": "json",
        "useragent": USER_AGENT,
    }

    delay = 0.1
    max_delay = 5.0
    for attempt in range(10):
        try:
            resp = session.get(WIKIPEDIA_API, params=params, timeout=15)
            time.sleep(delay)
            delay = min(delay * 2, max_delay)

            if resp.status_code == 429:
                continue

            resp.raise_for_status()
            data = resp.json()

            wikitext = data["parse"]["wikitext"]["*"]
            with open(cache_file, "w") as f:
                import json as json_mod
                json_mod.dump({"wikitext": wikitext}, f)

            return wikitext

        except requests.HTTPError as exc:
            if resp.status_code in (429, 500, 502, 503, 504) and attempt < 9:
                continue
            log.error("HTTP error fetching %s: %s", page_title, exc)
            raise
        except (KeyError, TypeError) as exc:
            log.error("Unexpected response for %s: %s", page_title, exc)
            raise

    raise RuntimeError(f"Failed to fetch {page_title} after 10 attempts")


# ---------------------------------------------------------------------------
# Title / author / year extraction from wikitext
# ---------------------------------------------------------------------------

def parse_autobiography_list_v2(wikitext: str) -> list[dict]:
    """Parse the Wikipedia list of autobiographies using regex on wikitext.

    The page has a wikitable with rows formatted as:
    | [[Author]] || ''Title'' || Year

    or

    | [[Author]] || ''[[[[Title]]]]'' || Year

    Entries are grouped by profession sections.
    """
    entries = []
    
    # Process each line of the wikitext
    for line in wikitext.split('\n'):
        line = line.strip()
        
        # Skip non-data lines
        if not line or line.startswith('{') or line.startswith('!') or line.startswith('|-'):
            continue
        
        # Must contain || separator (wikitable cell separator)
        if '||' not in line:
            continue
        
        # Must start with | (table cell)
        if not line.startswith('|'):
            continue
        
        # Skip lines that don't have a year (4-digit year between 1000-2099)
        if not re.search(r'\b(1\d{3}|20\d{2})\b', line):
            continue
        
        # Split by || to get cells
        cells = line.split('||')
        if len(cells) < 3:
            continue
        
        # Extract author from first cell
        author_cell = cells[0].strip()
        author_match = re.search(r'\[\[([^\]]+)\]\]', author_cell)
        if not author_match:
            continue
        
        author_raw = author_match.group(1)
        # Handle [[Author|Display]] format
        if '|' in author_raw:
            author_name = author_raw.split('|')[0].strip()
        else:
            author_name = author_raw.strip()
        
        # Skip header rows
        if author_name.lower() in ['author', 'see also', 'references', 'title of book']:
            continue
        
        # Extract title from second cell
        title_cell = cells[1].strip()
        # Remove wiki formatting
        title = re.sub(r"'''", "", title_cell)
        # Remove wikilink if present
        title = re.sub(r'\[\[([^\]]+)\]\]', r'\1', title)
        # Remove bold/italic markers
        title = re.sub(r"''", "", title)
        title = title.strip()
        title = re.sub(r'\s+', ' ', title)  # Normalize whitespace
        
        # Extract year from third cell
        year_cell = cells[2].strip()
        year_match = re.search(r'\b(1\d{3}|20\d{2})\b', year_cell)
        year = int(year_match.group(1)) if year_match else None
        
        # Validate
        if not author_name or len(author_name) < 2:
            continue
        if not title or len(title) < 2:
            continue
        
        entries.append({
            "title": title,
            "author": author_name,
            "year": year,
        })
    
    # Deduplicate by (title, author), keeping the first occurrence
    seen = set()
    deduped = []
    for entry in entries:
        key = (entry["title"].lower(), entry["author"].lower())
        if key in seen:
            continue
        seen.add(key)
        deduped.append(entry)
    
    return deduped


def get_autobiography_titles() -> list[dict]:
    """Fetch the Wikipedia 'List of autobiographies' page and extract all entries.

    Returns a list of dicts with keys: title, author, year, page_url.
    """
    session = requests.Session()
    session.headers.update({"User-Agent": USER_AGENT})

    # The Wikipedia "List of autobiographies" page
    list_page = "List of autobiographies"
    log.info("Fetching Wikipedia list page: %s", list_page)

    wikitext = fetch_wikitext(list_page, session)

    # Parse the wikitext
    entries = parse_autobiography_list_v2(wikitext)
    
    # Add page URL
    page_url = f"https://en.wikipedia.org/wiki/{list_page.replace(' ', '_')}"
    for entry in entries:
        entry["page_url"] = page_url
    
    log.info("Extracted %d entries", len(entries))
    return entries


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    log.info("=== Pipeline 01: Title extraction from Wikipedia ===")
    entries = get_autobiography_titles()

    # Write to CSV
    with open(TITLES_CSV_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["title", "author", "year", "page_url"])
        for entry in entries:
            writer.writerow([entry["title"], entry["author"], entry.get("year"), entry["page_url"]])

    row_count = len(entries)
    # Check for duplicates and empty authors
    has_duplicate = False
    empty_author_count = 0
    seen = set()
    for entry in entries:
        key = (entry["title"].lower(), entry["author"].lower())
        if key in seen:
            has_duplicate = True
        seen.add(key)
        if not entry["author"]:
            empty_author_count += 1

    # Count skip reasons
    skip_reasons = {}
    with open(TITLES_CSV_PATH, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if not row["author"]:
                skip_reasons["empty_author"] = skip_reasons.get("empty_author", 0) + 1

    print(f"Row count: {row_count}")
    print(f"Duplicate (title, author) pairs: {has_duplicate}")
    print(f"Rows with empty author: {empty_author_count}")
    print(f"Skip-reason histogram: {skip_reasons}")

    # Done check
    if row_count < 800:
        print(f"WARNING: Less than 800 rows produced ({row_count}).", file=sys.stderr)
        sys.exit(1)
    if has_duplicate:
        print("WARNING: Duplicate (title, author) pairs found.", file=sys.stderr)
        sys.exit(1)
    if empty_author_count > 0:
        print("WARNING: Rows with empty author found.", file=sys.stderr)
        sys.exit(1)

    log.info("Pipeline 01 complete: %d rows written to %s", row_count, TITLES_CSV_PATH)


if __name__ == "__main__":
    main()