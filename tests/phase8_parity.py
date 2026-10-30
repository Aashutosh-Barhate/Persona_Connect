"""Phase 8 — engine parity harness.

Verifies that backend/app/services (matching.py, engine.py) expose the same
numerics as the original frontend mock formulas (frontend/src/api/mockApi.ts),
which the system was designed to mirror 1:1.

Run from a repo root (no server needed):
    python tests/phase8_parity.py

Outputs PASS/FAIL lines; exits non-zero on any failure.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.services import matching, taxonomy            # noqa: E402
from backend.app.services.engine import UserContext, _mulberry32, _hash_string  # noqa: E402
from backend.app.services.matching import (_s1, _s2, _s3, _s4, _s5,           # noqa: E402
                                           score_candidates, mmr_rerank)

TRAITS = ("O", "C", "E", "A", "N")
MATCH_WEIGHTS = {"S1": 0.30, "S2": 0.15, "S3": 0.20, "S4": 0.20, "S5": 0.15}

FAILURES = []


def check(name, ok, detail=""):
    print(f"  {'PASS' if ok else 'FAIL'}  {name}{(' — ' + detail) if detail else ''}")
    if not ok:
        FAILURES.append(name)


# ---------------------------------------------------------------------------
# 1. Mock-formula ports (identical to frontend/src/api/mockApi.ts)
# ---------------------------------------------------------------------------

class MockBio:
    """Shape the frontend mock needs; values mirror BiographyProfile."""

    def __init__(self, traits, themes, challenges, domain, summary, peak):
        self.traits = traits
        self.themes = themes
        self.challenges = challenges
        self.domain = domain
        self.summary = summary
        self.domain_tags = []
        self.peak_life_stage = peak


def mock_s1(user: dict, bio: MockBio) -> float:
    acc = 0.0
    for trait in TRAITS:
        du = (user["traits"][trait] - bio.traits[trait]) / 100
        su = max(user["sd"][trait] / 100, 0.04)
        sb = 0.12
        acc += (du * du) / (su * su + sb * sb)
    return math.exp(-math.sqrt(acc) / math.sqrt(5))


def mock_mbti(traits: dict):
    def axis(label, pos, neg, p):
        return (label, pos, neg, max(0.0, min(1.0, p)))

    return [
        axis('Energy', 'E', 'I', traits["E"] / 100),
        axis('Information', 'N', 'S', traits["O"] / 100),
        axis('Decisions', 'F', 'T', traits["A"] / 100),
        axis('Lifestyle', 'J', 'P', traits["C"] / 100),
    ]


def mock_s2(user: dict, bio: MockBio) -> float:
    user_axes = mock_mbti(user["traits"])
    bio_axes = mock_mbti(bio.traits)
    return 1 - sum(abs(u[3] - b[3]) for u, b in zip(user_axes, bio_axes)) / 4


def mock_jaccard(a, b):
    if not a or not b:
        return 0
    sa, sb = set(a), set(b)
    return len(sa & sb) / len(sa | sb)


STOPWORDS = {
    'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'with', 'who', 'that', 'their',
    'they', 'from', 'by', 'as', 'at', 'is', 'was', 'were', 'be', 'been', 'it', 'its', 'into',
    'her', 'his', 'him', 'she', 'he', 'known', 'work', 'works', 'first',
}


def mock_tokenize(text):
    return {
        tok for tok in
        __import__("re").split(r"[^a-z0-9]+", text.lower())
        if len(tok) > 2 and tok not in STOPWORDS
    }


def mock_s5(user: dict, bio: MockBio) -> float:
    theme_text = " ".join(t.replace("-", " ") for t in user["themes"])
    if user["goal"].strip():
        query_text = f"{user['goal']} {theme_text} {user['era']}"
    else:
        query_text = f"{theme_text} {user['era']} {bio.domain}"
    bio_text = f"{bio.summary} {' '.join(bio.themes)} {' '.join(bio.challenges)}"
    query, doc = mock_tokenize(query_text), mock_tokenize(bio_text)
    if not query or not doc:
        return 0
    return len(query & doc) / len(query | doc)


def mock_s3(user: dict, bio: MockBio) -> float:
    return mock_jaccard(user["themes"], bio.themes)


def mock_s4(user: dict, bio: MockBio) -> float:
    return 0.6 * mock_jaccard(user["themes"], bio.challenges) + 0.4 * (
        1 if user["era"] == bio.peak_life_stage else 0
    )


# note: the mock uses '-'-slug themes (e.g. social-impact) — same as ours.

def user_to_tuple(user: UserContext):
    return {"traits": user.traits, "sd": user.sd, "themes": user.themes,
            "goal": user.goal, "era": user.era}


def engine_s(mock_bio: MockBio, user_ctx: UserContext) -> dict:
    bio_traits = mock_bio.traits
    return {
        "s1": _s1(user_ctx, bio_traits),
        "s2": _s2(user_ctx, bio_traits),
        "s3": _s3(user_ctx, mock_bio.themes),
        "s4": _s4(user_ctx, mock_bio),
        "s5": _s5(user_ctx, mock_bio),
    }


# ---------------------------------------------------------------------------
# 2. Deterministic random user generation (engine's PRNG for cross-checks)
# ---------------------------------------------------------------------------

def random_users(n, seed=2026):
    rng = _mulberry32(seed)
    users = []
    themes_pool = [t["id"] for t in taxonomy.THEMES]
    vocab = [
        "build", "research", "justice", "create", "lead", "science", "art", "discipline",
        "community", "invent", "teach", "explore", "write", "campaign", "scale",
    ]
    goals = {
        "build": "I want to build tools that make research open.",
        "lead": "Leading community campaigns for justice and education.",
        "create": "Creating art that explores identity and culture.",
        "invent": "Engineering technology, precision and discipline in my craft.",
        "explore": "Discovery through observation, curiosity and theory.",
    }
    for i in range(n):
        traits = {t: round(rng() * 100) for t in TRAITS}
        sd = {t: round((7 + rng() * 8) * 10) / 10 for t in TRAITS}
        n_themes = 1 + int(rng() * 3)
        themes = []
        for _ in range(n_themes):
            th = themes_pool[int(rng() * len(themes_pool))]
            if th not in themes:
                themes.append(th)
        # 70% of users get a goal line built from vocab
        goal = goals[list(goals)[int(rng() * len(goals))]] if rng() < 0.7 else ""
        era = ["early", "mid", "late"][int(rng() * 3)]
        users.append(UserContext(traits=traits, sd=sd, themes=themes, goal=goal, era=era))
    return users


# ---------------------------------------------------------------------------
# 3. Parity checks
# ---------------------------------------------------------------------------

def build_mock_bios(limit=None):
    from backend.seed import BIographies
    bios = []
    for b in BIographies[:limit]:
        bios.append(
            MockBio(
                traits={t: b[t] for t in TRAITS},
                themes=taxonomy.derive_themes(b["summary"], b.get("domain_tags", [])),
                challenges=taxonomy.derive_challenges(b["summary"], b.get("domain_tags", [])),
                domain=b["domain"],
                summary=b["summary"],
                peak=taxonomy.FAME_OVERRIDES.get(b["name"], (2, "mid"))[1],
            )
        )
    return bios


def run_parity():
    print("=== Phase 8: engine parity vs. mock formulas ===")
    bios = build_mock_bios()
    print(f"bios: {len(bios)}")
    users = random_users(25, seed=20261030)

    max_diff = {k: 0.0 for k in ("s1", "s2", "s3", "s4", "s5")}
    for u in users:
        for bio in bios:
            ctx = UserContext(traits=u.traits, sd=u.sd, themes=list(u.themes),
                              goal=u.goal, era=u.era)
            e = engine_s(bio, ctx)
            m = {
                "s1": mock_s1(user_to_tuple(u), bio),
                "s2": mock_s2(user_to_tuple(u), bio),
                "s3": mock_s3(user_to_tuple(u), bio),
                "s4": mock_s4(user_to_tuple(u), bio),
                "s5": mock_s5(user_to_tuple(u), bio),
            }
            for k in m:
                max_diff[k] = max(max_diff[k], abs(e[k] - m[k]))

    for k, v in max_diff.items():
        # rounding in engine (4dp) tolerances
        check(f"{k} parity (max abs err {v:.2e}) <= 5e-4", v <= 5e-4)

    # total = weighted sum parity
    u = users[0]
    bio = bios[0]
    ctx = UserContext(traits=u.traits, sd=u.sd, themes=list(u.themes), goal=u.goal, era=u.era)
    e = engine_s(bio, ctx)
    total_e = sum(MATCH_WEIGHTS[k.upper()] * e[k] for k in e)
    total_m = (
        MATCH_WEIGHTS["S1"] * mock_s1(user_to_tuple(u), bio)
        + MATCH_WEIGHTS["S2"] * mock_s2(user_to_tuple(u), bio)
        + MATCH_WEIGHTS["S3"] * mock_s3(user_to_tuple(u), bio)
        + MATCH_WEIGHTS["S4"] * mock_s4(user_to_tuple(u), bio)
        + MATCH_WEIGHTS["S5"] * mock_s5(user_to_tuple(u), bio)
    )
    check("weighted total parity", abs(total_e - total_m) <= 5e-4,
          f"diff={abs(total_e - total_m):.2e}")


def run_posterior_parity():
    """Posterior top-5 share sanity with a simple distance scorer."""
    print("\n=== Phase 8: posterior share sanity ===")
    bios = build_mock_bios(limit=20)
    u = random_users(1, seed=7)[0]

    from backend.app.services.engine import top_five_share

    # synthetic scorer: higher = better, so score = negative distance
    def scorer(user_traits):
        return {
            f"b{i}": -sum(abs(user_traits[t] - b.traits[t]) for t in TRAITS)
            for i, b in enumerate(bios)
        }

    static = scorer(u.traits)
    nearest = max(static, key=static.get)
    farthest = min(static, key=static.get)

    share_near = top_five_share(u, nearest, lambda jit: scorer(jit))
    check("nearest bio has high top-5 share (>0.6)", share_near > 0.6,
          f"bio={nearest} share={share_near:.2f}")

    check("share deterministic across repeat calls",
          share_near == top_five_share(u, nearest, lambda jit: scorer(jit)))

    share_far = top_five_share(u, farthest, lambda jit: scorer(jit))
    check("far bio share < nearest share", share_far < share_near,
          f"far={share_far:.2f} near={share_near:.2f}")


def run_matching_invariants():
    print("\n=== Phase 8: selection invariants (MMR, caps, determinism) ===")
    from collections import namedtuple, Counter

    BioNT = namedtuple("BioRow", ["id", "slug", "name", "domain", "summary", "domain_tags",
                                  "O_score", "C_score", "E_score", "A_score", "N_score",
                                  "themes", "challenges", "fame_tier", "peak_life_stage"])

    bios = build_mock_bios()
    from backend.seed import BIographies
    rows = []
    for i, (mb, b) in enumerate(zip(bios, BIographies[:len(bios)])):
        fame, _ = taxonomy.FAME_OVERRIDES.get(b["name"], (2, "mid"))
        rows.append(BioNT(
            id=i, slug=f"slug-{i}", name=b["name"], domain=mb.domain, summary=mb.summary,
            domain_tags=[], O_score=mb.traits["O"], C_score=mb.traits["C"],
            E_score=mb.traits["E"], A_score=mb.traits["A"], N_score=mb.traits["N"],
            themes=mb.themes, challenges=mb.challenges,
            fame_tier=fame, peak_life_stage=mb.peak_life_stage,
        ))

    u = random_users(1, seed=99)[0]
    user = UserContext(traits=u.traits, sd=u.sd, themes=u.themes, goal=u.goal, era=u.era)

    scored = matching.score_candidates(user, rows)
    ranked = matching.mmr_rerank(scored)
    picked = [scored[k]["bio"] for k in ranked]

    domain_counts = Counter(p.domain for p in picked)
    check("MMR respects 2-per-domain cap", max(domain_counts.values()) <= 2,
          f"max={max(domain_counts.values())}")

    fames = [p.fame_tier for p in picked[:5]]
    check("top 5 includes non-top-tier bio", any(f != 3 for f in fames), f"fames={fames}")

    ranked2 = matching.mmr_rerank(matching.score_candidates(user, rows))
    check("MMR deterministic", ranked == ranked2)

    # self-match: a user identical to bio #0 scores that bio at the top
    b0 = rows[0]
    self_user = UserContext(
        traits={t: getattr(b0, f"{t}_score") for t in TRAITS},
        sd={t: 1.0 for t in TRAITS},
        themes=list(b0.themes) if b0.themes else ["discovery"],
        goal="research theory discovery observation precision",
        era=b0.peak_life_stage,
    )
    scored_self = matching.score_candidates(self_user, rows)
    best_key = max(scored_self.keys(), key=lambda k: (
        MATCH_WEIGHTS["S1"] * scored_self[k]["s1"]
        + MATCH_WEIGHTS["S2"] * scored_self[k]["s2"]
        + MATCH_WEIGHTS["S3"] * scored_self[k]["s3"]
        + MATCH_WEIGHTS["S4"] * scored_self[k]["s4"]
        + MATCH_WEIGHTS["S5"] * scored_self[k]["s5"]))
    check("self-twin user ranks its twin bio first",
          scored_self[best_key]["bio"].id == b0.id,
          f"best={scored_self[best_key]['bio'].id} (b0={b0.id})")


if __name__ == "__main__":
    run_parity()
    run_posterior_parity()
    run_matching_invariants()

    print()
    if FAILURES:
        print(f"{len(FAILURES)} FAILURES: {FAILURES}")
        sys.exit(1)
    print("ALL PARITY & INVARIANT CHECKS PASSED")
