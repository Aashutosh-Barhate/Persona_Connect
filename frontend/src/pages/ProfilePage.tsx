import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from 'recharts'
import { api, TRAIT_BLURB, TRAIT_LABELS, TRAIT_ORDER, mbtiType } from '../api/client'
import { getCurrentSessionId } from '../api/client'
import { useAsync } from '../hooks/useAsync'
import TraitRangeBar from '../components/TraitRangeBar'
import Disclosure from '../components/Disclosure'
import Skeleton from '../components/Skeleton'
import { themeLabel } from '../data/mockData'

export default function ProfilePage() {
  const navigate = useNavigate()
  const sessionId = getCurrentSessionId()

  const profile = useAsync(() => api.getProfile(sessionId!), [sessionId])

  if (!sessionId) {
    return (
      <div className="card mx-auto max-w-xl space-y-4 text-center">
        <h1 className="text-2xl font-bold">No active quiz</h1>
        <p className="text-slate-400">Start the quiz and your profile will appear here.</p>
        <button className="btn-primary mx-auto" onClick={() => navigate('/start')}>
          Start the quiz
        </button>
      </div>
    )
  }

  if (profile.loading) {
    return (
      <div className="mx-auto max-w-2xl">
        <Skeleton />
      </div>
    )
  }

  if (profile.error) {
    return (
      <div className="card mx-auto max-w-xl space-y-4 text-center">
        <p role="alert" className="text-rose-300">
          {profile.error.message}
        </p>
        <button className="btn-ghost mx-auto" onClick={profile.retry}>
          Try again
        </button>
      </div>
    )
  }

  if (!profile.data) return null
  const data = profile.data

  const radarData = TRAIT_ORDER.map((trait) => ({
    trait: TRAIT_LABELS[trait],
    user: data.traits[trait],
    low: Math.max(0, data.traits[trait] - 1.28 * data.sd[trait]),
    high: Math.min(100, data.traits[trait] + 1.28 * data.sd[trait]),
  }))

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight">Your profile</h1>
        <p className="mt-2 text-slate-400">
          Five trait bands and four preference sliders, from {data.answeredCount} answers (quiz
          version {data.quizVersion}). Bands show the estimate and its uncertainty - read the edges,
          not the middle.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <h2 className="mb-4 font-bold text-white">OCEAN bands</h2>
          <div className="space-y-5">
            {TRAIT_ORDER.map((trait) => (
              <TraitRangeBar
                key={trait}
                label={TRAIT_LABELS[trait]}
                blurb={TRAIT_BLURB[trait]}
                value={data.traits[trait]}
                sd={data.sd[trait]}
              />
            ))}
          </div>
        </section>

        <section className="card">
          <h2 className="mb-2 font-bold text-white">Trait shape</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="72%">
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="trait" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Radar
                  name="You"
                  dataKey="user"
                  stroke="#818cf8"
                  fill="#6366f1"
                  fillOpacity={0.35}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-1 text-center text-xs text-slate-500">
            The band around each point is your +/- 1.28 sd range.
          </p>
        </section>
      </div>

      <section className="card">
        <h2 className="mb-1 font-bold text-white">Preference tendencies</h2>
        <p className="mb-4 text-sm text-slate-400">
          Probabilities, not a four-letter type. Derived type for display only:{' '}
          <span className="font-mono font-bold text-indigo-300">{mbtiType(data.mbti)}</span>
        </p>
        <div className="grid gap-5 sm:grid-cols-2">
          {data.mbti.map((axis) => (
            <div key={axis.label}>
              <div className="mb-1 flex items-baseline justify-between text-sm">
                <span className="font-medium text-slate-200">{axis.label}</span>
                <span className="tabular-nums text-slate-400">
                  {axis.negative} {Math.round((1 - axis.pPositive) * 100)}% · {Math.round(axis.pPositive * 100)}% {axis.positive}
                </span>
              </div>
              <div className="relative h-6 rounded-lg bg-slate-800/80">
                <div
                  className="absolute inset-y-1 rounded-md bg-indigo-500/25"
                  style={{
                    left: `${Math.max(0, (axis.pPositive - axis.sd) * 100)}%`,
                    width: `${Math.max((2 * axis.sd) * 100, 2)}%`,
                  }}
                />
                <div
                  className="absolute inset-y-0.5 w-1 rounded-full bg-indigo-400"
                  style={{ left: `calc(${axis.pPositive * 100}% - 2px)` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="mb-3 font-bold text-white">Context you gave us</h2>
        <div className="flex flex-wrap gap-2">
          <span className="chip">{data.lifeStage}</span>
          <span className="chip">{data.careerPhase}</span>
          {data.themes.map((theme) => (
            <span key={theme} className="chip border-indigo-700/60 text-indigo-200">
              {themeLabel(theme)}
            </span>
          ))}
        </div>
        {data.goal && (
          <p className="mt-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-sm italic text-slate-300">
            "{data.goal}"
          </p>
        )}
      </section>

      <div className="flex justify-center">
        <Link to="/matches" className="btn-primary px-6 py-3 text-base">
          See my matches <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      <Disclosure />
    </div>
  )
}
