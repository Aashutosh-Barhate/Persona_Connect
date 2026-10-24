/**
 * Real API client — mirrors mockApi's exact function signatures, backed by
 * fetch against the FastAPI backend. Pages do not need to change when this
 * client is activated; `client.ts` picks it up when VITE_API_BASE is set.
 *
 * Contract parity notes:
 * - Backend assessment ids are numbers; the client presents
 *   `sessionId = String(id)` so the pages keep using string ids.
 * - snake_case backend fields are mapped to the camelCase types in ../types.
 * - Quiz session state (answers/askedIds) lives in localStorage exactly like
 *   the mock, so resume/undo behaves identically.
 */
import type {
  Biography,
  FeedbackInput,
  HistoryEntry,
  Match,
  Profile,
  QuizSession,
  StartQuizInput,
  StartQuizResponse,
  TraitKey,
  TraitUncertainty,
} from '../types'
import { IPIP_ITEMS } from '../data/items'
import { BIOGRAPHIES, CAREER_PHASES, LIFE_STAGES, THEMES } from '../data/mockData'
import { ApiError, ANSWER_OPTIONS } from './mockApi'

export { ANSWER_OPTIONS }

// ---------------------------------------------------------------------------
// Meta (static — matches mockApi.meta keys)
// ---------------------------------------------------------------------------

export const QUIZ_VERSION = '0.4.0'

export const meta = {
  themes: THEMES,
  lifeStages: LIFE_STAGES,
  careerPhases: CAREER_PHASES,
  quizVersion: QUIZ_VERSION,
  itemCount: IPIP_ITEMS.length,
}

// ---------------------------------------------------------------------------
// Transport
// ---------------------------------------------------------------------------

const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? ''

function join(path: string): string {
  return `${BASE.replace(/\/$/, '')}${path}`
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(join(path), {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    })
  } catch {
    throw new ApiError('Cannot reach the server. Is the backend running?', 0)
  }
  const text = await res.text()
  const body = text ? (JSON.parse(text) as any) : null
  if (!res.ok) {
    const detail = body?.detail ?? `${res.status} ${res.statusText}`
    const message = Array.isArray(detail)
      ? detail.map((d: any) => d.msg ?? '').join('; ')
      : detail
    throw new ApiError(String(message), res.status)
  }
  return body as T
}

function post<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    body: body === undefined ? '{}' : JSON.stringify(body),
  })
}

// ---------------------------------------------------------------------------
// Deterministic shuffle helpers (same algorithm as the mock for stable ids)
// ---------------------------------------------------------------------------

function hashString(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
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

function shuffledIds(seed: number): number[] {
  const rng = mulberry32(seed)
  const ids = IPIP_ITEMS.map((item) => item.id)
  for (let i = ids.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
  }
  return ids
}

// ---------------------------------------------------------------------------
// Local session bookkeeping (mirrors mockApi)
// ---------------------------------------------------------------------------

const CURRENT_SESSION_KEY = 'pc_current_session'
const HISTORY_KEY = 'pc_history'

function sessionKey(id: string): string {
  return `pc_session_${id}`
}

export function loadSession(id: string): QuizSession | null {
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

function requireSession(sessionId?: string): QuizSession {
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

export function openSession(sessionId: string): QuizSession {
  const session = loadSession(sessionId)
  if (!session) throw new ApiError('Quiz session not found or expired.', 404)
  sessionStorage.setItem(CURRENT_SESSION_KEY, session.id)
  return session
}

// ---------------------------------------------------------------------------
// Response mapping (snake_case → ../types)
// ---------------------------------------------------------------------------

function toTraitKeys(o: any): Record<TraitKey, number> {
  return { O: Number(o.O), C: Number(o.C), E: Number(o.E), A: Number(o.A), N: Number(o.N) }
}

function mapBiography(b: any): Biography {
  const mock = BIOGRAPHIES.find((bio) => bio.name === b.name)
  return {
    id: b.id,
    name: b.name,
    domain: b.domain,
    summary: b.summary,
    traits: toTraitKeys(b.traits),
    traitSource: b.trait_source ?? 'estimated',
    traitConfidence: b.trait_confidence ?? 0.8,
    themes: b.themes ?? [],
    challenges: b.challenges ?? [],
    birthYear: b.birth_year ?? null,
    // backend corpus has no death years; the mirrored mock data does
    deathYear: mock?.deathYear ?? null,
    nationality: b.nationality ?? '',
    fameTier: (b.fame_tier ?? 2) as 1 | 2 | 3,
    peakLifeStage: b.peak_life_stage ?? 'mid',
    sourceUrl: b.source_url ?? `https://en.wikipedia.org/wiki/${String(b.name).replace(/ /g, '_')}`,
  }
}

function mapState(state: any): NextState {
  return {
    sessionId: String(state.sessionId ?? ''),
    item: state.item ?? null,
    done: Boolean(state.done),
    answeredCount: Number(state.answeredCount),
    confidence: Number(state.confidence),
    traitSd: toTraitKeys(state.traitSd ?? { O: 15, C: 15, E: 15, A: 15, N: 15 }),
  }
}

interface NextState {
  sessionId: string
  item: { id: number; text: string; trait: TraitKey; reverse: boolean } | null
  done: boolean
  answeredCount: number
  confidence: number
  traitSd: TraitUncertainty
}

// ---------------------------------------------------------------------------
// Public API (mirrors mockApi signature-for-signature)
// ---------------------------------------------------------------------------

export const realApi = {
  meta,

  async startQuiz(input: StartQuizInput): Promise<StartQuizResponse> {
    if (!LIFE_STAGES.includes(input.ageRange as (typeof LIFE_STAGES)[number])) {
      throw new ApiError('Please choose an age range.', 422)
    }
    if (!CAREER_PHASES.includes(input.careerPhase as (typeof CAREER_PHASES)[number])) {
      throw new ApiError('Please choose a career phase.', 422)
    }
    if (input.themes.length < 1 || input.themes.length > 3) {
      throw new ApiError('Choose between 1 and 3 challenge themes.', 422)
    }

    const result = await post<any>('/api/assessments', {
      user_id: 'web-user',
      adaptive: true,
      version: '1.0',
      life_stage: input.ageRange,
      career_phase: input.careerPhase,
      themes: input.themes,
      goal: input.goal ?? '',
    })

    const sessionId = String(result.assessment_id)
    const session: QuizSession = {
      id: sessionId,
      answers: [],
      askedIds: [],
      lifeStage: input.ageRange,
      careerPhase: input.careerPhase,
      themes: input.themes,
      goal: (input.goal ?? '').trim(),
      shuffledItemIds: shuffledIds(hashString(sessionId)),
      createdAt: new Date().toISOString(),
    }
    saveSession(session)

    // immediate first-state so the caller can seed right into the quiz
    return this.resumeQuiz(sessionId)
  },

  async answer(sessionId: string, itemId: number, value: number): Promise<StartQuizResponse> {
    requireSession(sessionId)
    if (!IPIP_ITEMS.some((item) => item.id === itemId)) {
      throw new ApiError('Unknown quiz item.', 400)
    }
    if (!Number.isInteger(value) || value < 1 || value > 5) {
      throw new ApiError('Answers must be integers between 1 and 5.', 422)
    }

    const state = await post<any>(`/api/assessments/${sessionId}/answers`, {
      question_id: itemId,
      value,
    })
    const profile = mapState(state)

    const session = requireSession(sessionId)
    const existing = session.answers.findIndex((a) => a.itemId === itemId)
    if (existing >= 0) session.answers[existing].value = value
    else session.answers.push({ itemId, value })
    session.askedIds = Array.from(new Set([...session.askedIds, itemId]))
    if (profile.item) {
      session.askedIds = Array.from(
        new Set([...session.askedIds, profile.item.id]),
      )
    }
    saveSession(session)
    if (profile.done) persistHistory(session)

    return profile
  },

  async undo(sessionId: string): Promise<StartQuizResponse> {
    requireSession(sessionId)
    const state = await post<any>(`/api/assessments/${sessionId}/undo`)
    const profile = mapState(state)

    // re-sync the local mirror from the server's answered count
    const session = requireSession(sessionId)
    const target = profile.answeredCount
    if (session.answers.length > target) {
      session.answers = session.answers.slice(0, target)
      session.askedIds = session.askedIds.filter(
        (id) => session.answers.some((a) => a.itemId === id) || id === profile.item?.id,
      )
      saveSession(session)
    }
    return profile
  },

  async getSession(sessionId: string): Promise<QuizSession> {
    return requireSession(sessionId)
  },

  /** Resume a quiz: rebuild the next-item state from server-stored responses. */
  async resumeQuiz(sessionId: string): Promise<StartQuizResponse> {
    requireSession(sessionId)
    const state = await request<any>(`/api/assessments/${sessionId}/state`)
    return mapState(state)
  },

  async getProfile(sessionId: string): Promise<Profile> {
    const session = requireSession(sessionId)
    const profile = await request<any>(`/api/assessments/${sessionId}/profile`)
    return {
      traits: toTraitKeys(profile.traits),
      sd: (profile.standard_errors ?? {}) as TraitUncertainty,
      mbti: mbtiAxesFromType(profile.mbti),
      answeredCount: session.answers.length,
      quizVersion: QUIZ_VERSION,
      lifeStage: session.lifeStage,
      careerPhase: session.careerPhase,
      themes: session.themes,
      goal: session.goal,
    }
  },

  async getMatches(sessionId: string): Promise<Match[]> {
    requireSession(sessionId)
    const matches = await post<any[]>(`/api/assessments/${sessionId}/recommendations?top_k=20`)
    const mapped = matches.map((m: any): Match => ({
      rank: Number(m.rank),
      biography: mapBiography(m.biography),
      score: Number(m.score),
      confidence: Number(m.confidence),
      confidenceLabel: m.confidence_label as Match['confidenceLabel'],
      breakdown: (m.breakdown ?? []).map((b: any) => ({
        key: b.key as MatchBreakdownKey,
        label: String(b.label),
        weight: Number(b.weight),
        raw: Number(b.raw),
        weighted: Number(b.weighted),
        detail: String(b.detail),
      })),
      explanation: {
        sharedTraits: (m.explanation?.shared_traits ?? []).map((f: any) => ({
          trait: f.trait as TraitKey,
          label: String(f.label),
          userValue: Number(f.userValue),
          bioValue: Number(f.bioValue),
          gap: Number(f.gap),
          note: String(f.note),
        })),
        sharedDomains: m.explanation?.shared_domains ?? [],
        sharedChallenges: m.explanation?.shared_challenges ?? [],
        difference: m.explanation?.difference
          ? {
              trait: m.explanation.difference.trait as TraitKey,
              label: String(m.explanation.difference.label),
              userValue: Number(m.explanation.difference.userValue),
              bioValue: Number(m.explanation.difference.bioValue),
              gap: Number(m.explanation.difference.gap),
            }
          : null,
        text: String(m.explanation?.text ?? ''),
      },
    }))
    localStorage.setItem(`pc_matches_${sessionId}`, JSON.stringify(mapped))
    return mapped
  },

  /** Read the last computed match list for a session (used by the detail page). */
  getCachedMatches(sessionId: string): Match[] | null {
    const raw = localStorage.getItem(`pc_matches_${sessionId}`)
    if (!raw) return null
    try {
      return JSON.parse(raw) as Match[]
    } catch {
      return null
    }
  },

  async submitFeedback(input: FeedbackInput): Promise<{ ok: true }> {
    if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
      throw new ApiError('Rating must be an integer between 1 and 5.', 422)
    }
    await post('/api/feedback', {
      assessment_id: Number(input.sessionId),
      biography_id: input.biographyId,
      rating: input.rating,
      comment: input.comment,
      breakdown: input.breakdown,
    })
    return { ok: true }
  },
}

type MatchBreakdownKey = Match['breakdown'][number]['key']

/**
 * Rebuild the four MBTI axis probabilities from the backend's 4-letter type.
 * The backend stores a point type (e.g. "ENFJ"); the UI wants axis
 * probabilities, so a chosen letter gets 0.75, the opposite 0.25, unknown 0.5.
 */
function mbtiAxesFromType(mbti: string | null) {
  const axes: Array<{ label: string; positive: string; negative: string }> = [
    { label: 'Energy', positive: 'E', negative: 'I' },
    { label: 'Information', positive: 'N', negative: 'S' },
    { label: 'Decisions', positive: 'F', negative: 'T' },
    { label: 'Lifestyle', positive: 'J', negative: 'P' },
  ]
  return axes.map(({ label, positive, negative }, i) => {
    const letter = mbti && mbti.length === 4 ? mbti[i] : undefined
    const p = letter === positive ? 0.75 : letter === negative ? 0.25 : 0.5
    return { label, positive, negative, pPositive: p, sd: 0.08 }
  })
}
