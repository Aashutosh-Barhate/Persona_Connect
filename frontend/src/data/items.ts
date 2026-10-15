import type { QuizItem, TraitKey } from '../types'

/**
 * IPIP-50 Big Five items (public domain), ported from backend/questionnaire.py.
 * Each item: (id, text, trait, reverse)
 * - trait: O=Openness, C=Conscientiousness, E=Extraversion, A=Agreeableness, N=Neuroticism
 * - reverse: true when the item is reverse-scored (answer 5 -> 1, 4 -> 2, ...)
 */
export const IPIP_ITEMS: QuizItem[] = [
  // --- Openness (O) ---
  { id: 1, text: 'I think that I am not an adventurous person.', trait: 'O', reverse: true },
  { id: 2, text: 'I have a rich vocabulary.', trait: 'O', reverse: false },
  { id: 3, text: 'I am not interested in abstract ideas.', trait: 'O', reverse: true },
  { id: 4, text: 'I enjoy the thrill of bungee jumping.', trait: 'O', reverse: false },
  { id: 5, text: 'I avoid taking risks.', trait: 'O', reverse: true },
  { id: 6, text: 'I am curious about many different things.', trait: 'O', reverse: false },
  { id: 7, text: 'I am not imaginative.', trait: 'O', reverse: true },
  { id: 8, text: 'I like to go deep into complex problems.', trait: 'O', reverse: false },
  { id: 9, text: 'I prefer doing things in a traditional way.', trait: 'O', reverse: true },
  { id: 10, text: 'I often try new things just to see what they are like.', trait: 'O', reverse: false },

  // --- Conscientiousness (C) ---
  { id: 11, text: 'I am always prepared.', trait: 'C', reverse: false },
  { id: 12, text: 'I tend to be disorganized.', trait: 'C', reverse: true },
  { id: 13, text: 'I make a plan before I start a task.', trait: 'C', reverse: false },
  { id: 14, text: 'I am a bit of a perfectionist.', trait: 'C', reverse: false },
  { id: 15, text: 'I find it hard to stick to a routine.', trait: 'C', reverse: true },
  { id: 16, text: 'I am thorough when I work.', trait: 'C', reverse: false },
  { id: 17, text: 'I procrastinate on important tasks.', trait: 'C', reverse: true },
  { id: 18, text: 'I keep my belongings neat and tidy.', trait: 'C', reverse: false },
  { id: 19, text: 'I am not very disciplined.', trait: 'C', reverse: true },
  { id: 20, text: 'I work hard to finish tasks on time.', trait: 'C', reverse: false },

  // --- Extraversion (E) ---
  { id: 21, text: 'I am the life of the party.', trait: 'E', reverse: false },
  { id: 22, text: "I don't talk a lot.", trait: 'E', reverse: true },
  { id: 23, text: 'I feel comfortable around people.', trait: 'E', reverse: false },
  { id: 24, text: "I don't enjoy being the center of attention.", trait: 'E', reverse: true },
  { id: 25, text: 'I talk to a lot of different people at parties.', trait: 'E', reverse: false },
  { id: 26, text: 'I am quiet around strangers.', trait: 'E', reverse: true },
  { id: 27, text: 'I am outgoing and sociable.', trait: 'E', reverse: false },
  { id: 28, text: 'I find it hard to initiate conversations.', trait: 'E', reverse: true },
  { id: 29, text: 'I am energetic and enthusiastic.', trait: 'E', reverse: false },
  { id: 30, text: 'I prefer to work alone rather than in a group.', trait: 'E', reverse: true },

  // --- Agreeableness (A) ---
  { id: 31, text: 'I am interested in other people’s feelings.', trait: 'A', reverse: false },
  { id: 32, text: 'I am not concerned with others’ problems.', trait: 'A', reverse: true },
  { id: 33, text: 'I am kind and gentle.', trait: 'A', reverse: false },
  { id: 34, text: 'I am not averse to taking risks with others’ feelings.', trait: 'A', reverse: true },
  { id: 35, text: 'I try to please others.', trait: 'A', reverse: false },
  { id: 36, text: 'I am not afraid to express my opinions.', trait: 'A', reverse: true },
  { id: 37, text: 'I am cooperative.', trait: 'A', reverse: false },
  { id: 38, text: 'I can be cold and aloof.', trait: 'A', reverse: true },
  { id: 39, text: 'I am trusting of others.', trait: 'A', reverse: false },
  { id: 40, text: 'I am argumentative.', trait: 'A', reverse: true },

  // --- Neuroticism (N) ---
  { id: 41, text: 'I worry a lot.', trait: 'N', reverse: false },
  { id: 42, text: 'I am relaxed most of the time.', trait: 'N', reverse: true },
  { id: 43, text: 'I get stressed out easily.', trait: 'N', reverse: false },
  { id: 44, text: 'I rarely feel depressed.', trait: 'N', reverse: true },
  { id: 45, text: 'I have frequent mood swings.', trait: 'N', reverse: false },
  { id: 46, text: 'I am emotionally stable.', trait: 'N', reverse: true },
  { id: 47, text: 'I seldom feel sad.', trait: 'N', reverse: true },
  { id: 48, text: 'I am sensitive to my feelings.', trait: 'N', reverse: false },
  { id: 49, text: 'I am not easily upset.', trait: 'N', reverse: true },
  { id: 50, text: 'I feel comfortable with myself.', trait: 'N', reverse: true },
]

export const ITEMS_BY_TRAIT: Record<TraitKey, QuizItem[]> = {
  O: IPIP_ITEMS.filter((i) => i.trait === 'O'),
  C: IPIP_ITEMS.filter((i) => i.trait === 'C'),
  E: IPIP_ITEMS.filter((i) => i.trait === 'E'),
  A: IPIP_ITEMS.filter((i) => i.trait === 'A'),
  N: IPIP_ITEMS.filter((i) => i.trait === 'N'),
}
