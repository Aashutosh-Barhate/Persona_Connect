/**
 * Mock API that mirrors the planned FastAPI backend contract.
 *
 * Everything here runs in the browser so the app is fully explorable without a
 * server. When the real backend lands, swap `mockApi` for a fetch-based client
 * with the same function signatures - the pages do not change.
 *
 * Implements (at mock fidelity):
 * - adaptive-style item selection driven by per-trait uncertainty
 * - IPIP-50 scoring (reverse-keyed) onto 0-100 trait scales
 * - MBTI axis tendencies derived from OCEAN
 * - five weighted similarities (S1..S5) with the plan's weights
 * - posterior-style confidence via 30 jittered draws
 * - maximal marginal relevance re-ranking with domain + fame constraints
 * - explanations built from structured facts only
 */
import type {
  Biography,
  FeedbackInput,
  HistoryEntry,
  Match,
  MatchBreakdownItem,
  MbtiAxis,
  NextItemResponse,
  Profile,
  QuizAnswer,
  QuizItem,
  QuizSession,
  StartQuizInput,
  StartQuizResponse,
  TraitKey,
  TraitScore,
  TraitUncertainty,
} from '../types'
import { IPIP_ITEMS } from '../data/items'
import { BIOGRAPHIES, CAREER_PHASES, LIFE_STAGES, THEMES, eraFromLifeStage } from '../data/mockData'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const TRAIT_ORDER: TraitKey[] = ['O', 'C', 'E', 'A', 'N']

export const TRAIT_LABELS: Record<TraitKey, string> = {
  O: 'Openness',
  C: 'Conscientiousness',
  E: 'Extraversion',
  A: 'Agreeableness',
  N: 'Neuroticism',
}

export const TRAIT_BLURB: Record<TraitKey, string> = {
  O: 'Curiosity, imagination and appetite for new ideas',
  C: 'Organisation, discipline and follow-through',
  E: 'Energy gained from people and the outer world',
  A: 'Warmth, cooperation and concern for others',
  N: 'Sensitivity to stress and emotional ups and downs',
}

export const MATCH_WEIGHTS = { S1: 0.3, S2: 0.15, S3: 0.2, S4: 0.2, S5: 0.15 } as const

const N_MIN = 15
const N_MAX = 30
const SD_TARGET = 7
const SD_MAX = 15

const ANSWER_OPTIONS = [
  { value: 1, label: 'Not me', hint: '1' },
  { value: 2, label: 'Rarely', hint: '2' },
  { value: 3, label: 'Somewhat', hint: '3' },
  { value: 4, label: 'Mostly', hint: '4' },
  { value: 5, label: 'Very me', hint: '5' },
]

export { ANSWER_OPTIONS }

export const QUIZ_VERSION = '0.1.0-mock'

// ---------------------------------------------------------------------------
// Small utilities
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function latency(): Promise<void> {
  return delay(120 + Math.floor(Math.random() * 180))
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function next() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashString(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function gauss(rng: () => number): number {
  const u = Math.max(rng(), 1e-9)
  const v = rng()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function clamp01(value: number): number {
  return clamp(value, 0, 1)
}

function shuffledIds(seed: number): number[] {
  const rng = mulberry32(seed)
  const ids = IPIP_ITEMS.map((item) => item.id)
  for (let i = ids.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
  }
  return ids
}

const ITEM_BY_ID = new Map(IPIP_ITEMS.map((item) => [item.id, item]))

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

export function scoreTraits(answers: QuizAnswer[]): {
  traits: TraitScore
  sd: TraitUncertainty
  counts: Record<TraitKey, number>
} {
  const sums: Record<TraitKey, number> = { O: 0, C: 0, E: 0, A: 0, N: 0 }
  const counts: Record<TraitKey, number> = { O: 0, C: 0, E: 0, A: 0, N: 0 }

  for (const answer of answers) {
    const item = ITEM_BY_ID.get(answer.itemId)
    if (!item) continue
    const value = item.reverse ? 6 - answer.value : answer.value
    sums[item.trait] += value
    counts[item.trait] += 1
  }

  const traits: TraitScore = { O: 50, C: 50, E: 50, A: 50, N: 50 }
  const sd: TraitUncertainty = { O: SD_MAX, C: SD_MAX, E: SD_MAX, A: SD_MAX, N: SD_MAX }

  for (const trait of TRAIT_ORDER) {
    const n = counts[trait]
    if (n > 0) {
      traits[trait] = Math.round(((sums[trait] - n) / (4 * n)) * 100)
      sd[trait] = Math.round(Math.max(SD_TARGET, 12 / Math.sqrt(n)) * 10) / 10
    }
  }

  return { traits, sd, counts }
}

export function deriveMbti(traits: TraitScore): MbtiAxis[] {
  const axis = (label: string, positive: string, negative: string, p: number): MbtiAxis => ({
    label,
    positive,
    negative,
    pPositive: Math.round(clamp01(p) * 1000) / 1000,
    sd: 0.08,
  })
  return [
    axis('Energy', 'E', 'I', traits.E / 100),
    axis('Information', 'N', 'S', traits.O / 100),
    axis('Decisions', 'F', 'T', traits.A / 100),
    axis('Lifestyle', 'J', 'P', traits.C / 100),
  ]
}

export function mbtiType(axes: MbtiAxis[]): string {
  return axes.map((axis) => (axis.pPositive >= 0.5 ? axis.positive : axis.negative)).join('')
}

function overallConfidence(sd: TraitUncertainty): number {
  const avg = TRAIT_ORDER.reduce((sum, t) => sum + sd[t], 0) / TRAIT_ORDER.length
  return Math.round(clamp01(1 - (avg - SD_TARGET) / (SD_MAX - SD_TARGET)) * 100)
}

function quizDone(counts: Record<TraitKey, number>, total: number): boolean {
  if (total >= N_MAX) return true
  if (total >= N_MIN && TRAIT_ORDER.every((t) => counts[t] >= 3)) return true
  return false
}

// ---------------------------------------------------------------------------
// Session storage
// ---------------------------------------------------------------------------

const CURRENT_SESSION_KEY = 'pc_current_session'
const HISTORY_KEY = 'pc_history'

function sessionKey(id: string): string {
  return `pc_session_${id}`
}

function matchesKey(id: string): string {
  return `pc_matches_${id}`
}

function loadSession(id: string): QuizSession | null {
  const raw = localStorage.getItem(sessionKey(id))
  if (!raw) return null
  try {
    const session = JSON.parse(raw) as QuizSession
    if (!Array.isArray(session.shuffledItemIds) || session.shuffledItemIds.length === 0) {
      session.shuffledItemIds = shuffledIds(hashString(session.id))
      localStorage.setItem(sessionKey(session.id), JSON.stringify(session))
    }
    return session
  } catch {
    return null
  }
}

function saveSession(session: QuizSession): void {
  localStorage.setItem(sessionKey(session.id), JSON.stringify(session))
  sessionStorage.setItem(CURRENT_SESSION_KEY, session.id)
}

export function getCurrentSessionId(): string | null {
  return sessionStorage.getItem(CURRENT_SESSION_KEY)
}

export function requireSession(sessionId?: string): QuizSession {
  const id = sessionId ?? getCurrentSessionId()
  if (!id) throw new ApiError('No active quiz session. Start the quiz first.', 404)
  const session = loadSession(id)
  if (!session) throw new ApiError('Quiz session not found or expired.', 404)
  return session
}

function persistHistory(session: QuizSession): void {
  const entries = listHistory().filter((entry) => entry.sessionId !== session.id)
  const entry: HistoryEntry = {
    sessionId: session.id,
    createdAt: session.createdAt,
    answeredCount: session.answers.length,
    lifeStage: session.lifeStage,
    careerPhase: session.careerPhase,
    themes: session.themes,
  }
  entries.unshift(entry)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, 20)))
}

export function listHistory(): HistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]') as HistoryEntry[]
  } catch {
    return []
  }
}

/** Make an existing session the active one (used by the history page). */
export function openSession(sessionId: string): QuizSession {
  const session = loadSession(sessionId)
  if (!session) throw new ApiError('Quiz session not found or expired.', 404)
  sessionStorage.setItem(CURRENT_SESSION_KEY, session.id)
  return session
}

// ---------------------------------------------------------------------------
// Adaptive-style item selection
// ---------------------------------------------------------------------------

function nextItemFor(session: QuizSession): QuizItem | null {
  const { sd, counts } = scoreTraits(session.answers)
  const asked = new Set(session.askedIds)

  const orderedTraits = [...TRAIT_ORDER].sort((a, b) => {
    if (sd[b] !== sd[a]) return sd[b] - sd[a]
    if (counts[a] !== counts[b]) return counts[a] - counts[b]
    return TRAIT_ORDER.indexOf(a) - TRAIT_ORDER.indexOf(b)
  })

  for (const trait of orderedTraits) {
    const candidate = session.shuffledItemIds
      .map((id) => ITEM_BY_ID.get(id))
      .find((item): item is QuizItem => Boolean(item) && item!.trait === trait && !asked.has(item!.id))
    if (candidate) return candidate
  }

  // Fallback: any unasked item
  const any = session.shuffledItemIds
    .map((id) => ITEM_BY_ID.get(id))
    .find((item): item is QuizItem => Boolean(item) && !asked.has(item!.id))
  return any ?? null
}

function stateFrom(session: QuizSession, done: boolean): NextItemResponse {
  const { sd } = scoreTraits(session.answers)
  const total = session.answers.length
  return {
    sessionId: session.id,
    item: done ? null : nextItemFor(session),
    done,
    answeredCount: total,
    confidence: done ? 100 : overallConfidence(sd),
    traitSd: sd,
  }
}

// ---------------------------------------------------------------------------
// Similarities
// ---------------------------------------------------------------------------

interface UserContext {
  traits: TraitScore
  sd: TraitUncertainty
  mbti: MbtiAxis[]
  themes: string[]
  goal: string
  era: string
  seedKey: string
}

function similarityS1(user: UserContext, bio: Biography): number {
  let acc = 0
  for (const trait of TRAIT_ORDER) {
    const du = (user.traits[trait] - bio.traits[trait]) / 100
    const su = Math.max(user.sd[trait] / 100, 0.04)
    const sb = 0.12
    acc += (du * du) / (su * su + sb * sb)
  }
  return Math.exp(-Math.sqrt(acc) / Math.sqrt(5))
}

function similarityS2(user: UserContext, bio: Biography): number {
  const bioMbti = deriveMbti(bio.traits)
  let sum = 0
  for (let i = 0; i < user.mbti.length; i += 1) {
    sum += Math.abs(user.mbti[i].pPositive - bioMbti[i].pPositive)
  }
  return 1 - sum / user.mbti.length
}

function jaccard(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0
  const setA = new Set(a)
  const setB = new Set(b)
  let intersection = 0
  setA.forEach((value) => {
    if (setB.has(value)) intersection += 1
  })
  const union = new Set([...setA, ...setB]).size
  return union === 0 ? 0 : intersection / union
}

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'with', 'who', 'that', 'their',
  'they', 'from', 'by', 'as', 'at', 'is', 'was', 'were', 'be', 'been', 'it', 'its', 'into',
  'her', 'his', 'him', 'she', 'he', 'known', 'work', 'works', 'first',
])

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 2 && !STOPWORDS.has(token)),
  )
}

function similarityS5(user: UserContext, bio: Biography): number {
  const themeText = user.themes.map((t) => t.replace(/-/g, ' ')).join(' ')
  const queryText = user.goal.trim() ? `${user.goal} ${themeText} ${user.era}` : `${themeText} ${user.era} ${bio.domain}`
  const bioText = `${bio.summary} ${bio.themes.join(' ')} ${bio.challenges.join(' ')}`
  const query = tokenize(queryText)
  const doc = tokenize(bioText)
  if (query.size === 0 || doc.size === 0) return 0
  let intersection = 0
  query.forEach((token) => {
    if (doc.has(token)) intersection += 1
  })
  const union = new Set([...query, ...doc]).size
  return union === 0 ? 0 : intersection / union
}

interface ScoredBio {
  bio: Biography
  s1: number
  s2: number
  s3: number
  s4: number
  s5: number
  total: number
  confidenceShare: number
}

function contextFromSession(session: QuizSession): UserContext {
  const { traits, sd } = scoreTraits(session.answers)
  return {
    traits,
    sd,
    mbti: deriveMbti(traits),
    themes: session.themes,
    goal: session.goal,
    era: eraFromLifeStage(session.lifeStage),
    seedKey: session.id,
  }
}

function similarityS4(user: UserContext, bio: Biography): number {
  const challengeOverlap = jaccard(user.themes, bio.challenges)
  const eraMatch = user.era === bio.peakLifeStage ? 1 : 0
  return 0.6 * challengeOverlap + 0.4 * eraMatch
}

function similarityS3(user: UserContext, bio: Biography): number {
  return jaccard(user.themes, bio.themes)
}

function totalScore(user: UserContext, bio: Biography, s3: number, s4: number, s5: number): number {
  return (
    MATCH_WEIGHTS.S1 * similarityS1(user, bio) +
    MATCH_WEIGHTS.S2 * similarityS2(user, bio) +
    MATCH_WEIGHTS.S3 * s3 +
    MATCH_WEIGHTS.S4 * s4 +
    MATCH_WEIGHTS.S5 * s5
  )
}

/**
 * Share of 30 jittered posterior draws in which this biography lands in the
 * user's top five. This is the displayed confidence level.
 */
function topFiveShare(user: UserContext, bio: Biography, all: Biography[], fixed: Map<number, { s3: number; s4: number; s5: number }>): number {
  const rng = mulberry32(hashString(`${user.seedKey}:${bio.id}`))
  let hits = 0
  for (let draw = 0; draw < 30; draw += 1) {
    const jitteredTraits: TraitScore = { ...user.traits }
    for (const trait of TRAIT_ORDER) {
      jitteredTraits[trait] = clamp(user.traits[trait] + gauss(rng) * Math.max(user.sd[trait], 2), 0, 100)
    }
    const jitteredUser: UserContext = { ...user, traits: jitteredTraits, mbti: deriveMbti(jitteredTraits) }
    const totals = all.map((candidate) => {
      const f = fixed.get(candidate.id)!
      return { id: candidate.id, total: totalScore(jitteredUser, candidate, f.s3, f.s4, f.s5) }
    })
    totals.sort((a, b) => b.total - a.total)
    const top5 = new Set(totals.slice(0, 5).map((t) => t.id))
    if (top5.has(bio.id)) hits += 1
  }
  return hits / 30
}

function cosineSimilarity(a: TraitScore, b: TraitScore): number {
  let dot = 0
  let normA = 0
  let normB = 0
  for (const trait of TRAIT_ORDER) {
    dot += a[trait] * b[trait]
    normA += a[trait] * a[trait]
    normB += b[trait] * b[trait]
  }
  if (normA === 0 || normB === 0) return 0
  return dot / Math.sqrt(normA * normB)
}

/** Maximal marginal relevance with a 2-per-domain cap and a fame constraint. */
function mmrRerank(items: ScoredBio[]): ScoredBio[] {
  const lambda = 0.7
  const sorted = [...items].sort((a, b) => b.total - a.total)
  const picked: ScoredBio[] = []
  const remaining = new Set(sorted.map((item) => item.bio.id))
  const domainCount: Record<string, number> = {}

  while (picked.length < 20 && remaining.size > 0) {
    let best: ScoredBio | null = null
    let bestValue = -Infinity
    for (const item of sorted) {
      if (!remaining.has(item.bio.id)) continue
      if ((domainCount[item.bio.domain] ?? 0) >= 2) continue
      const maxSim =
        picked.length === 0
          ? 0
          : Math.max(...picked.map((p) => cosineSimilarity(p.bio.traits, item.bio.traits)))
      const value = lambda * item.total - (1 - lambda) * maxSim
      if (value > bestValue) {
        bestValue = value
        best = item
      }
    }
    if (!best) break
    picked.push(best)
    remaining.delete(best.bio.id)
    domainCount[best.bio.domain] = (domainCount[best.bio.domain] ?? 0) + 1
  }

  // Hard constraint: at least one pick outside the top fame tier in the top 5.
  const top5 = picked.slice(0, 5)
  if (top5.length === 5 && !top5.some((item) => item.bio.fameTier < 3)) {
    const swapIndex = picked.findIndex((item, index) => index >= 5 && item.bio.fameTier < 3)
    if (swapIndex >= 0) {
      const [lowerFame] = picked.splice(swapIndex, 1)
      picked.splice(4, 0, lowerFame)
    }
  }

  return picked
}

function buildBreakdown(item: { s1: number; s2: number; s3: number; s4: number; s5: number }): MatchBreakdownItem[] {
  return [
    {
      key: 'S1',
      label: 'Personality closeness (OCEAN)',
      weight: MATCH_WEIGHTS.S1,
      raw: item.s1,
      weighted: MATCH_WEIGHTS.S1 * item.s1,
      detail: 'Distance adjusted for your quiz uncertainty and their estimate uncertainty',
    },
    {
      key: 'S2',
      label: 'Preference tendencies',
      weight: MATCH_WEIGHTS.S2,
      raw: item.s2,
      weighted: MATCH_WEIGHTS.S2 * item.s2,
      detail: 'Agreement across the four MBTI axes (probabilities, not a type label)',
    },
    {
      key: 'S3',
      label: 'Shared domains',
      weight: MATCH_WEIGHTS.S3,
      raw: item.s3,
      weighted: MATCH_WEIGHTS.S3 * item.s3,
      detail: 'Overlap between the themes you chose and their life domains',
    },
    {
      key: 'S4',
      label: 'Context fit',
      weight: MATCH_WEIGHTS.S4,
      raw: item.s4,
      weighted: MATCH_WEIGHTS.S4 * item.s4,
      detail: 'Challenges they faced that match your themes, plus life-stage overlap',
    },
    {
      key: 'S5',
      label: 'Text similarity',
      weight: MATCH_WEIGHTS.S5,
      raw: item.s5,
      weighted: MATCH_WEIGHTS.S5 * item.s5,
      detail: 'Your goal text against the themes of their story',
    },
  ]
}

function buildExplanation(user: UserContext, bio: Biography, breakdown: MatchBreakdownItem[]) {
  const sharedTraits = TRAIT_ORDER.map((trait) => ({
    trait,
    label: TRAIT_LABELS[trait],
    userValue: user.traits[trait],
    bioValue: bio.traits[trait],
    gap: Math.abs(user.traits[trait] - bio.traits[trait]),
    note: user.traits[trait] >= 60 && bio.traits[trait] >= 60
      ? 'You both run high here'
      : user.traits[trait] <= 40 && bio.traits[trait] <= 40
        ? 'You both run low here'
        : 'Mixed',
  }))
    .filter((fact) => fact.note !== 'Mixed')
    .sort((a, b) => a.gap - b.gap)
    .slice(0, 3)

  const sharedDomains = user.themes.filter((theme) => bio.themes.includes(theme))
  const sharedChallenges = user.themes.filter((theme) => bio.challenges.includes(theme))

  let difference: Match['explanation']['difference'] = null
  let biggestGap = -1
  for (const trait of TRAIT_ORDER) {
    const gap = Math.abs(user.traits[trait] - bio.traits[trait])
    if (gap > biggestGap) {
      biggestGap = gap
      difference = {
        trait,
        label: TRAIT_LABELS[trait],
        userValue: user.traits[trait],
        bioValue: bio.traits[trait],
        gap,
      }
    }
  }

  const topBreakdown = [...breakdown].sort((a, b) => b.weighted - a.weighted)[0]
  const domainText = sharedDomains.length > 0 ? `shared themes: ${sharedDomains.join(', ')}` : 'similar personality shape'
  const text =
    `You matched with ${bio.name} mainly on ${topBreakdown.label.toLowerCase()} ` +
    `(${topBreakdown.key} = ${topBreakdown.raw.toFixed(2)}) and ${domainText}. ` +
    `${bio.name} is estimated to run ${bio.traits.O >= 70 ? 'high' : bio.traits.O <= 40 ? 'low' : 'moderately'} on openness ` +
    `and ${bio.traits.C >= 70 ? 'high' : bio.traits.C <= 40 ? 'low' : 'moderately'} on conscientiousness from public text.`

  return { sharedTraits, sharedDomains, sharedChallenges, difference, text }
}

function buildMatch(rank: number, item: ScoredBio, user: UserContext): Match {
  const breakdown = buildBreakdown(item)
  const confidenceLabel: Match['confidenceLabel'] =
    item.confidenceShare >= 0.6 ? 'High' : item.confidenceShare >= 0.3 ? 'Medium' : 'Low'
  return {
    rank,
    biography: item.bio,
    score: Math.round(item.total * 1000) / 1000,
    confidence: Math.round(item.confidenceShare * 100) / 100,
    confidenceLabel,
    breakdown,
    explanation: buildExplanation(user, item.bio, breakdown),
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const mockApi = {
  meta: {
    themes: THEMES,
    lifeStages: LIFE_STAGES,
    careerPhases: CAREER_PHASES,
    quizVersion: QUIZ_VERSION,
    itemCount: IPIP_ITEMS.length,
  },

  async startQuiz(input: StartQuizInput): Promise<StartQuizResponse> {
    await latency()

    if (!LIFE_STAGES.includes(input.ageRange as (typeof LIFE_STAGES)[number])) {
      throw new ApiError('Please choose an age range.', 422)
    }
    if (!CAREER_PHASES.includes(input.careerPhase as (typeof CAREER_PHASES)[number])) {
      throw new ApiError('Please choose a career phase.', 422)
    }
    if (input.themes.length < 1 || input.themes.length > 3) {
      throw new ApiError('Choose between 1 and 3 challenge themes.', 422)
    }
    const validThemeIds = new Set(THEMES.map((theme) => theme.id))
    if (input.themes.some((theme) => !validThemeIds.has(theme))) {
      throw new ApiError('Unknown theme selected.', 422)
    }

    const id = `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
    const session: QuizSession = {
      id,
      answers: [],
      askedIds: [],
      lifeStage: input.ageRange,
      careerPhase: input.careerPhase,
      themes: input.themes,
      goal: (input.goal ?? '').trim(),
      shuffledItemIds: shuffledIds(hashString(id)),
      createdAt: new Date().toISOString(),
    }
    saveSession(session)

    const state = stateFrom(session, false)
    return { ...state, sessionId: id }
  },

  async answer(sessionId: string, itemId: number, value: number): Promise<NextItemResponse> {
    await latency()
    const session = requireSession(sessionId)
    const item = ITEM_BY_ID.get(itemId)
    if (!item) throw new ApiError('Unknown quiz item.', 400)
    if (!Number.isInteger(value) || value < 1 || value > 5) {
      throw new ApiError('Answers must be integers between 1 and 5.', 422)
    }

    const existing = session.answers.findIndex((answer) => answer.itemId === itemId)
    if (existing >= 0) {
      session.answers[existing].value = value
    } else {
      session.answers.push({ itemId, value })
      if (!session.askedIds.includes(itemId)) session.askedIds.push(itemId)
    }
    saveSession(session)

    const { counts } = scoreTraits(session.answers)
    const done = quizDone(counts, session.answers.length)
    if (done) persistHistory(session)
    return stateFrom(session, done)
  },

  async undo(sessionId: string): Promise<NextItemResponse> {
    await latency()
    const session = requireSession(sessionId)
    const last = session.answers.pop()
    if (last) {
      const index = session.askedIds.indexOf(last.itemId)
      if (index >= 0) session.askedIds.splice(index, 1)
    }
    saveSession(session)
    return stateFrom(session, false)
  },

  async getSession(sessionId: string): Promise<QuizSession> {
    await latency()
    return requireSession(sessionId)
  },

  /** Resume a quiz: rebuild the next-item state from stored responses. */
  async resumeQuiz(sessionId: string): Promise<NextItemResponse> {
    await latency()
    const session = requireSession(sessionId)
    const { counts } = scoreTraits(session.answers)
    return stateFrom(session, quizDone(counts, session.answers.length))
  },

  async getProfile(sessionId: string): Promise<Profile> {
    await latency()
    const session = requireSession(sessionId)
    const { traits, sd } = scoreTraits(session.answers)
    return {
      traits,
      sd,
      mbti: deriveMbti(traits),
      answeredCount: session.answers.length,
      quizVersion: QUIZ_VERSION,
      lifeStage: session.lifeStage,
      careerPhase: session.careerPhase,
      themes: session.themes,
      goal: session.goal,
    }
  },

  async getMatches(sessionId: string): Promise<Match[]> {
    await latency()
    const session = requireSession(sessionId)
    const user = contextFromSession(session)

    const fixed = new Map<number, { s3: number; s4: number; s5: number }>()
    const scored: ScoredBio[] = BIOGRAPHIES.map((bio) => {
      const s3 = similarityS3(user, bio)
      const s4 = similarityS4(user, bio)
      const s5 = similarityS5(user, bio)
      fixed.set(bio.id, { s3, s4, s5 })
      return {
        bio,
        s1: similarityS1(user, bio),
        s2: similarityS2(user, bio),
        s3,
        s4,
        s5,
        total: totalScore(user, bio, s3, s4, s5),
        confidenceShare: 0,
      }
    })

    for (const item of scored) {
      item.confidenceShare = topFiveShare(user, item.bio, BIOGRAPHIES, fixed)
    }

    const ranked = mmrRerank(scored)
    const matches = ranked.map((item, index) => buildMatch(index + 1, item, user))
    localStorage.setItem(matchesKey(sessionId), JSON.stringify(matches))
    return matches
  },

  /** Read the last computed match list for a session (used by the detail page). */
  getCachedMatches(sessionId: string): Match[] | null {
    const raw = localStorage.getItem(matchesKey(sessionId))
    if (!raw) return null
    try {
      return JSON.parse(raw) as Match[]
    } catch {
      return null
    }
  },

  async submitFeedback(input: FeedbackInput): Promise<{ ok: true }> {
    await latency()
    if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
      throw new ApiError('Rating must be an integer between 1 and 5.', 422)
    }
    const all = JSON.parse(localStorage.getItem('pc_feedback') ?? '[]')
    all.push({ ...input, createdAt: new Date().toISOString() })
    localStorage.setItem('pc_feedback', JSON.stringify(all))
    return { ok: true }
  },
}

export type MockApi = typeof mockApi
