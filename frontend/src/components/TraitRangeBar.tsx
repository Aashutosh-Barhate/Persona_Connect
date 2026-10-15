import type { Biography } from '../types'
import { themeLabel, challengeLabel } from '../data/mockData'

interface TraitRangeBarProps {
  label: string
  value: number
  sd: number
  blurb?: string
  compare?: { name: string; value: number } | null
}

/** A 0-100 trait bar drawn as a RANGE (mean +/- 1.28 sd), never a false point. */
export default function TraitRangeBar({ label, value, sd, blurb, compare }: TraitRangeBarProps) {
  const low = Math.max(0, value - 1.28 * sd)
  const high = Math.min(100, value + 1.28 * sd)

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-sm">
        <span className="font-semibold text-slate-200">{label}</span>
        <span className="tabular-nums text-slate-400">
          {value} <span className="text-slate-600">+/- {sd.toFixed(1)}</span>
        </span>
      </div>
      <div className="relative h-6 rounded-lg bg-slate-800/80">
        {/* uncertainty band */}
        <div
          className="absolute inset-y-1 rounded-md bg-indigo-500/25"
          style={{ left: `${low}%`, width: `${Math.max(high - low, 1)}%` }}
        />
        {/* mean marker */}
        <div
          className="absolute inset-y-0.5 w-1 rounded-full bg-indigo-400"
          style={{ left: `calc(${value}% - 2px)` }}
          title={`${label}: ${value}`}
        />
        {/* comparison marker (a role model) */}
        {compare && (
          <div
            className="absolute inset-y-0.5 w-1 rounded-full bg-amber-400"
            style={{ left: `calc(${compare.value}% - 2px)` }}
            title={`${compare.name}: ${compare.value}`}
          />
        )}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-slate-600">
        <span>0</span>
        {blurb && <span className="px-2 text-center text-slate-500">{blurb}</span>}
        <span>100</span>
      </div>
    </div>
  )
}

interface BiographyChipsProps {
  biography: Biography
}

export function BiographyChips({ biography }: BiographyChipsProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <span className="chip capitalize">{biography.domain}</span>
      {biography.themes.slice(0, 3).map((theme) => (
        <span key={theme} className="chip">
          {themeLabel(theme)}
        </span>
      ))}
      {biography.challenges.slice(0, 3).map((challenge) => (
        <span key={challenge} className="chip border-amber-700/60 text-amber-200/90">
          {challengeLabel(challenge)}
        </span>
      ))}
    </div>
  )
}
