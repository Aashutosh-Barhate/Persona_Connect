import { useState } from 'react'
import { Info, Sparkles } from 'lucide-react'
import type { MatchBreakdownItem } from '../types'

interface ScoreBreakdownProps {
  breakdown: MatchBreakdownItem[]
  total: number
}

const FACTOR_INFO: Record<string, { name: string; description: string; math: string }> = {
  S1: {
    name: 'Big Five Personality Alignment',
    description:
      'Compares your OCEAN traits against the historical figure, factoring in standard errors so uncertain traits don’t penalize your score.',
    math: 'Formula: Mahalanobis variance-weighted distance (30% total weight)',
  },
  S2: {
    name: 'Cognitive Tendencies (MBTI)',
    description:
      'Measures continuous agreement across all 4 MBTI axes (E/I, N/S, F/T, J/P) rather than treating personality as a rigid 4-letter box.',
    math: 'Formula: 1 - Mean absolute axis divergence (15% total weight)',
  },
  S3: {
    name: 'Shared Themes',
    description:
      'Measures the intersection between the personal life & career themes you selected and those present in this figure’s biography.',
    math: 'Formula: Jaccard set similarity |User ∩ Bio| / |User ∪ Bio| (20% total weight)',
  },
  S4: {
    name: 'Context & Adversity Overlap',
    description:
      'Evaluates shared challenges (e.g., exile, systemic resistance, early failure) and alignment with your current career phase.',
    math: 'Formula: Challenges Jaccard + career/era fit boost (20% total weight)',
  },
  S5: {
    name: 'Personal Goal Alignment',
    description:
      'Compares keywords and concepts from your personal goal statement against their biographical story.',
    math: 'Formula: Token overlap vs. biographical corpus (15% total weight)',
  },
}

/** Component bars: each w_k * S_k, with interactive explainability tooltips. */
export default function ScoreBreakdown({ breakdown, total }: ScoreBreakdownProps) {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null)
  const maxWeighted = Math.max(...breakdown.map((item) => item.weighted), 0.001)

  return (
    <div className="space-y-4">
      <ul className="space-y-3.5">
        {breakdown.map((item) => {
          const info = FACTOR_INFO[item.key]
          const isSelected = activeTooltip === item.key

          return (
            <li
              key={item.key}
              className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-3.5 transition hover:border-slate-700"
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="chip border-indigo-700/60 bg-indigo-950/40 text-xs font-bold text-indigo-300">
                    {item.key}
                  </span>
                  <span className="font-semibold text-slate-100">{item.label}</span>
                  <span className="rounded-md bg-slate-800/80 px-2 py-0.5 text-xs font-medium text-slate-400">
                    {(item.weight * 100).toFixed(0)}% weight
                  </span>
                  {info && (
                    <button
                      type="button"
                      onClick={() => setActiveTooltip(isSelected ? null : item.key)}
                      className={`inline-flex items-center justify-center rounded-full p-1 text-slate-400 transition hover:bg-slate-800 hover:text-indigo-300 focus-visible:ring-1 focus-visible:ring-indigo-400 ${
                        isSelected ? 'bg-indigo-900/60 text-indigo-300 ring-1 ring-indigo-500/50' : ''
                      }`}
                      title="Click for factor explanation"
                      aria-label={`Learn more about ${item.label}`}
                    >
                      <Info className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 tabular-nums text-xs text-slate-400">
                  <span>
                    Score: <strong className="text-slate-200">{(item.raw * 100).toFixed(0)}%</strong>
                  </span>
                  <span>·</span>
                  <span>
                    Contributes:{' '}
                    <strong className="text-indigo-300">+{item.weighted.toFixed(3)}</strong>
                  </span>
                </div>
              </div>

              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-400 transition-all duration-300"
                  style={{ width: `${(item.weighted / maxWeighted) * 100}%` }}
                />
              </div>

              <p className="mt-2 text-xs text-slate-400">{item.detail}</p>

              {/* Expandable Explanation Tooltip Card */}
              {isSelected && info && (
                <div className="mt-3 rounded-lg border border-indigo-500/30 bg-indigo-950/50 p-3 text-xs leading-relaxed text-indigo-200 animate-in fade-in slide-in-from-top-1">
                  <div className="mb-1 flex items-center gap-1.5 font-semibold text-white">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-400" aria-hidden="true" />
                    {info.name}
                  </div>
                  <p className="text-indigo-200/90">{info.description}</p>
                  <p className="mt-1.5 text-[11px] font-mono text-indigo-300/80">{info.math}</p>
                </div>
              )}
            </li>
          )
        })}

        <li className="flex items-baseline justify-between border-t border-slate-800 pt-3 text-sm font-semibold">
          <span className="text-slate-200">Final Weighted Match Score</span>
          <span className="tabular-nums text-lg text-indigo-400">
            {(total * 100).toFixed(0)}
            <span className="text-xs text-slate-500"> / 100 ({total.toFixed(3)})</span>
          </span>
        </li>
      </ul>

      <p className="text-center text-xs text-slate-500">
        Click the <Info className="inline h-3 w-3 text-slate-400" aria-hidden="true" /> icon beside any factor to see its scientific formulation and calculation criteria.
      </p>
    </div>
  )
}
