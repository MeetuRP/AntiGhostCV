import json
import re
import hashlib
from typing import Dict, Any, Tuple

def normalize_text(text: str) -> str:
    """Lowercase, remove all non-alphanumeric, collapse whitespace for fuzzy matching."""
    text = text.lower()
    text = re.sub(r'[^a-zA-Z0-9\s]', '', text)
    return " ".join(text.split())

def merge_accepted_edits(data: Dict[str, Any], accepted_edits: Dict[str, Any]) -> Tuple[Dict[str, Any], int]:
    """
    Recursively replace text in structured data with accepted AI improvements.
    Uses MD5 hashes of original text as primary keys, then falls back to normalized matching.
    """
    if not accepted_edits:
        return data, 0

    # Map normalized original text to its improvements for fuzzy fallback
    norm_edits = {}
    for key, val in accepted_edits.items():
        if isinstance(val, dict) and "original" in val:
            norm_edits[normalize_text(val["original"])] = val["improved"]

    stats = {"merged": 0}

    def apply_to_item(item):
        if isinstance(item, str):
            # 1. Exact MD5 hash match (precise)
            h = hashlib.md5(item.encode('utf-8')).hexdigest()
            if h in accepted_edits:
                stats["merged"] += 1
                return accepted_edits[h]["improved"]
            
            # 2. Fuzzy normalized matching
            item_norm = normalize_text(item)
            if item_norm in norm_edits:
                stats["merged"] += 1
                return norm_edits[item_norm]
            
            # 3. Substring matching (for parts of bullets or long paragraphs)
            for orig_norm, improved in norm_edits.items():
                if len(orig_norm) > 15 and (orig_norm in item_norm or item_norm in orig_norm):
                    stats["merged"] += 1
                    return improved
                    
        elif isinstance(item, list):
            return [apply_to_item(i) for i in item]
        elif isinstance(item, dict):
            return {k: apply_to_item(v) for k, v in item.items()}
        return item

    # Deep copy avoid modifying original if needed, though here we return a new one
    # Note: data coming from MongoDB is already a dict, but we'll re-serialize to be safe if complex
    result = apply_to_item(data)
    return result, stats["merged"]

def filter_deleted_blocks(data: Dict[str, Any], deleted_blocks: list) -> Tuple[Dict[str, Any], int]:
    """
    Recursively remove text blocks from structured data if their MD5 hash is in deleted_blocks.
    """
    if not deleted_blocks:
        return data, 0

    stats = {"deleted": 0}
    deleted_set = set(deleted_blocks)

    def process_item(item):
        if isinstance(item, str):
            h = hashlib.md5(item.encode('utf-8')).hexdigest()
            if h in deleted_set:
                stats["deleted"] += 1
                return None
            return item
        elif isinstance(item, list):
            # Filter out None values resulting from deleted strings
            processed = [process_item(i) for i in item]
            return [p for p in processed if p is not None]
        elif isinstance(item, dict):
            return {k: process_item(v) for k, v in item.items() if process_item(v) is not None}
        return item

    result = process_item(data)
    return result, stats["deleted"]
