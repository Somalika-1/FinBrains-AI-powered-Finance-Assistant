from __future__ import annotations
from typing import List, Tuple, Dict
import re


def normalize_text(s: str) -> str:
    s = s.lower().strip()
    # collapse whitespace and remove most punctuation
    s = re.sub(r"[\s]+", " ", s)
    return s


def tokenize(s: str) -> List[str]:
    return re.findall(r"[a-zA-Z0-9']+", s.lower())


def score_category(description: str, cat_name: str, keywords: List[str]) -> Tuple[int, List[str]]:
    """
    Returns: (hits, matched_keywords)
    - Exact token match or substring match on normalized description.
    - Longer keywords get same weight as shorter, per requirements (simple heuristic).
    """
    desc_norm = normalize_text(description)
    tokens = set(tokenize(desc_norm))

    matched: List[str] = []
    hits = 0
    for kw in keywords or []:
        k = (kw or "").strip().lower()
        if not k:
            continue
        if k in tokens or (" " + k + " ") in (" " + desc_norm + " ") or k in desc_norm:
            hits += 1
            matched.append(kw)
    return hits, matched


def predict_category(description: str, categories: List[Dict[str, List[str]]]) -> Tuple[str | None, float, str]:
    """
    - Never invent categories: only choose among provided names.
    - Confidence is computed per-category instead of global-max normalization.
      We cap the denominator to a small number to avoid penalizing rich keyword sets.
    - If confidence < 0.5, return (None, 0.0, reason)
    """
    if not description or not categories:
        return None, 0.0, "Missing description or categories"

    best_name = None
    best_hits = 0
    best_matched: List[str] = []
    best_den = 1

    for cat in categories:
        name = (cat.get("name") or "").strip()
        kws = list(cat.get("keywords") or [])
        hits, matched = score_category(description, name, kws)
        if hits > best_hits:
            best_hits = hits
            best_name = name or None
            best_matched = matched
            # Use a capped denominator per category to prevent overly low confidence
            best_den = max(1, min(5, len(kws))) if isinstance(kws, list) else 1

    if best_den <= 0:
        return None, 0.0, "No keywords provided"

    confidence = best_hits / best_den if best_den > 0 else 0.0
    # Simple boost: multiple matches indicate strong signal
    if best_hits >= 2:
        confidence = max(confidence, 0.8)
    if confidence < 0.5 or best_hits == 0 or not best_name:
        return None, 0.0, "Low confidence or no matches"

    reason = ""
    return best_name, round(confidence, 2), reason
