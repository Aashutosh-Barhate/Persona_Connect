export function SkeletonCard() {
  return (
    <div className="card animate-pulse">
      <div className="h-5 w-1/3 rounded bg-slate-800" />
      <div className="mt-3 h-3 w-full rounded bg-slate-800/80" />
      <div className="mt-2 h-3 w-4/5 rounded bg-slate-800/80" />
      <div className="mt-4 flex gap-2">
        <div className="h-5 w-16 rounded-full bg-slate-800" />
        <div className="h-5 w-20 rounded-full bg-slate-800" />
      </div>
    </div>
  )
}

export default function Skeleton() {
  return <div className="h-64 animate-pulse rounded-2xl border border-slate-800 bg-slate-900/60" />
}
