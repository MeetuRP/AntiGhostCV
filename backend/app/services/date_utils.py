import re
from datetime import datetime
from typing import List

_MONTH_MAP = {
    "jan": 1, "january": 1,
    "feb": 2, "february": 2,
    "mar": 3, "march": 3,
    "apr": 4, "april": 4,
    "may": 5,
    "jun": 6, "june": 6,
    "jul": 7, "july": 7,
    "aug": 8, "august": 8,
    "sep": 9, "sept": 9, "september": 9,
    "oct": 10, "october": 10,
    "nov": 11, "november": 11,
    "dec": 12, "december": 12,
}

_DATE_RANGE_RE = re.compile(
    r"""
    (?P<start_month>[A-Za-z]+)\.?\s*(?P<start_year>\d{4})
    \s*[\u2013\u2014\-–—]+\s*
    (?:(?P<end_month>[A-Za-z]+)\.?\s*(?P<end_year>\d{4})|(?P<present>Present|Current|Now))
    """,
    re.IGNORECASE | re.VERBOSE,
)

_YEAR_RANGE_RE = re.compile(
    r"""
    (?P<start>\d{4})
    \s*[\u2013\u2014\-–—]+\s*
    (?:(?P<end>\d{4})|(?P<present>Present|Current|Now))
    """,
    re.IGNORECASE | re.VERBOSE,
)

def _parse_experience_years(experience_entries: List[str]) -> float:
    """Sum up durations from experience entries, returning total years."""
    total_months = 0
    now = datetime.utcnow()

    for entry in experience_entries:
        # Try month+year ranges first ("Jan 2020 – Mar 2023")
        for m in _DATE_RANGE_RE.finditer(entry):
            start_m = _MONTH_MAP.get(m.group("start_month").lower()[:3], 1)
            start_y = int(m.group("start_year"))
            if m.group("present"):
                end_m, end_y = now.month, now.year
            else:
                end_m = _MONTH_MAP.get(m.group("end_month").lower()[:3], 1)
                end_y = int(m.group("end_year"))
            months = (end_y - start_y) * 12 + (end_m - start_m)
            if 0 < months < 600:  # sanity
                total_months += months

        # Fallback: bare year ranges ("2020 – 2023")
        if not _DATE_RANGE_RE.search(entry):
            for m in _YEAR_RANGE_RE.finditer(entry):
                start = int(m.group("start"))
                if m.group("present"):
                    end = now.year
                else:
                    end = int(m.group("end"))
                years = end - start
                if 0 < years < 50:
                    total_months += years * 12

    return round(total_months / 12, 1)
