"""IPIP-50 questionnaire items (public domain, 10 items per trait).

Each item: (id, text, trait, reverse)
- trait: O=Openness, C=Conscientiousness, E=Extraversion, A=Agreeableness, N=Neuroticism
- reverse: True if the item is reverse-scored (5->1, 4->2, etc.)
"""

IPIP50_ITEMS = [
    # --- Openness (O) ---
    (1, "I think that I am not an adventurous person.", "O", True),
    (2, "I have a rich vocabulary.", "O", False),
    (3, "I am not interested in abstract ideas.", "O", True),
    (4, "I enjoy the thrill of bungee jumping.", "O", False),
    (5, "I avoid taking risks.", "O", True),
    (6, "I am curious about many different things.", "O", False),
    (7, "I am not imaginative.", "O", True),
    (8, "I like to go deep into complex problems.", "O", False),
    (9, "I prefer doing things in a traditional way.", "O", True),
    (10, "I often try new things just to see what they are like.", "O", False),

    # --- Conscientiousness (C) ---
    (11, "I am always prepared.", "C", False),
    (12, "I tend to be disorganized.", "C", True),
    (13, "I make a plan before I start a task.", "C", False),
    (14, "I am a bit of a perfectionist.", "C", False),
    (15, "I find it hard to stick to a routine.", "C", True),
    (16, "I am thorough when I work.", "C", False),
    (17, "I procrastinate on important tasks.", "C", True),
    (18, "I keep my belongings neat and tidy.", "C", False),
    (19, "I am not very disciplined.", "C", True),
    (20, "I work hard to finish tasks on time.", "C", False),

    # --- Extraversion (E) ---
    (21, "I am the life of the party.", "E", False),
    (22, "I don't talk a lot.", "E", True),
    (23, "I feel comfortable around people.", "E", False),
    (24, "I don't enjoy being the center of attention.", "E", True),
    (25, "I talk to a lot of different people at parties.", "E", False),
    (26, "I am quiet around strangers.", "E", True),
    (27, "I am outgoing and sociable.", "E", False),
    (28, "I find it hard to initiate conversations.", "E", True),
    (29, "I am energetic and enthusiastic.", "E", False),
    (30, "I prefer to work alone rather than in a group.", "E", True),

    # --- Agreeableness (A) ---
    (31, "I am interested in other people's feelings.", "A", False),
    (32, "I am not concerned with others' problems.", "A", True),
    (33, "I am kind and gentle.", "A", False),
    (34, "I am not averse to taking risks with others' feelings.", "A", True),
    (35, "I try to please others.", "A", False),
    (36, "I am not afraid to express my opinions.", "A", True),
    (37, "I am cooperative.", "A", False),
    (38, "I can be cold and aloof.", "A", True),
    (39, "I am trusting of others.", "A", False),
    (40, "I am argumentative.", "A", True),

    # --- Neuroticism (N) ---
    (41, "I worry a lot.", "N", False),
    (42, "I am relaxed most of the time.", "N", True),
    (43, "I get stressed out easily.", "N", False),
    (44, "I rarely feel depressed.", "N", True),
    (45, "I have frequent mood swings.", "N", False),
    (46, "I am emotionally stable.", "N", True),
    (47, "I seldom feel sad.", "N", True),
    (48, "I am sensitive to my feelings.", "N", False),
    (49, "I am not easily upset.", "N", True),
    (50, "I feel comfortable with myself.", "N", True),
]

# Items grouped by trait for adaptive questioning
TRAIT_ITEMS = {}
for qid, text, trait, reverse in IPIP50_ITEMS:
    TRAIT_ITEMS.setdefault(trait, []).append(qid)

# Reverse-score: 6 - raw_value
def reverse_score(raw: int) -> int:
    return 6 - raw