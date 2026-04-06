'use client'

import { useState, useEffect } from 'react'
import {
  Settings2, QrCode, Hash, CheckCircle2, Smartphone,
  Info, ExternalLink, Copy, Check, Loader2,
} from 'lucide-react'
import {
  DEFAULT_JOIN_CONFIG,
  DEFAULT_QR_SETTINGS,
  generateJoinCodeSync,
  type JoinConfig,
  type QRSettings,
} from '@/types/join'
import { AdminConfigService } from '@/lib/services/AdminConfigService'
import { SITE_HOST, toAbsoluteUrl } from '@/lib/site'
import { QRCodeSVG } from 'qrcode.react'

// ─── QR Code preview (SVG placeholder — replace with `qrcode.react` in Phase 9) ────
function QRPreview({
  joinCode,
  codeLength,
}: {
  joinCode: string
  codeLength: number
}) {
  const joinUrl = toAbsoluteUrl(`/join/${joinCode}`)

  return (
    <div className="flex flex-col items-center gap-4 p-8 glass-card rounded-3xl">
      {/* Real QR for the join URL */}
      <div className="relative w-48 h-48 bg-white rounded-2xl shadow-glass flex items-center justify-center overflow-hidden border-2 border-primary/20">
        <div className="absolute inset-0 flex items-center justify-center p-3">
          <QRCodeSVG
            value={joinUrl}
            size={168}
            bgColor="#ffffff"
            fgColor="#111111"
            level="M"
          />
        </div>

        {/* LiveZapp logo in centre (decorative overlay) */}
        <div className="z-10 w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-btn-primary pointer-events-none">
          <QrCode className="w-5 h-5 text-white" />
        </div>
      </div>

      {/* Branding CTA — good QR practice: always pair with clear context */}
      <div className="text-center space-y-1.5">
        <p className="text-xs font-bold uppercase tracking-widest text-text-secondary">
          Scan to join
        </p>
        <p className="text-2xl font-bold tracking-[0.2em] text-text-primary font-mono">
          {joinCode.slice(0, codeLength / 2)}&nbsp;{joinCode.slice(codeLength / 2)}
        </p>
        <p className="text-xs text-text-secondary">
          or visit{' '}
          <span className="text-primary font-semibold">{SITE_HOST}/join</span>
        </p>
      </div>

      {/* URL chip */}
      <div className="flex items-center gap-2 bg-white/60 border border-white/60 rounded-xl px-3 py-1.5 text-xs text-text-secondary max-w-full overflow-hidden">
        <ExternalLink className="w-3 h-3 shrink-0 text-primary" />
        <span className="truncate">{joinUrl}</span>
      </div>

      <p className="text-[10px] text-text-secondary text-center leading-relaxed max-w-xs">
        Best practice: display this QR on a slide or projector screen with the join URL
        and your session title visible alongside it.
      </p>
    </div>
  )
}

// ─── Main settings page ──────────────────────────────────────────────────

export default function AdminSettingsPage() {
  const [config, setConfig] = useState<JoinConfig>(DEFAULT_JOIN_CONFIG)
  const [qrSettings, setQrSettings] = useState<QRSettings>(DEFAULT_QR_SETTINGS)
  const [previewCode, setPreviewCode] = useState<string>(() =>
    generateJoinCodeSync(DEFAULT_JOIN_CONFIG.defaultCodeLength)
  )
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)

  // Load persisted config from RTDB on mount
  useEffect(() => {
    AdminConfigService.getConfig()
      .then(({ joinConfig, qrSettings: qr }) => {
        setConfig(joinConfig)
        setQrSettings(qr)
        setPreviewCode(generateJoinCodeSync(joinConfig.defaultCodeLength))
      })
      .catch(err => console.error('[AdminSettings] Failed to load config:', err))
      .finally(() => setIsLoading(false))
  }, [])

  // Regenerate the preview code whenever code length changes
  const handleCodeLengthChange = (len: number) => {
    setConfig(c => ({ ...c, defaultCodeLength: len }))
    setQrSettings(q => ({ ...q, codeLength: len }))
    setPreviewCode(generateJoinCodeSync(len))
  }

  const handleRegenerate = () => {
    setPreviewCode(generateJoinCodeSync(config.defaultCodeLength))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await AdminConfigService.saveConfig({ joinConfig: config, qrSettings })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error('[AdminSettings] Save failed:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCopyUrl = () => {
    const url = toAbsoluteUrl(`/join/${previewCode}`)
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary/60" />
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">
          Admin <span className="gradient-text">Settings</span>
        </h1>
        <p className="text-text-secondary text-sm mt-1">
          Configure join codes, QR display, and branding defaults for all sessions.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* ── Left: Configuration ───────────────────────────────── */}
        <div className="space-y-6">

          {/* Join code length */}
          <section className="glass-card p-7">
            <div className="flex items-center gap-3 mb-5">
              <div className="icon-bg-primary w-9 h-9 rounded-xl flex items-center justify-center">
                <Hash className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-text-primary">Join code length</h2>
                <p className="text-xs text-text-secondary">
                  Applies to all new sessions. Existing codes are unaffected.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mb-5">
              {config.allowedCodeLengths.map(len => (
                <button
                  key={len}
                  onClick={() => handleCodeLengthChange(len)}
                  className={`flex-1 py-3 rounded-2xl text-sm font-bold border transition-all duration-200 ${
                    config.defaultCodeLength === len
                      ? 'gradient-primary text-white border-transparent shadow-btn-primary'
                      : 'bg-white/60 text-text-primary border-white/60 hover:bg-primary/5 hover:border-primary/30'
                  }`}
                  aria-pressed={config.defaultCodeLength === len}
                >
                  {len} digits
                </button>
              ))}
            </div>

            <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 flex gap-3">
              <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div className="text-xs text-text-secondary leading-relaxed space-y-1">
                <p>
                  <strong className="text-text-primary">6 digits</strong> — easiest to type,
                  best for classrooms and small events (≤ 500 active sessions at once).
                </p>
                <p>
                  <strong className="text-text-primary">8 / 10 digits</strong> — lower collision
                  probability for large-scale or concurrent enterprise deployments.
                </p>
              </div>
            </div>
          </section>

          {/* QR settings */}
          <section className="glass-card p-7">
            <div className="flex items-center gap-3 mb-5">
              <div className="icon-bg-secondary w-9 h-9 rounded-xl flex items-center justify-center">
                <QrCode className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-text-primary">QR code settings</h2>
                <p className="text-xs text-text-secondary">
                  These defaults apply when generating session QR codes.
                </p>
              </div>
            </div>

            {/* Code length for QR (mirrors join config) */}
            <div className="mb-5">
              <label className="block text-xs font-semibold text-text-primary mb-2">
                Code length in QR
              </label>
              <div className="flex gap-3">
                {config.allowedCodeLengths.map(len => (
                  <button
                    key={len}
                    onClick={() => {
                      setQrSettings(q => ({ ...q, codeLength: len }))
                      setConfig(c => ({ ...c, defaultCodeLength: len }))
                      setPreviewCode(generateJoinCodeSync(len))
                    }}
                    className={`flex-1 py-2.5 rounded-2xl text-xs font-bold border transition-all duration-200 ${
                      qrSettings.codeLength === len
                        ? 'gradient-secondary text-white border-transparent'
                        : 'bg-white/60 text-text-primary border-white/60 hover:bg-secondary/5 hover:border-secondary/30'
                    }`}
                  >
                    {len}
                  </button>
                ))}
              </div>
            </div>

            {/* Display guidance */}
            <div className="space-y-3 border-t border-white/40 pt-4">
              <p className="text-xs font-semibold text-text-primary flex items-center gap-2">
                <Smartphone className="w-3.5 h-3.5 text-secondary" />
                QR display best practices
              </p>
              {[
                'Always show the join URL text alongside the QR — some phones block camera scanning in certain venues.',
                'Include your session title and a clear "Scan to join" call to action above the QR.',
                'Keep a white quiet zone (≥ 4 modules) around the QR for reliable scanning.',
                'For large rooms: use a minimum QR size of 10×10 cm on projected slides.',
              ].map((tip, i) => (
                <div key={i} className="flex gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-secondary/10 text-secondary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-xs text-text-secondary leading-relaxed">{tip}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn-primary w-full sm:w-auto disabled:opacity-60"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving…
              </>
            ) : saved ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-white" />
                Saved!
              </>
            ) : (
              <>
                <Settings2 className="w-4 h-4" />
                Save settings
              </>
            )}
          </button>
        </div>

        {/* ── Right: Live QR preview ────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-text-primary">QR preview</h2>
            <div className="flex gap-2">
              <button
                onClick={handleCopyUrl}
                className="btn-ghost text-xs flex items-center gap-1.5"
                title="Copy join URL"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-secondary" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy URL'}
              </button>
              <button
                onClick={handleRegenerate}
                className="btn-ghost text-xs"
              >
                ↻ New code
              </button>
            </div>
          </div>

          <QRPreview
            joinCode={previewCode}
            codeLength={config.defaultCodeLength}
          />

          <p className="text-[11px] text-text-secondary text-center">
            This preview updates live. The actual QR image is generated per session.
          </p>
        </div>
      </div>
    </div>
  )
}
