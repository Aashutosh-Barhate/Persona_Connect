import { useState, useRef } from 'react'
import { X, Download, Share2, Check, Sparkles, UserCheck } from 'lucide-react'
import type { Match, Profile, TraitKey } from '../types'
import { TRAIT_LABELS, mbtiType } from '../api/client'

interface ShareCardModalProps {
  isOpen: boolean
  onClose: () => void
  matches: Match[]
  profile: Profile | null
}

const TRAIT_KEYS: TraitKey[] = ['O', 'C', 'E', 'A', 'N']

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number = 3
) {
  const words = text.split(' ')
  let line = ''
  let linesCount = 0

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' '
    const metrics = ctx.measureText(testLine)
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line.trim(), x, y)
      line = words[n] + ' '
      y += lineHeight
      linesCount++
      if (linesCount >= maxLines - 1 && n < words.length - 1) {
        let truncated = words.slice(n).join(' ')
        while (ctx.measureText(truncated + '...').width > maxWidth && truncated.length > 0) {
          truncated = truncated.slice(0, -1)
        }
        ctx.fillText(truncated.trim() + '...', x, y)
        return
      }
    } else {
      line = testLine
    }
  }
  ctx.fillText(line.trim(), x, y)
}

export default function ShareCardModal({
  isOpen,
  onClose,
  matches,
  profile,
}: ShareCardModalProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [downloading, setDownloading] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const cardPreviewRef = useRef<HTMLDivElement>(null)

  if (!isOpen || matches.length === 0) return null

  const selectedMatch = matches[selectedIndex] || matches[0]
  const scorePercent = Math.round(selectedMatch.score * 100)
  const derivedMbti = profile?.mbti ? mbtiType(profile.mbti) : 'INTJ'

  const generateCanvas = (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const width = 800
      const height = 1200
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) return resolve(null)

      // Background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, width, height)
      bgGrad.addColorStop(0, '#0a0d17')
      bgGrad.addColorStop(0.5, '#0f172a')
      bgGrad.addColorStop(1, '#1e1b4b')
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, width, height)

      // Ambient glow circles
      const glow1 = ctx.createRadialGradient(200, 250, 0, 200, 250, 400)
      glow1.addColorStop(0, 'rgba(99, 102, 241, 0.25)')
      glow1.addColorStop(1, 'rgba(99, 102, 241, 0)')
      ctx.fillStyle = glow1
      ctx.fillRect(0, 0, width, height)

      const glow2 = ctx.createRadialGradient(650, 850, 0, 650, 850, 350)
      glow2.addColorStop(0, 'rgba(168, 85, 247, 0.2)')
      glow2.addColorStop(1, 'rgba(168, 85, 247, 0)')
      ctx.fillStyle = glow2
      ctx.fillRect(0, 0, width, height)

      // Outer Card Frame
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.4)'
      ctx.lineWidth = 3
      if (typeof ctx.roundRect === 'function') {
        ctx.beginPath()
        ctx.roundRect(40, 40, width - 80, height - 80, 28)
        ctx.stroke()
      } else {
        ctx.strokeRect(40, 40, width - 80, height - 80)
      }

      // Header: Brand
      ctx.textAlign = 'center'
      ctx.fillStyle = '#818cf8'
      ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      ctx.letterSpacing = '4px'
      ctx.fillText('PERSONA - CONNECT', width / 2, 95)

      ctx.fillStyle = '#94a3b8'
      ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      ctx.letterSpacing = '1px'
      ctx.fillText('AI PERSONALITY & HISTORICAL ROLE MODEL PROFILE', width / 2, 122)

      // Divider line
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(80, 145)
      ctx.lineTo(width - 80, 145)
      ctx.stroke()

      // Section 1: Personality Archetype
      ctx.textAlign = 'left'
      ctx.fillStyle = '#64748b'
      ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      ctx.letterSpacing = '2px'
      ctx.fillText('MY PERSONALITY ARCHETYPE', 80, 185)

      // MBTI badge
      ctx.fillStyle = 'rgba(99, 102, 241, 0.15)'
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.5)'
      ctx.lineWidth = 1.5
      if (typeof ctx.roundRect === 'function') {
        ctx.beginPath()
        ctx.roundRect(80, 205, 120, 44, 12)
        ctx.fill()
        ctx.stroke()
      }
      ctx.fillStyle = '#c7d2fe'
      ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(derivedMbti, 140, 235)

      // Ocean Trait Mini Bars
      if (profile?.traits) {
        ctx.textAlign = 'left'
        TRAIT_KEYS.forEach((trait, i) => {
          const val = profile.traits[trait] || 50
          const barY = 280 + i * 44
          ctx.fillStyle = '#cbd5e1'
          ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          ctx.fillText(TRAIT_LABELS[trait], 80, barY)

          ctx.textAlign = 'right'
          ctx.fillStyle = '#818cf8'
          ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          ctx.fillText(`${Math.round(val)}%`, width - 80, barY)
          ctx.textAlign = 'left'

          // Track
          ctx.fillStyle = '#1e293b'
          if (typeof ctx.roundRect === 'function') {
            ctx.beginPath()
            ctx.roundRect(80, barY + 8, width - 160, 8, 4)
            ctx.fill()
          }

          // Fill
          const fillWidth = ((width - 160) * Math.min(100, Math.max(0, val))) / 100
          const barGrad = ctx.createLinearGradient(80, 0, 80 + fillWidth, 0)
          barGrad.addColorStop(0, '#6366f1')
          barGrad.addColorStop(1, '#a855f7')
          ctx.fillStyle = barGrad
          if (typeof ctx.roundRect === 'function') {
            ctx.beginPath()
            ctx.roundRect(80, barY + 8, fillWidth, 8, 4)
            ctx.fill()
          }
        })
      }

      // Divider line
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)'
      ctx.beginPath()
      ctx.moveTo(80, 520)
      ctx.lineTo(width - 80, 520)
      ctx.stroke()

      // Section 2: Role Model Match Hero Box
      ctx.fillStyle = '#64748b'
      ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      ctx.letterSpacing = '2px'
      ctx.fillText('TOP ROLE MODEL COUNTERPART', 80, 555)

      // Hero Container Box
      ctx.fillStyle = 'rgba(30, 41, 59, 0.6)'
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.3)'
      ctx.lineWidth = 1.5
      if (typeof ctx.roundRect === 'function') {
        ctx.beginPath()
        ctx.roundRect(80, 575, width - 160, 480, 20)
        ctx.fill()
        ctx.stroke()
      }

      // Match Score Badge (glowing pill)
      ctx.fillStyle = 'rgba(16, 185, 129, 0.15)'
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)'
      ctx.lineWidth = 1.5
      if (typeof ctx.roundRect === 'function') {
        ctx.beginPath()
        ctx.roundRect(110, 605, 140, 36, 18)
        ctx.fill()
        ctx.stroke()
      }
      ctx.textAlign = 'center'
      ctx.fillStyle = '#34d399'
      ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      ctx.fillText(`${scorePercent}% MATCH`, 180, 629)

      // Role model name
      ctx.textAlign = 'left'
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      ctx.fillText(selectedMatch.biography.name, 110, 685)

      // Domain & Origin
      ctx.fillStyle = '#a5b4fc'
      ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      const meta = `${selectedMatch.biography.domain.toUpperCase()} · ${selectedMatch.biography.nationality}${
        selectedMatch.biography.birthYear ? ` (b. ${selectedMatch.biography.birthYear})` : ''
      }`
      ctx.fillText(meta, 110, 715)

      // Rationale Box
      ctx.fillStyle = 'rgba(15, 23, 42, 0.8)'
      if (typeof ctx.roundRect === 'function') {
        ctx.beginPath()
        ctx.roundRect(110, 740, width - 220, 160, 12)
        ctx.fill()
      }

      ctx.fillStyle = '#e2e8f0'
      ctx.font = 'italic 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      wrapCanvasText(
        ctx,
        `"${selectedMatch.explanation.text}"`,
        130,
        775,
        width - 260,
        26,
        4
      )

      // Shared Qualities / Domains Tags
      const tags = (selectedMatch.explanation.sharedDomains || []).slice(0, 3)
      if (tags.length > 0) {
        let tagX = 110
        ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        tags.forEach((tag) => {
          const tagLabel = tag.replace(/-/g, ' ').toUpperCase()
          const textWidth = ctx.measureText(tagLabel).width
          const pillWidth = textWidth + 24

          ctx.fillStyle = 'rgba(99, 102, 241, 0.2)'
          ctx.strokeStyle = 'rgba(99, 102, 241, 0.4)'
          ctx.lineWidth = 1
          if (typeof ctx.roundRect === 'function') {
            ctx.beginPath()
            ctx.roundRect(tagX, 920, pillWidth, 28, 14)
            ctx.fill()
            ctx.stroke()
          }
          ctx.fillStyle = '#c7d2fe'
          ctx.fillText(tagLabel, tagX + 12, 938)
          tagX += pillWidth + 12
        })
      }

      // Footer
      ctx.textAlign = 'center'
      ctx.fillStyle = '#64748b'
      ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      ctx.fillText('Find your historical role model at personaconnect.app', width / 2, 1120)

      canvas.toBlob((blob) => resolve(blob), 'image/png')
    })
  }

  const handleDownloadImage = async () => {
    try {
      setDownloading(true)
      const blob = await generateCanvas()
      if (!blob) return

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const sanitizedName = selectedMatch.biography.name.toLowerCase().replace(/[^a-z0-9]/g, '-')
      a.href = url
      a.download = `persona-connect-${sanitizedName}-card.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Download failed', err)
    } finally {
      setDownloading(false)
    }
  }

  const handleCopyLink = async () => {
    try {
      const shareUrl = window.location.href
      await navigator.clipboard.writeText(shareUrl)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2500)
    } catch (err) {
      console.error('Copy link failed', err)
    }
  }

  const handleNativeShare = async () => {
    try {
      const blob = await generateCanvas()
      if (!blob) return

      const file = new File(
        [blob],
        `persona-connect-${selectedMatch.biography.name}.png`,
        { type: 'image/png' }
      )

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `My Persona-Connect Match: ${selectedMatch.biography.name}`,
          text: `I matched ${scorePercent}% with ${selectedMatch.biography.name}! Discover your role model on Persona-Connect.`,
          files: [file],
        })
      } else {
        // Fallback to download
        handleDownloadImage()
      }
    } catch (err) {
      console.error('Share failed', err)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-slate-700/80 bg-slate-950 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
          aria-label="Close dialog"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-6">
          <div className="flex items-center gap-2 text-indigo-400">
            <Sparkles className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-widest">Shareable Profile Card</span>
          </div>
          <h2 className="mt-1 text-2xl font-extrabold text-white">Choose a match & create your card</h2>
          <p className="mt-1 text-sm text-slate-400">
            Select which role model you want to feature on your vertical story card, then download as an image or share.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-12">
          {/* Controls Column */}
          <div className="space-y-6 lg:col-span-5">
            <div>
              <label className="label text-slate-200">Select Role Model to Feature:</label>
              <div className="space-y-2">
                {matches.slice(0, 5).map((match, idx) => {
                  const isSelected = idx === selectedIndex
                  const pct = Math.round(match.score * 100)
                  return (
                    <button
                      key={match.biography.id}
                      type="button"
                      onClick={() => setSelectedIndex(idx)}
                      className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-950/60 shadow-lg shadow-indigo-950/50'
                          : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${
                            isSelected
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          #{idx + 1}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-white">
                            {match.biography.name}
                          </div>
                          <div className="text-xs text-slate-400 capitalize">
                            {match.biography.domain}
                          </div>
                        </div>
                      </div>
                      <span className="tabular-nums text-sm font-extrabold text-emerald-400">
                        {pct}%
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={handleDownloadImage}
                disabled={downloading}
                className="btn-primary w-full py-3 text-sm shadow-lg shadow-indigo-600/25"
              >
                <Download className="h-4 w-4" />
                <span>{downloading ? 'Generating Image...' : 'Download Card Image (PNG)'}</span>
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="btn-ghost flex-1 py-2.5 text-xs font-semibold"
                >
                  <Share2 className="h-4 w-4 text-indigo-400" />
                  <span>Share Story</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="btn-ghost flex-1 py-2.5 text-xs font-semibold"
                >
                  {copiedLink ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-400" />
                      <span className="text-emerald-300">Link Copied!</span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-4 w-4 text-slate-400" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Vertical Card Preview Column */}
          <div className="flex justify-center lg:col-span-7">
            <div
              ref={cardPreviewRef}
              className="relative aspect-[9/14] w-full max-w-[340px] overflow-hidden rounded-2xl border border-indigo-500/40 bg-gradient-to-b from-slate-900 via-slate-950 to-indigo-950/70 p-5 shadow-2xl shadow-indigo-950/40 flex flex-col justify-between"
            >
              {/* Background ambient accents */}
              <div className="pointer-events-none absolute -left-12 -top-12 h-44 w-44 rounded-full bg-indigo-500/15 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-12 -right-12 h-44 w-44 rounded-full bg-purple-500/15 blur-3xl" />

              {/* Header */}
              <div>
                <div className="text-center">
                  <div className="text-[11px] font-extrabold uppercase tracking-widest text-indigo-400">
                    PERSONA-CONNECT
                  </div>
                  <div className="text-[9px] uppercase tracking-wider text-slate-400">
                    AI Personality & Role Model Profile
                  </div>
                </div>

                <div className="my-3 border-t border-slate-800/80" />

                {/* Personality Block */}
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Personality Archetype
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="rounded-md border border-indigo-500/40 bg-indigo-900/40 px-2.5 py-0.5 font-mono text-sm font-bold text-indigo-300">
                      {derivedMbti}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {profile?.lifeStage || 'Explorer'}
                    </span>
                  </div>

                  {/* Ocean Bars preview */}
                  {profile?.traits && (
                    <div className="mt-2 space-y-1.5">
                      {TRAIT_KEYS.slice(0, 3).map((trait) => (
                        <div key={trait}>
                          <div className="flex justify-between text-[10px] text-slate-300">
                            <span>{TRAIT_LABELS[trait]}</span>
                            <span className="font-semibold text-indigo-300">
                              {Math.round(profile.traits[trait])}%
                            </span>
                          </div>
                          <div className="h-1 w-full overflow-hidden rounded-full bg-slate-800">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-400"
                              style={{ width: `${profile.traits[trait]}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Role Model Block (The Hero) */}
              <div className="my-2 rounded-xl border border-indigo-500/30 bg-slate-900/80 p-3.5 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <span className="rounded-full border border-emerald-500/40 bg-emerald-950/60 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                    {scorePercent}% MATCH
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">
                    #{selectedIndex + 1} Role Model
                  </span>
                </div>

                <div className="mt-2 text-lg font-extrabold text-white">
                  {selectedMatch.biography.name}
                </div>
                <div className="text-[11px] text-indigo-300 capitalize">
                  {selectedMatch.biography.domain} · {selectedMatch.biography.nationality}
                </div>

                <p className="mt-2 line-clamp-3 text-[11px] italic leading-relaxed text-slate-300">
                  "{selectedMatch.explanation.text}"
                </p>

                {selectedMatch.explanation.sharedDomains?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {selectedMatch.explanation.sharedDomains.slice(0, 2).map((d) => (
                      <span
                        key={d}
                        className="rounded-full bg-indigo-950/80 border border-indigo-800/60 px-1.5 py-0.5 text-[9px] font-medium text-indigo-200"
                      >
                        {d.replace(/-/g, ' ')}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Watermark Footer */}
              <div className="text-center text-[10px] text-slate-400">
                Discover yours at <strong className="text-slate-300">personaconnect.app</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

