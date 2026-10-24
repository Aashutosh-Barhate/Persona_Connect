"""Theme/challenge derivation taxonomy (ported from frontend mockData.ts).

Both the frontend mock and this module derive biography themes and challenges
from the bio's summary + tags using the same keyword maps, so scores stay
comparable between the mock client and the real backend.
"""

# ids of the 10 selectable user themes
THEMES = [
    {"id": "creativity", "label": "Creativity & ideas", "description": "Imagination, original thinking, making things"},
    {"id": "discovery", "label": "Discovery & curiosity", "description": "Research, science, understanding the world"},
    {"id": "leadership", "label": "Leadership", "description": "Leading, organising, moving groups of people"},
    {"id": "adversity", "label": "Overcoming adversity", "description": "Setbacks, struggle, coming back from hard things"},
    {"id": "resilience", "label": "Resilience & grit", "description": "Persistence, endurance, not giving up"},
    {"id": "social-impact", "label": "Social impact", "description": "Helping others, justice, community"},
    {"id": "innovation", "label": "Innovation & building", "description": "Starting, engineering, creating new things"},
    {"id": "expression", "label": "Artistic expression", "description": "Voice, story, art, performance"},
    {"id": "discipline", "label": "Discipline & mastery", "description": "Practice, precision, craft"},
    {"id": "courage", "label": "Courage & conviction", "description": "Standing up, taking a stand, principle"},
]

CHALLENGE_LABELS = {
    "adversity": "War, exile or persecution",
    "resilience": "Recovery after setbacks",
    "discipline": "Years of relentless practice",
    "discrimination": "Discrimination and exclusion",
    "skepticism": "Doubt and ridicule from others",
    "loss": "Personal loss or grief",
    "courage": "Risking safety for a belief",
    "scarcity": "Starting with very little",
    "health": "Illness, injury or disability",
    "failure": "Public failure before success",
}

THEME_KEYWORDS = {
    "creativity": ["creativity", "imagination", "abstract", "ideas", "curiosity", "polymath", "vision", "wonder"],
    "discovery": [
        "research", "theory", "discovery", "observation", "breakthrough", "cosmos", "gravity", "code",
        "logic", "algorithms", "semiconductor", "prediction", "space", "calculation", "precision",
        "physicist", "mathematician", "scientist", "chemist", "astrophysicist",
    ],
    "leadership": [
        "leadership", "leader", "strategy", "management", "teamwork", "competition", "oratory",
        "eloquence", "union", "unity", "stability", "chancellor", "president", "prime minister",
        "ceo", "captain", "revolutionary", "revolution",
    ],
    "adversity": ["adversity", "struggle", "struggled", "hardship", "barrier", "transformation", "resistance", "dignity", "pain", "attack"],
    "resilience": [
        "perseverance", "persistence", "resilience", "grit", "determination", "endurance",
        "relentless", "recovery", "excellence", "fought", "defeating",
    ],
    "social-impact": [
        "justice", "empathy", "compassion", "community", "education", "advocacy", "humanitarian",
        "rights", "reconciliation", "environment", "empowerment", "nonviolence", "social",
        "welfare", "girls", "women", "conservation", "activist", "activism", "civil rights",
        "farmworkers", "microfinance", "poor", "equality",
    ],
    "innovation": [
        "innovation", "invention", "inventor", "entrepreneurship", "founded", "built", "engineer",
        "engineering", "technology", "product", "brand", "ai", "transformation", "media",
        "compiler", "programming", "design", "startup", "deepmind", "apple", "spanx", "starbucks",
        "adobe", "intel",
    ],
    "expression": [
        "expression", "narrative", "voice", "poetry", "lyric", "identity", "painter", "artist",
        "music", "art", "perform", "dance", "novel", "novelist", "writer", "author", "culture",
        "glam", "pop", "color", "passion", "communicator", "communication", "accessible",
        "playwright", "poet", "memoir", "story",
    ],
    "discipline": [
        "discipline", "perfection", "patience", "focus", "practice", "routine", "thorough",
        "value", "speed", "skill", "methodical", "work ethic", "pragmatism", "precision",
        "craft", "mastery", "meticulous", "relentlessly",
    ],
    "courage": [
        "courage", "conviction", "principle", "truth", "nonviolence", "dissident", "freedom",
        "spoke", "risked", "protest", "challenge", "authority", "refusal", "defied", "boycott",
        "stood", "sparked", "strike",
    ],
}

CHALLENGE_KEYWORDS = {
    "adversity": ["war", "apartheid", "attack", "shot", "exile", "prison", "boycott", "conflict", "killed", "oppressed", "persecution"],
    "resilience": ["persevered", "persistence", "despite", "overcame", "recovered", "relentless", "endured", "resilience", "obstacles", "setbacks"],
    "discipline": ["practiced", "trained", "rigorous", "meticulous", "obsessive", "daily", "thorough", "perfectionist"],
    "discrimination": ["discrimination", "segregation", "oppression", "inequality", "marginalized", "racism", "sexism", "barriers", "denied", "excluded", "first woman", "first african american", "first black"],
    "skepticism": ["skeptics", "orthodoxy", "conventional wisdom", "doubted", "ridiculed", "criticized", "controversial", "unproven", "ignored"],
    "loss": ["lost", "death", "grief", "widowed", "tragedy", "mourning", "died"],
    "courage": ["spoke out", "protest", "dissident", "risked", "arrested", "threatened", "jailed", "defied", "refused", "refusal"],
    "scarcity": ["no funding", "bootstrapped", "savings", "broke", "poor", "self-made", "immigrant", "refugee", "$5,000"],
    "health": ["illness", "diagnosed", "injury", "disability", "pain", "hospital", "autism", "condition"],
    "failure": ["failed", "failure", "rejected", "bankrupt", "collapsed", "setback"],
}

CHALLENGE_TAG_MAP = {
    "perseverance": "resilience",
    "persistence": "resilience",
    "resilience": "resilience",
    "grit": "resilience",
    "determination": "resilience",
    "endurance": "resilience",
    "courage": "courage",
    "principle": "courage",
    "truth": "courage",
    "nonviolence": "courage",
    "justice": "courage",
    "barrier": "adversity",
    "transformation": "adversity",
    "resistance": "adversity",
    "dignity": "adversity",
    "defector": "adversity",
    "precision": "discipline",
    "perfection": "discipline",
    "patience": "discipline",
    "focus": "discipline",
    "discipline": "discipline",
    "excellence": "discipline",
    "speed": "discipline",
}


def match_keywords(text: str, tags: list, keyword_map: dict) -> list:
    haystack = f"{text} {' '.join(tags or [])}".lower()
    return [theme for theme, kws in keyword_map.items() if any(kw in haystack for kw in kws)]


def derive_themes(summary: str, tags: list) -> list:
    return match_keywords(summary, tags, THEME_KEYWORDS)


def derive_challenges(summary: str, tags: list) -> list:
    from_kw = match_keywords(summary, tags, CHALLENGE_KEYWORDS)
    from_tags = [CHALLENGE_TAG_MAP.get(t) for t in (tags or [])]
    out, seen = [], set()
    for c in list(from_kw) + from_tags:
        if c and c not in seen:
            seen.add(c)
            out.append(c)
    return out


def era_from_life_stage(life_stage: str) -> str:
    if life_stage in ("18-24", "25-34"):
        return "early"
    if life_stage == "55+":
        return "late"
    return "mid"


# fame tier + peak life stage for bios that also exist in the curated frontend
# dataset. Backend-only extras default to tier 2 / 'mid'.
FAME_OVERRIDES = {
    "Marie Curie": (3, "mid"), "Albert Einstein": (3, "mid"), "Neil deGrasse Tyson": (3, "mid"),
    "Rosalind Franklin": (2, "mid"), "Katherine Johnson": (2, "mid"), "Stephen Hawking": (3, "mid"),
    "Ada Lovelace": (2, "early"), "Grace Hopper": (2, "mid"), "Jane Goodall": (3, "mid"),
    "Nikola Tesla": (3, "mid"), "Pierre Curie": (2, "mid"), "Alan Turing": (3, "mid"),
    "Kip Thorne": (1, "mid"), "Temple Grandin": (2, "mid"), "Sally Ride": (2, "mid"),
    "Demis Hassabis": (2, "mid"), "Abraham Lincoln": (3, "mid"), "Nelson Mandela": (3, "late"),
    "Winston Churchill": (3, "mid"), "Angela Merkel": (3, "mid"), "Jacinda Ardern": (3, "mid"),
    "Malala Yousafzai": (3, "early"), "Barack Obama": (3, "mid"), "Golda Meir": (2, "mid"),
    "Frida Kahlo": (3, "mid"), "Leonardo da Vinci": (3, "mid"), "Toni Morrison": (3, "mid"),
    "Vincent van Gogh": (3, "mid"), "Maya Angelou": (3, "mid"), "Ludwig van Beethoven": (3, "mid"),
    "Andy Warhol": (3, "mid"), "David Bowie": (3, "mid"), "Rita Dove": (1, "mid"),
    "Elon Musk": (3, "mid"), "Sara Blakely": (2, "mid"), "Warren Buffett": (3, "late"),
    "Sheryl Sandberg": (2, "mid"), "Steve Jobs": (3, "early"), "Muhammad Yunus": (2, "mid"),
    "Indra Nooyi": (2, "mid"), "Howard Schultz": (2, "mid"), "Gordon Moore": (1, "mid"),
    "Shantanu Narayen": (1, "mid"), "Arianna Huffington": (1, "mid"),
    "Serena Williams": (3, "mid"), "Michael Jordan": (3, "mid"), "Simone Biles": (3, "early"),
    "Kobe Bryant": (3, "mid"), "Mia Hamm": (2, "mid"), "Usain Bolt": (3, "early"),
    "Misty Copeland": (2, "early"), "Muhammad Ali": (3, "mid"), "Bjorn Borg": (1, "mid"),
    "Marta Vieira da Silva": (2, "early"), "Gabrielle Reece": (1, "mid"),
    "Malcolm X": (3, "mid"), "Greta Thunberg": (3, "early"), "Rosa Parks": (3, "mid"),
    "Desmond Tutu": (2, "mid"), "Vaclav Havel": (2, "mid"), "Rachel Carson": (2, "mid"),
    "Cesar Chavez": (2, "mid"), "Wangari Maathai": (2, "mid"), "Ai Weiwei": (2, "mid"),
}

LIFE_STAGE_AXIS = {"early", "mid", "late"}


def wikipedia_url(name: str) -> str:
    return f"https://en.wikipedia.org/wiki/{name.replace(' ', '_')}"
