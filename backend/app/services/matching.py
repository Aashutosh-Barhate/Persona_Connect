"""Phase 6: weighted matching engine.

Port of the frontend mock's five similarity engines, keeping the same weights
and formulas so mock and real outputs agree:

  S1 (0.30)  OCEAN distance adjusted for user + bio uncertainty (Mahalanobis-ish)
  S2 (0.15)  MBTI axis agreement (axis probabilities, not type labels)
  S3 (0.20)  shared themes (Jaccard between user themes and bio themes)
  S4 (0.20)  context fit (challenges overlap + life-stage/era match)
  S5 (0.15)  text similarity (token Jaccard: user goal/era vs bio story text)

Selection: maximal marginal relevance (lambda 0.7) over trait-vector cosine
similarity, with a 2-per-domain cap and a fame-diversity constraint: at least
one pick outside the top fame tier must appear in the top 5.

This module supersedes the Phase 4 euclid_v0 scorer.
"""
import math

from backend.app.services import taxonomy
from backend.app.services.engine import UserContext, TRAITS

MATCH_WEIGHTS = {"S1": 0.30, "S2": 0.15, "S3": 0.20, "S4": 0.20, "S5": 0.15}
MMR_LAMBDA = 0.7
MAX_PER_DOMAIN = 2
SHORTLIST = 20

TRAIT_LABEL = {
    "O": "Openness",
    "C": "Conscientiousness",
    "E": "Extraversion",
    "A": "Agreeableness",
    "N": "Neuroticism",
}

STOPWORDS = {
    "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "with", "who", "that", "their",
    "they", "from", "by", "as", "at", "is", "was", "were", "be", "been", "it", "its", "into",
    "her", "his", "him", "she", "he", "known", "work", "works", "first",
}


def _clamp(value, lo, hi):
    return max(lo, min(hi, value))


def _clamp01(value):
    return _clamp(value, 0.0, 1.0)


def _bio_traits(bio) -> dict:
    return {t: getattr(bio, f"{t}_score") or 50.0 for t in TRAITS}


def _bio_themes(bio) -> list:
    """Engine-facing bio metadata. Falls back to live derivation if the seed
    hasn't been enriched yet (post-migration rows may be null)."""
    themes = bio.themes or []
    return themes or taxonomy.derive_themes(bio.summary or "", bio.domain_tags or [])


def _bio_challenges(bio) -> list:
    return bio.challenges or taxonomy.derive_challenges(
        bio.summary or "", bio.domain_tags or []
    )


def _s1(user: UserContext, bio_traits: dict) -> float:
    acc = 0.0
    for t in TRAITS:
        du = (user.traits[t] - bio_traits[t]) / 100.0
        su = max(user.sd[t] / 100.0, 0.04)
        sb = 0.12
        acc += (du * du) / (su * su + sb * sb)
    return math.exp(-math.sqrt(acc) / math.sqrt(5))


def _mbti_axes(traits: dict) -> list:
    """Four axis probabilities mirroring the mock's deriveMbti."""
    return [
        ("Energy", "E", "I", _clamp01(traits["E"] / 100.0)),
        ("Information", "N", "S", _clamp01(traits["O"] / 100.0)),
        ("Decisions", "F", "T", _clamp01(traits["A"] / 100.0)),
        ("Lifestyle", "J", "P", _clamp01(traits["C"] / 100.0)),
    ]


def _s2(user: UserContext, bio_traits: dict) -> float:
    user_axes = _mbti_axes(user.traits)
    bio_axes = _mbti_axes(bio_traits)
    return 1 - sum(abs(u[3] - b[3]) for u, b in zip(user_axes, bio_axes)) / 4


def _jaccard(a: list, b: list) -> float:
    if not a or not b:
        return 0.0
    sa, sb = set(a), set(b)
    return len(sa & sb) / len(sa | sb)


def _tokenize(text: str) -> set:
    tokens = set()
    for token in text.lower().split():
        cleaned = "".join(ch for ch in token if ch.isalnum())
        if len(cleaned) > 2 and cleaned not in STOPWORDS:
            tokens.add(cleaned)
    return tokens


def _s5(user: UserContext, bio) -> float:
    theme_text = " ".join(th.replace("_", " ") for th in (user.themes or []))
    if (user.goal or "").strip():
        query_text = f"{user.goal} {theme_text} {user.era}"
    else:
        query_text = f"{theme_text} {user.era} {bio.domain}"
    bio_text = " ".join([
        bio.summary or "",
        " ".join(_bio_themes(bio)),
        " ".join(_bio_challenges(bio)),
    ])
    query, doc = _tokenize(query_text), _tokenize(bio_text)
    if not query or not doc:
        return 0.0
    return len(query & doc) / len(query | doc)


def _s3(user: UserContext, themes: list) -> float:
    return _jaccard(user.themes or [], themes)


def _s4(user: UserContext, bio) -> float:
    challenge_overlap = _jaccard(user.themes or [], _bio_challenges(bio))
    peak = bio.peak_life_stage or "mid"
    era_match = 1.0 if user.era == peak else 0.0
    return 0.6 * challenge_overlap + 0.4 * era_match


def _weighted(c, bio):
    return (
        MATCH_WEIGHTS["S1"] * c["s1"]
        + MATCH_WEIGHTS["S2"] * c["s2"]
        + MATCH_WEIGHTS["S3"] * c["s3"]
        + MATCH_WEIGHTS["S4"] * c["s4"]
        + MATCH_WEIGHTS["S5"] * c["s5"]
    )


def _cosine(a: dict, b: dict) -> float:
    dot = sum(a[t] * b[t] for t in TRAITS)
    na = math.sqrt(sum(a[t] ** 2 for t in TRAITS))
    nb = math.sqrt(sum(b[t] ** 2 for t in TRAITS))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)


def mmr_rerank(scored: dict) -> list:
    """MMR over trait cosine diversity; enforces per-domain cap + fame diversity."""
    order = sorted(scored.keys(), key=lambda k: -_weighted(scored[k], scored[k]["bio"]))
    picked, remaining = [], set(order)
    domain_count = {}

    while len(picked) < SHORTLIST and remaining:
        best_key, best_value = None, -math.inf
        for key in remaining:
            c = scored[key]
            if domain_count.get(c["bio"].domain, 0) >= MAX_PER_DOMAIN:
                continue
            max_sim = max(
                (_cosine(scored[p]["traits"], c["traits"]) for p in picked),
                default=0.0,
            )
            value = MMR_LAMBDA * _weighted(c, c["bio"]) - (1 - MMR_LAMBDA) * max_sim
            if value > best_value:
                best_key, best_value = key, value
        if best_key is None:
            break
        picked.append(best_key)
        remaining.discard(best_key)
        domain_count[scored[best_key]["bio"].domain] = (
            domain_count.get(scored[best_key]["bio"].domain, 0) + 1
        )

    # fame-diversity hard constraint: a non-top-tier bio in the top 5
    top5 = picked[:5]
    if len(top5) == 5 and not any(
        (scored[k]["bio"].fame_tier or 2) < 3 for k in top5
    ):
        for idx, key in enumerate(picked[5:], start=5):
            if (scored[key]["bio"].fame_tier or 2) < 3:
                picked.pop(idx)
                picked.insert(4, key)
                break

    return picked


def _breakdown(c) -> list:
    return [
        {"key": "S1", "label": "Personality closeness (OCEAN)", "weight": MATCH_WEIGHTS["S1"],
         "raw": c["s1"], "weighted": MATCH_WEIGHTS["S1"] * c["s1"],
         "detail": "Distance adjusted for your quiz uncertainty and their estimate uncertainty"},
        {"key": "S2", "label": "Preference tendencies", "weight": MATCH_WEIGHTS["S2"],
         "raw": c["s2"], "weighted": MATCH_WEIGHTS["S2"] * c["s2"],
         "detail": "Agreement across the four MBTI axes (probabilities, not a type label)"},
        {"key": "S3", "label": "Shared domains", "weight": MATCH_WEIGHTS["S3"],
         "raw": c["s3"], "weighted": MATCH_WEIGHTS["S3"] * c["s3"],
         "detail": "Overlap between the themes you chose and their life domains"},
        {"key": "S4", "label": "Context fit", "weight": MATCH_WEIGHTS["S4"],
         "raw": c["s4"], "weighted": MATCH_WEIGHTS["S4"] * c["s4"],
         "detail": "Challenges they faced that match your themes, plus life-stage overlap"},
        {"key": "S5", "label": "Text similarity", "weight": MATCH_WEIGHTS["S5"],
         "raw": c["s5"], "weighted": MATCH_WEIGHTS["S5"] * c["s5"],
         "detail": "Your goal text against the themes of their story"},
    ]


def _explanation(user: UserContext, bio, bio_traits: dict, breakdown: list) -> dict:
    shared_traits = []
    for t in TRAITS:
        if user.traits[t] >= 60 and bio_traits[t] >= 60:
            note = "You both run high here"
        elif user.traits[t] <= 40 and bio_traits[t] <= 40:
            note = "You both run low here"
        else:
            continue
        shared_traits.append({
                "trait": t, "label": TRAIT_LABEL[t],
                "userValue": round(user.traits[t]),
                "bioValue": round(bio_traits[t]),
                "gap": round(abs(user.traits[t] - bio_traits[t])),
                "note": note,
            })
    shared_traits.sort(key=lambda f: f["gap"])
    shared_traits = shared_traits[:3]

    shared_domains = [th for th in (user.themes or []) if th in _bio_themes(bio)]
    shared_challenges = [th for th in (user.themes or []) if th in _bio_challenges(bio)]

    difference, biggest_gap = None, -1
    for t in TRAITS:
        gap = abs(user.traits[t] - bio_traits[t])
        if gap > biggest_gap:
            biggest_gap = gap
            difference = {
                "trait": t, "label": TRAIT_LABEL[t],
                "userValue": round(user.traits[t]),
                "bioValue": round(bio_traits[t]),
                "gap": round(gap),
            }

    top_breakdown = sorted(breakdown, key=lambda b: -b["weighted"])[0]
    o, c = bio.O_score or 50, bio.C_score or 50
    qual = lambda v: "high" if v >= 70 else "low" if v <= 40 else "moderately"
    domains_text = (
        f"shared themes: {', '.join(shared_domains)}" if shared_domains else "similar personality shape"
    )
    text = (
        f"You matched with {bio.name} mainly on {top_breakdown['label'].lower()} "
        f"({top_breakdown['key']} = {top_breakdown['raw']:.2f}) and {domains_text}. "
        f"{bio.name} is estimated to run {qual(o)} on openness "
        f"and {qual(c)} on conscientiousness from public text."
    )
    return {
        "shared_traits": shared_traits,
        "shared_domains": shared_domains,
        "shared_challenges": shared_challenges,
        "difference": difference,
        "text": text,
    }


def score_candidates(user: UserContext, biographies: list) -> dict:
    """scored = {bio_key: {bio, traits, s1..s5,}} for every bio in the pool."""
    scored = {}
    for bio in biographies:
        key = bio.slug or f"bio:{bio.id}"
        traits = _bio_traits(bio)
        themes = _bio_themes(bio)
        scored[key] = {
            "bio": bio,
            "key": key,
            "traits": traits,
            "themes": themes,
            "s1": round(_s1(user, traits), 4),
            "s2": round(_s2(user, traits), 4),
            "s3": round(_s3(user, themes), 4),
            "s4": round(_s4(user, bio), 4),
            "s5": round(_s5(user, bio), 4),
        }
    return scored


def confidence_label(confidence: float) -> str:
    return "High" if confidence >= 0.6 else "Medium" if confidence >= 0.3 else "Low"


def _weighted_total(user: UserContext, c: dict) -> float:
    """Weighted total, S1/S2 recomputed against the supplied user context."""
    return (
        MATCH_WEIGHTS["S1"] * _s1(user, c["traits"])
        + MATCH_WEIGHTS["S2"] * _s2(user, c["traits"])
        + MATCH_WEIGHTS["S3"] * c["s3"]
        + MATCH_WEIGHTS["S4"] * c["s4"]
        + MATCH_WEIGHTS["S5"] * c["s5"]
    )


def matches_block(user: UserContext, biographies: list) -> list:
    """Build the full ranked match list (payload dicts ready for the response)."""
    from backend.app.services import engine as bayes

    scored = score_candidates(user, biographies)

    def rescore(jittered_traits: dict) -> dict:
        ju = UserContext(traits=jittered_traits, sd=user.sd, themes=[], goal="", era=user.era)
        return {key: _weighted_total(ju, c) for key, c in scored.items()}

    ranked_keys = mmr_rerank(scored)

    matches = []
    for rank, key in enumerate(ranked_keys, start=1):
        c = scored[key]
        total = _weighted_total(user, c)
        share = bayes.top_five_share(user, c["key"], rescore)
        breakdown = _breakdown(c)
        matches.append({
            "rank": rank,
            "biography": c["bio"],
            "score": round(total, 3),
            "confidence": round(share, 2),
            "confidence_label": confidence_label(share),
            "breakdown": breakdown,
            "explanation": _explanation(user, c["bio"], c["traits"], breakdown),
        })
    return matches
