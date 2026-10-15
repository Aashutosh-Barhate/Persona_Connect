import type { MatchBreakdownItem } from '../types'

interface ScoreBreakdownProps {
  breakdown: MatchBreakdownItem[]
  total: number
}

/** Component bars: each w_k * S_k, ready to render as small bars. */
export default function ScoreBreakdown({ breakdown, total }: ScoreBreakdownProps) {
  const maxWeighted = Math.max(...breakdown.map((item) => item.weighted), 0.001)
  return (
    <ul className="space-y-3">
      {breakdown.map((item) => (
        <li key={item.key}>
          <div className="mb-1 flex items-baseline justify-between text-sm">
            <span className="font-medium text-slate-200">
              {item.label} <span className="text-slate-500">({item.key})</span>
            </span>
            <span className="tabular-nums text-slate-400">
              S={item.raw.toFixed(2)} · w={item.weight.toFixed(2)} · {item.weighted.toFixed(3)}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-400"
              style={{ width: `${(item.weighted / maxWeighted) * 100}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-slate-500">{item.detail}</p>
        </li>
      ))}
      <li className="flex items-baseline justify-between border-t border-slate-800 pt-2 text-sm font-semibold">
        <span className="text-slate-200">Total score</span>
        <span className="tabular-nums text-indigo-400">{total.toFixed(3)}</span>
      </li>
    </ul>
  )
}
