"""v0 matching engine: OCEAN trait-distance similarity between a user profile and biographies.

Phase 6 will replace this with the full weighted similar engines (S1..S5),
Bayesian uncertainty handling and MMR re-ranking. The stored shape
(trait_score / semantic_score / domain_score / final_score / explanation)
is kept so the engine can slot in behind the same API contract.
"""
import math

TRAITS = ("O", "C", "E", "A", "N")
TRAIT_LABEL = {
    "O": "Openness",
    "C": "Conscientiousness",
    "E": "Extraversion",
    "A": "Agreeableness",
    "N": "Neuroticism",
}


def trait_distance(user: dict, bio: dict) -> float:
    """Euclidean distance across the five 0-100 trait scores."""
    return math.sqrt(sum((user[t] - bio[t]) ** 2 for t in TRAITS))


def trait_similarity(user: dict, bio: dict) -> float:
    """Normalized trait similarity in [0, 1].

    D = sqrt(5) * 100 is the maximum possible distance; a 0-100 mapping of
    exp(-D / 125) keeps realistic distances in a useful, non-saturated range.
    """
    d = trait_distance(user, bio)
    return round(math.exp(-d / 125.0), 4)


def rank_biographies(
    user_traits: dict,
    biographies: list,
    top_k: int = 20,
):
    """Return [(bio_row, scores_dict)] sorted by final_score desc.

    scores_dict = {
        trait_score, semantic_score, domain_score, final_score, explanation
    }
    """
    scored = []
    for bio in biographies:
        bio_traits = {t: getattr(bio, f"{t}_score") or 50.0 for t in TRAITS}
        similarity = trait_similarity(user_traits, bio_traits)

        # Domain overlap is v0-unused (no user context stored on assessments yet);
        # semantic matching arrives with Phase 5/6 embeddings.
        domain_score = 0.0
        semantic_score = 0.0
        final = similarity

        gaps = sorted(
            ((t, abs(user_traits[t] - bio_traits[t])) for t in TRAITS),
            key=lambda x: x[1],
        )
        closest_t, closest_gap = gaps[0]
        explanation = (
            f"Closest alignment on {TRAIT_LABEL[closest_t]} "
            f"(you {user_traits[closest_t]:.0f} vs {getattr(bio, f'{closest_t}_score'):.0f}, "
            f"gap {closest_gap:.0f}); overall trait similarity {final:.2f}."
        )

        scored.append(
            (
                bio,
                {
                    "trait_score": similarity,
                    "semantic_score": semantic_score,
                    "domain_score": domain_score,
                    "final_score": final,
                    "explanation": explanation,
                },
            )
        )

    scored.sort(key=lambda pair: pair[1]["final_score"], reverse=True)
    return scored[:top_k]
