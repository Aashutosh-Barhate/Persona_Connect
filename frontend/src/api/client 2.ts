/**
 * API client switch — mock (offline, localStorage) vs real (fetch backend).
 *
 * The app targets `realApi` when VITE_API_BASE is present in the env, and
 * falls back to `mockApi` so frontend development stays zero-backend.
 *
 * Static exports (trait labels, answer options, helpers) are shared by both
 * clients and re-exported here unchanged.
 */
import * as mock from './mockApi'
import * as real from './realApi'

const useReal = Boolean(import.meta.env.VITE_API_BASE)

export const api = useReal ? real.realApi : mock.mockApi

// session-directory helpers exist on both clients
export const listHistory = useReal ? real.listHistory : mock.listHistory
export const openSession = useReal ? real.openSession : mock.openSession
export const getCurrentSessionId = useReal ? real.getCurrentSessionId : mock.getCurrentSessionId

// shared constants + pure helpers
export const {
  TRAIT_ORDER,
  TRAIT_LABELS,
  TRAIT_BLURB,
  MATCH_WEIGHTS,
  ANSWER_OPTIONS,
  mbtiType,
  deriveMbti,
  scoreTraits,
  ApiError,
} = mock

export default api
