import { Info } from 'lucide-react'

/** Mandatory honest-framing disclosure shown on results surfaces. */
export default function Disclosure() {
  return (
    <div className="flex gap-3 rounded-xl border border-amber-700/50 bg-amber-950/30 p-4 text-sm text-amber-100/90">
      <Info className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <p>
        This is a <strong>self-reflection tool, not a clinical or hiring assessment</strong>. Your
        trait ranges come from a short quiz and carry real uncertainty. The role models' traits are{' '}
        <strong>AI-estimated from public text</strong>, so treat them as conversation starters, not
        measurements. Spotted a mistake? Every biography has a "report an error" link.
      </p>
    </div>
  )
}
