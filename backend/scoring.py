"""Scoring functions for IPIP-50 questionnaire."""
from typing import Dict, List, Tuple
import math

from questionnaire import IPIP50_ITEMS, TRAIT_ITEMS

TRAIT_NAMES = ["O", "C", "E", "A", "N"]
TRAIT_FULL = {
    "O": "Openness to Experience",
    "C": "Conscientiousness",
    "E": "Extraversion",
    "A": "Agreeableness",
    "N": "Neuroticism",
}


def reverse_score(raw: int) -> int:
    """Reverse-score a 1-5 Likert item (6 - raw)."""
    return 6 - raw


def score_assessment(answers: Dict[int, int]) -> Dict[str, float]:
    """Score a complete IPIP-50 assessment.

    Args:
        answers: {question_id: raw_response_value (1-5)}

    Returns:
        {trait: score (0-100)}
    """
    trait_sums = {t: [] for t in TRAIT_NAMES}
    for qid, text, trait, reverse in IPIP50_ITEMS:
        if qid not in answers:
            raise ValueError(f"Missing answer for question {qid}")
        raw = answers[qid]
        if raw < 1 or raw > 5:
            raise ValueError(f"Invalid response value {raw} for question {qid}")
        value = reverse_score(raw) if reverse else raw
        trait_sums[trait].append(value)

    scores = {}
    for trait in TRAIT_NAMES:
        values = trait_sums[trait]
        avg = sum(values) / len(values)
        # Normalize to 0-100: (avg - 1) / 4 * 100
        scores[trait] = round((avg - 1) / 4 * 100, 1)
    return scores


def score_partial(answers: Dict[int, int]) -> Tuple[Dict[str, float], Dict[str, float]]:
    """Score a partial assessment (adaptive mode).

    Returns (scores, standard_errors).
    Standard error = stddev / sqrt(n), used for adaptive stopping.
    """
    trait_sums = {t: [] for t in TRAIT_NAMES}
    for qid, text, trait, reverse in IPIP50_ITEMS:
        if qid not in answers:
            continue
        raw = answers[qid]
        value = reverse_score(raw) if reverse else raw
        trait_sums[trait].append(value)

    scores = {}
    ses = {}
    for trait in TRAIT_NAMES:
        values = trait_sums[trait]
        if not values:
            scores[trait] = 50.0
            ses[trait] = 50.0
            continue
        avg = sum(values) / len(values)
        scores[trait] = round((avg - 1) / 4 * 100, 1)
        # stddev of the 1-5 values
        mean = avg
        variance = sum((v - mean) ** 2 for v in values) / len(values)
        stddev = math.sqrt(variance)
        ses[trait] = round(stddev / math.sqrt(len(values)) / 4 * 100, 2)
    return scores, ses


def trait_to_mbti(scores: Dict[str, float]) -> str:
    """Convert OCEAN scores to approximate MBTI axes."""
    # O -> I/S/N (Openness maps to Intuition)
    # C -> J/P (Conscientiousness maps to Judging)
    # E -> E/I (Extraversion)
    # A -> T/F (Agreeableness maps to Feeling) -- approximate
    # N -> not directly mapped; high N relates to emotional volatility

    e_i = "E" if scores["E"] >= 50 else "I"
    s_n = "N" if scores["O"] >= 50 else "S"
    t_f = "F" if scores["A"] >= 50 else "T"
    j_p = "J" if scores["C"] >= 50 else "P"
    return f"{e_i}{s_n}{t_f}{j_p}"


def check_completion(answers: Dict[int, int]) -> Tuple[bool, List[str]]:
    """Check if all 50 questions have been answered."""
    missing = [qid for qid, _, _, _ in IPIP50_ITEMS if qid not in answers]
    return len(missing) == 0, [str(m) for m in missing]


def all_question_ids() -> List[int]:
    return [qid for qid, _, _, _ in IPIP50_ITEMS]