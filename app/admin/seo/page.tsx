'use client'

import { useState, useEffect } from 'react'
import { ref, get, set } from 'firebase/database'
import { rtdb } from '@/lib/firebase'
import { DEFAULT_ROBOTS_TXT, SITE_HOST, toAbsoluteUrl } from '@/lib/site'
import {
  Search, Globe, CheckCircle2, AlertCircle,
  Save, RefreshCw, Loader2, ExternalLink,
  Code, FileText,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SeoConfig {
  siteTitle:              string
  siteDescription:        string
  defaultOgImageUrl:      string
  googleVerification:     string
  bingVerification:       string
  ga4MeasurementId:       string
  robotsTxtContent:       string
  updatedAt:              string | null
  updatedBy:              string | null
}

const DEFAULT_CONFIG: SeoConfig = {
  siteTitle:              'LiveZapp — Real-Time Audience Engagement',
  siteDescription:        'Create polls, Q&A, word clouds and emoji reactions. Engage up to 2,000 participants live. No app needed. Free to start.',
  defaultOgImageUrl:      '',
  googleVerification:     '',
  bingVerification:       '',
  ga4MeasurementId:       '',
  robotsTxtContent:       DEFAULT_ROBOTS_TXT,
  updatedAt: null,
  updatedBy: null,
}

// ─── Field component ──────────────────────────────────────────────────────────

function Field({
  label, hint, value, onChange, multiline = false, mono = false, placeholder,
}: {
  label: string; hint?: string; value: string
  onChange: (v: string) => void; multiline?: boolean; mono?: boolean; placeholder?: string
}) {
  const style = {
    background: '#F9FAFB',
    border: '1px solid #E5E7EB',
    color: '#1A1A2E',
    fontFamily: mono ? 'monospace' : undefined,
    fontSize: mono ? '12px' : undefined,
    lineHeight: mono ? '1.6' : undefined,
  }
  return (
    <div>
      <label className="block text-xs font-semibold mb-1" style={{ color: '#374151' }}>{label}</label>
      {hint && <p className="text-[11px] mb-1.5" style={{ color: '#9CA3AF' }}>{hint}</p>}
      {multiline ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={mono ? 8 : 4}
          placeholder={placeholder}
          className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-y"
          style={style}
          onFocus={e => (e.currentTarget.style.borderColor = '#00A6A6')}
          onBlur={e  => (e.currentTarget.style.borderColor = '#E5E7EB')}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
          style={style}
          onFocus={e => (e.currentTarget.style.borderColor = '#00A6A6')}
          onBlur={e  => (e.currentTarget.style.borderColor = '#E5E7EB')}
        />
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminSeoPage() {
  const [config, setConfig]       = useState<SeoConfig>(DEFAULT_CONFIG)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving]   = useState(false)
  const [saved, setSaved]         = useState(false)
  const [error, setError]         = useState('')
  const [activeTab, setActiveTab] = useState<'meta' | 'analytics' | 'robots'>('meta')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setIsLoading(true)
    try {
      const snap = await get(ref(rtdb, 'seoConfig/main'))
      if (snap.exists()) setConfig({ ...DEFAULT_CONFIG, ...snap.val() })
    } catch (e) {
      console.error('[admin/seo] load failed', e)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSave() {
    setIsSaving(true)
    setError('')
    try {
      const toSave: SeoConfig = {
        ...config,
        updatedAt: new Date().toISOString(),
        updatedBy: 'admin',
      }
      await set(ref(rtdb, 'seoConfig/main'), toSave)
      setConfig(toSave)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e: any) {
      setError(e.message || 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  function set_<K extends keyof SeoConfig>(key: K, val: SeoConfig[K]) {
    setConfig(prev => ({ ...prev, [key]: val }))
  }

  const titleLen = config.siteTitle.length
  const descLen  = config.siteDescription.length

  const tabs = [
    { key: 'meta',      label: 'Meta & OG',    icon: FileText },
    { key: 'analytics', label: 'Analytics',     icon: Code     },
    { key: 'robots',    label: 'robots.txt',    icon: Globe    },
  ] as const

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 rounded-full animate-spin"
          style={{ borderColor: 'rgba(0,166,166,0.20)', borderTopColor: '#00A6A6' }} />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-12 max-w-3xl">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-2" style={{ color: '#9CA3AF' }}>Admin console</p>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: '#1A1A2E' }}>
            SEO <span style={{ color: '#00A6A6' }}>Configuration</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
            Global meta tags, analytics, and robots.txt settings
            {config.updatedAt && (
              <span> · Last saved {new Date(config.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            )}
          </p>
        </div>
        <div className="flex gap-2 self-start">
          <button onClick={loadData}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold"
            style={{ background: 'rgba(0,166,166,0.10)', color: '#00A6A6', border: '1px solid rgba(0,166,166,0.22)' }}>
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={handleSave} disabled={isSaving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: saved ? '#22C55E' : isSaving ? '#9CA3AF' : '#1A1A2E',
              color: '#FFFFFF',
              cursor: isSaving ? 'not-allowed' : 'pointer',
            }}>
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {isSaving ? 'Saving…' : saved ? 'Saved!' : 'Save changes'}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
          style={{ background: 'rgba(239,68,68,0.08)', color: '#DC2626', border: '1px solid rgba(239,68,68,0.15)' }}>
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl p-1" style={{ background: '#F3F4F6', width: 'fit-content' }}>
        {tabs.map(t => {
          const Icon = t.icon
          return (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
              style={activeTab === t.key
                ? { background: '#FFFFFF', color: '#1A1A2E', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }
                : { color: '#6B7280' }}>
              <Icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div className="rounded-2xl p-6 space-y-5"
        style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>

        {/* ── META & OG ── */}
        {activeTab === 'meta' && (
          <>
            <Field
              label="Site title"
              hint={`${titleLen}/60 characters recommended`}
              value={config.siteTitle}
              onChange={v => set_('siteTitle', v)}
              placeholder="LiveZapp — Real-Time Audience Engagement"
            />
            {titleLen > 60 && (
              <p className="text-xs" style={{ color: '#F08700' }}>Title exceeds recommended 60 characters</p>
            )}

            <Field
              label="Meta description"
              hint={`${descLen}/160 characters recommended`}
              value={config.siteDescription}
              onChange={v => set_('siteDescription', v)}
              multiline
              placeholder="Create polls, Q&A, word clouds and emoji reactions…"
            />
            {descLen > 160 && (
              <p className="text-xs" style={{ color: '#F08700' }}>Description exceeds recommended 160 characters</p>
            )}

            <Field
              label="Default OG image URL"
              hint="1200×630px image shown when pages are shared on social media"
              value={config.defaultOgImageUrl}
              onChange={v => set_('defaultOgImageUrl', v)}
              placeholder={toAbsoluteUrl('/og-image.png')}
            />

            {/* SERP preview */}
            <div className="rounded-xl p-4 space-y-1.5" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#9CA3AF' }}>SERP preview</p>
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-4 h-4 rounded-full" style={{ background: '#00A6A6' }} />
                <span className="text-xs" style={{ color: '#1A0A6B' }}>{SITE_HOST}</span>
              </div>
              <p className="text-base font-medium" style={{ color: '#1558D6' }}>
                {config.siteTitle || 'Page title'}
              </p>
              <p className="text-sm" style={{ color: '#4D5156' }}>
                {config.siteDescription || 'Page description will appear here…'}
              </p>
            </div>
          </>
        )}

        {/* ── ANALYTICS ── */}
        {activeTab === 'analytics' && (
          <>
            <Field
              label="GA4 Measurement ID"
              hint="Format: G-XXXXXXXXXX — injected into <head> on all public pages"
              value={config.ga4MeasurementId}
              onChange={v => set_('ga4MeasurementId', v)}
              mono
              placeholder="G-XXXXXXXXXX"
            />

            <Field
              label="Google Search Console verification"
              hint="The content value from the Google meta tag, e.g. abc123xyz"
              value={config.googleVerification}
              onChange={v => set_('googleVerification', v)}
              placeholder="abc123xyz"
            />

            <Field
              label="Bing Webmaster Tools verification"
              hint="The content value from the Bing meta tag"
              value={config.bingVerification}
              onChange={v => set_('bingVerification', v)}
              placeholder="def456uvw"
            />

            <div className="rounded-xl p-4 flex items-start gap-3"
              style={{ background: 'rgba(0,166,166,0.06)', border: '1px solid rgba(0,166,166,0.15)' }}>
              <ExternalLink className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#00A6A6' }} />
              <div className="text-xs space-y-1" style={{ color: '#374151' }}>
                <p className="font-semibold">How these values are used</p>
                <p>GA4 ID is injected via gtag.js. Verification codes are added as <code className="font-mono text-[11px] px-1 rounded" style={{ background: '#E5E7EB' }}>&lt;meta name="..."&gt;</code> tags in the page &lt;head&gt;. Changes take effect after the next deployment.</p>
              </div>
            </div>
          </>
        )}

        {/* ── ROBOTS.TXT ── */}
        {activeTab === 'robots' && (
          <>
            <Field
              label="robots.txt content"
              hint="Controls which pages search engines can crawl. Served at /robots.txt"
              value={config.robotsTxtContent}
              onChange={v => set_('robotsTxtContent', v)}
              multiline
              mono
            />

            <div className="rounded-xl p-4 flex items-start gap-3"
              style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#B45309' }} />
              <div className="text-xs space-y-1" style={{ color: '#374151' }}>
                <p className="font-semibold" style={{ color: '#B45309' }}>Important</p>
                <p>Always keep <code className="font-mono text-[11px] px-1 rounded" style={{ background: '#E5E7EB' }}>Disallow: /admin</code> and <code className="font-mono text-[11px] px-1 rounded" style={{ background: '#E5E7EB' }}>Disallow: /app</code> to prevent indexing of authenticated routes. The robots.txt is read from RTDB and served dynamically at runtime.</p>
              </div>
            </div>
          </>
        )}
      </div>

    </div>
  )
}
