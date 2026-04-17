import json
import re
import hashlib
from typing import Dict, Any, Tuple

def get_safe_hash(text: str) -> str:
    """Normalize line endings and whitespace before hashing to ensure cross-platform consistency."""
    if not text: return ""
    # Normalize line endings to \n
    text = text.replace('\r\n', '\n').replace('\r', '\n')
    # Strip trailing whitespace from each line
    lines = [line.rstrip() for line in text.split('\n')]
    text = '\n'.join(lines).strip()
    return hashlib.md5(text.encode('utf-8')).hexdigest()

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

    def deduplicate_content(text: str, label_to_strip: str = None) -> str:
        """Deeply cleans text by removing redundant labels and repeated phrases."""
        if not text: return text
        
        # 1. Strip the redundant label if the AI prepended it (e.g., "Skills: Skills: Java" -> "Java")
        if label_to_strip:
            clean_label = label_to_strip.strip().rstrip(':').lower()
            t_lower = text.lower()
            if t_lower.startswith(clean_label):
                # Find where the colon or label ends and strip it
                first_colon = text.find(':')
                if first_colon != -1 and first_colon < len(label_to_strip) + 10:
                    text = text[first_colon + 1:].strip()

        # 2. Deduplicate comma-separated lists (common for skills)
        if ',' in text:
            parts = [p.strip() for p in text.split(',')]
            seen = []
            for p in parts:
                if p and p.lower() not in [s.lower() for s in seen]:
                    seen.append(p)
            text = ", ".join(seen)
            
        # 3. Simple sentence-level deduplication (for paragraphs)
        sentences = [s.strip() for s in text.split('.') if s.strip()]
        unique_sentences = []
        for s in sentences:
            if s.lower() not in [us.lower() for us in unique_sentences]:
                unique_sentences.append(s)
        if len(unique_sentences) < len(sentences):
            text = ". ".join(unique_sentences) + "."
            
        return text

    def apply_to_item(item, context_key=None):
        if isinstance(item, str):
            current_text = item
            # ... existing MD5 chain logic ...
            edits_applied = 0
            while edits_applied < 3: 
                h = get_safe_hash(current_text)
                if h in accepted_edits:
                    current_text = accepted_edits[h]["improved"]
                    stats["merged"] += 1
                    edits_applied += 1
                    continue
                break

            # 2. Fuzzy fallback
            item_norm = normalize_text(current_text)
            if item_norm in norm_edits:
                current_text = norm_edits[item_norm]
                stats["merged"] += 1
            
            # Clean it based on context (e.g. if we are in a skill category)
            return deduplicate_content(current_text, label_to_strip=context_key)

        elif isinstance(item, list):
            joined_list = ", ".join(str(i) for i in item)
            h = get_safe_hash(joined_list)
            if h in accepted_edits:
                stats["merged"] += 1
                new_val = accepted_edits[h]["improved"]
                # Return the improvement as a single-item list if it was a list
                return [deduplicate_content(new_val, label_to_strip=context_key)]
                 
            return [apply_to_item(i, context_key=context_key) for i in item]
        elif isinstance(item, dict):
            # Pass the key as context (e.g. "Frameworks & Libraries")
            return {k: apply_to_item(v, context_key=k) for k, v in item.items()}
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
            h = get_safe_hash(item)
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
