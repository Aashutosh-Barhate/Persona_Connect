"""Phase 5: Bayesian engine — posterior over the user's true trait scores.

The quiz yields OCEAN point estimates plus per-trait uncertainty (standard
departures on the 0-100 scale). Rather than treating the user as a point, we
sample the posterior, score every biography under each draw, and report the
share of draws in which a biography lands in the user's top five.

Draws are deterministic: seeded from (session key, biography id) so repeated
queries for the same assessment return the same confidence values.
"""
import math
from dataclasses import dataclass

TRAITS = ("O", "C", "E", "A", "N")

SD_TARGET = 7.0    # floor once answers exist (used for completed quizzes / estimated bios)
SD_MAX = 15.0      # prior standard deviation before any answer for a trait
N_MIN = 15         # adaptive stopping: minimum answered iff every trait has >=3
N_MAX = 30         # adaptive stopping: hard cap


@dataclass
class UserContext:
    traits: dict           # {trait: 0-100}
    sd: dict               # {trait: standard deviation on 0-100 scale}
    themes: list
    goal: str
    era: str               # early | mid | late


def sd_from_standard_errors(standard_errors: dict, answered: int, trait_counts: dict = None) -> dict:
    """Map stored profile standard errors onto the engine's sd scale.

    Completed assessments store se = 0; we substitute the SD_TARGET floor so the
    posterior width reflects the estimated-bio uncertainty (~0.12 on 0-1 scale)
    rather than collapsing everything into a point estimate.
    """
    sd = {}
    for t in TRAITS:
        se = float(standard_errors.get(t) or 0.0)
        if se > 0:
            sd[t] = se
        elif trait_counts and trait_counts.get(t, 0) > 0:
            sd[t] = SD_TARGET
        else:
            sd[t] = SD_MAX
    return sd


def quiz_done(answered_total: int, trait_counts: dict) -> bool:
    if answered_total >= N_MAX:
        return True
    if answered_total >= N_MIN and all(trait_counts.get(t, 0) >= 3 for t in TRAITS):
        return True
    return False


# ---------------------------------------------------------------------------
# Deterministic gaussian sampling (mulberry32 PRNG + Box-Muller)
# ---------------------------------------------------------------------------

def _mulberry32(seed: int):
    a = seed & 0xFFFFFFFF
    def next_rand():
        nonlocal a
        a = (a + 0x6D2B79F5) & 0xFFFFFFFF
        t = a
        t = (t ^ (t >> 15)) * (t | 1) & 0xFFFFFFFF
        t = (t ^ (t + ((t ^ (t >> 7)) * (t | 61) & 0xFFFFFFFF))) & 0xFFFFFFFF
        return t / 4294967296.0
    return next_rand


def _hash_string(text: str) -> int:
    h = 2166136261
    for ch in text:
        h ^= ord(ch)
        h = (h * 16777619) & 0xFFFFFFFF
    return h


def _gauss(rng):
    u = max(rng(), 1e-9)
    v = rng()
    return math.sqrt(-2.0 * math.log(u)) * math.cos(2.0 * math.pi * v)


# ---------------------------------------------------------------------------
# Posterior confidence
# ---------------------------------------------------------------------------

POSTERIOR_DRAWS = 30


def top_five_share(user: UserContext, bio_key: str, rescore) -> float:
    """Share of posterior draws in which the bio lands in the user's top five.

    rescore(jittered_traits) -> {bio_key: total} scores under that draw.
    """
    rng = _mulberry32(_hash_string(f"{user.goal}:{bio_key}:{user.era}"))
    hits = 0
    for _ in range(POSTERIOR_DRAWS):
        jittered = {}
        for t in TRAITS:
            width = max(user.sd[t], 2.0)
            jittered[t] = min(100.0, max(0.0, user.traits[t] + _gauss(rng) * width))
        totals = rescore(jittered)
        top5 = set(t[0] for t in sorted(totals.items(), key=lambda kv: -kv[1])[:5])
        if bio_key in top5:
            hits += 1
    return hits / POSTERIOR_DRAWS


def overall_confidence(sd: dict) -> int:
    """0-100 quiz confidence from posterior width (mirrors the mock's formula)."""
    avg = sum(sd[t] for t in TRAITS) / len(TRAITS)
    if avg >= SD_MAX:
        return 0
    value = 1 - (avg - SD_TARGET) / (SD_MAX - SD_TARGET)
    return int(round(max(0.0, min(1.0, value)) * 100))
