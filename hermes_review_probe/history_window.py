"""Hermes review-pipeline probe. Not production code — delete with the test PR."""

MAX_PAGES = 5
PAGE_SIZE = 100


def collect_history(fetch_page):
    """Fetch rows newest-first, stopping at a short page or the page cap."""
    rows = []
    for page in range(1, MAX_PAGES + 1):
        batch = fetch_page(page, PAGE_SIZE)
        rows.extend(batch)
        if len(batch) < PAGE_SIZE:
            break
    return rows


def edit_days(rows):
    """Return edit days, treating the oldest row as the registration snapshot."""
    days = sorted({r["modified_at"][:10] for r in rows})
    return days[1:]


def summarize(rows):
    days = edit_days(rows)
    return {"edit_count": len(days), "first_edit": days[0]}
