/**
 * Shared TypeScript types for Persona-Connect.
 *
 * NOTE: In the final architecture these types are generated from the FastAPI
 * OpenAPI schema (openapi-typescript). Until the backend ships, this module is
 * the single hand-written contract used by the mock API and every page.
 */

export type TraitKey = 'O' | 'C' | 'E' | 'A' | 'N'

export type TraitScore = Record<TraitKey, number>

export type TraitUncertainty = Record<TraitKey, number>

export interface MbtiAxis {
  label: string
  positive: string
  negative: string
  pPositive: number
  sd: number
}

export interface QuizItem {
  id: number
  text: string
  trait: TraitKey
  reverse: boolean
}

export interface QuizAnswer {
  itemId: number
  value: number
}

export interface QuizSession {
  id: string
  answers: QuizAnswer[]
  askedIds: number[]
  lifeStage: string
  careerPhase: string
  themes: string[]
  goal: string
  shuffledItemIds: number[]
  createdAt: string
}

export interface StartQuizInput {
  ageRange: string
  careerPhase: string
  themes: string[]
  goal?: string
}

export interface StartQuizResponse {
  sessionId: string
  item: QuizItem | null
  done: boolean
  answeredCount: number
  confidence: number
  traitSd: TraitUncertainty
}

export interface NextItemResponse {
  sessionId: string
  item: QuizItem | null
  done: boolean
  answeredCount: number
  confidence: number
  traitSd: TraitUncertainty
}

export interface Profile {
  traits: TraitScore
  sd: TraitUncertainty
  mbti: MbtiAxis[]
  answeredCount: number
  quizVersion: string
  lifeStage: string
  careerPhase: string
  themes: string[]
  goal: string
}

export interface Biography {
  id: number
  name: string
  domain: string
  summary: string
  traits: TraitScore
  traitSource: string
  traitConfidence: number
  themes: string[]
  challenges: string[]
  birthYear: number | null
  deathYear: number | null
  nationality: string
  fameTier: 1 | 2 | 3
  peakLifeStage: string
  sourceUrl: string
}

export interface MatchBreakdownItem {
  key: 'S1' | 'S2' | 'S3' | 'S4' | 'S5'
  label: string
  weight: number
  raw: number
  weighted: number
  detail: string
}

export interface SharedTraitFact {
  trait: TraitKey
  label: string
  userValue: number
  bioValue: number
  gap: number
  note: string
}

export interface MatchExplanation {
  sharedTraits: SharedTraitFact[]
  sharedDomains: string[]
  sharedChallenges: string[]
  difference: {
    trait: TraitKey
    label: string
    userValue: number
    bioValue: number
    gap: number
  } | null
  text: string
}

export interface Match {
  rank: number
  biography: Biography
  score: number
  confidence: number
  confidenceLabel: 'High' | 'Medium' | 'Low'
  breakdown: MatchBreakdownItem[]
  explanation: MatchExplanation
}

export interface FeedbackInput {
  sessionId: string
  biographyId: number
  rating: number
  comment: string
  breakdown: MatchBreakdownItem[]
}

export interface HistoryEntry {
  sessionId: string
  createdAt: string
  answeredCount: number
  lifeStage: string
  careerPhase: string
  themes: string[]
}

export interface ThemeOption {
  id: string
  label: string
  description: string
}
