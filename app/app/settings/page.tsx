'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Palette, Image as ImageIcon, Type, Eye, Save, Lock,
  CheckCircle2, AlertCircle, Zap, ArrowRight, RefreshCw,
  Upload, Trash2, X, User, CreditCard, Info, AlertTriangle,
  CheckCircle, TrendingUp, Calendar, Phone, MapPin,
} from 'lucide-react'
import Link from 'next/link'
import { ref, update, get } from 'firebase/database'
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { rtdb, storage } from '@/lib/firebase'
import { useAuth } from '@/lib/hooks/useAuth'
import { BrandingService } from '@/lib/services/BrandingService'
import { PLANS } from '@/types/plans'
import type { BrandingConfig } from '@/types/domain'
import { DEFAULT_BRANDING } from '@/types/domain'

// ─── Tab type ─────────────────────────────────────────────────────────────────
type Tab = 'profile' | 'subscription' | 'branding'

// ─── Country list (sorted A-Z, common ones duplicated in the optgroup above) ──
const COUNTRIES = [
  'Afghanistan','Albania','Algeria','Argentina','Armenia','Australia','Austria',
  'Azerbaijan','Bahrain','Bangladesh','Belgium','Bolivia','Bosnia and Herzegovina',
  'Brazil','Bulgaria','Cambodia','Cameroon','Canada','Chile','China','Colombia',
  'Costa Rica','Croatia','Cuba','Cyprus','Czech Republic','Denmark','Ecuador',
  'Egypt','Estonia','Ethiopia','Finland','France','Georgia','Germany','Ghana',
  'Greece','Guatemala','Honduras','Hong Kong','Hungary','Iceland','India',
  'Indonesia','Iran','Iraq','Ireland','Israel','Italy','Jamaica','Japan','Jordan',
  'Kazakhstan','Kenya','Kuwait','Latvia','Lebanon','Lithuania','Luxembourg',
  'Malaysia','Mexico','Moldova','Morocco','Myanmar','Nepal','Netherlands',
  'New Zealand','Nigeria','North Macedonia','Norway','Oman','Pakistan','Panama',
  'Paraguay','Peru','Philippines','Poland','Portugal','Qatar','Romania','Russia',
  'Saudi Arabia','Senegal','Serbia','Singapore','Slovakia','Slovenia','South Africa',
  'South Korea','Spain','Sri Lanka','Sweden','Switzerland','Taiwan','Tanzania',
  'Thailand','Tunisia','Turkey','Uganda','Ukraine','United Arab Emirates',
  'United Kingdom','United States','Uruguay','Uzbekistan','Venezuela','Vietnam',
  'Yemen','Zimbabwe',
].sort()

// ─── UK postcode lookup button ────────────────────────────────────────────────
function UKPostcodeLookup({ postcode, onResult }: {
  postcode: string
  onResult: (r: { city: string; county: string }) => void
}) {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const lookup = async () => {
    const clean = postcode.replace(/\s/g, '').toUpperCase()
    if (!clean) return
    setLoading(true); setError('')
    try {
      const res  = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(clean)}`)
      const data = await res.json()
      if (!res.ok || data.status !== 200) throw new Error('Postcode not found')
      const r = data.result
      onResult({
        city:   r.admin_district || r.parliamentary_constituency || r.region || '',
        county: r.admin_county   || r.region || '',
      })
    } catch {
      setError('Not found')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={lookup}
        disabled={loading || !postcode.trim()}
        className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 whitespace-nowrap"
        style={{ background: 'rgba(0,166,166,0.10)', color: '#00A6A6', border: '1px solid rgba(0,166,166,0.25)' }}
      >
        {loading ? '…' : 'Look up'}
      </button>
      {error && <p className="text-[10px] text-red-500">{error}</p>}
    </div>
  )
}

// ─── Accent colour presets ────────────────────────────────────────────────────
const ACCENT_PRESETS = [
  { label: 'Electric Blue', value: '#5478FF' },
  { label: 'Sky Cyan',      value: '#53CBF3' },
  { label: 'Volt Yellow',   value: '#FFDE42' },
  { label: 'Emerald',       value: '#22C55E' },
  { label: 'Rose',          value: '#F43F5E' },
  { label: 'Violet',        value: '#8B5CF6' },
  { label: 'Amber',         value: '#F59E0B' },
  { label: 'Slate',         value: '#94A3B8' },
]

// ─── Shared field style ───────────────────────────────────────────────────────
const fieldBase = {
  background: '#FFFFFF',
  border: '1px solid rgba(0,0,0,0.12)',
  color: '#111111',
  width: '100%',
  padding: '11px 14px',
  borderRadius: 12,
  fontSize: 14,
  outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
} as React.CSSProperties

function FieldInput({
  label, id, disabled, hint, ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; id: string; hint?: string; disabled?: boolean }) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B7280' }}>
        {label}
      </label>
      <input
        id={id}
        disabled={disabled}
        style={{ ...fieldBase, opacity: disabled ? 0.45 : 1, cursor: disabled ? 'not-allowed' : 'text' }}
        onFocus={e => { if (!disabled) { e.currentTarget.style.borderColor = '#00A6A6'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,166,166,0.10)' } }}
        onBlur={e  => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.12)'; e.currentTarget.style.boxShadow = 'none' }}
        {...rest}
      />
      {hint && <p className="text-[10px] mt-1" style={{ color: '#9CA3AF' }}>{hint}</p>}
    </div>
  )
}

// ─── Participant preview ──────────────────────────────────────────────────────
function ParticipantPreview({ branding }: { branding: BrandingConfig }) {
  const accent = branding.accentColor || '#00A6A6'
  const hasLogo = branding.logoUrl.trim().length > 0
  const hasName = branding.brandName.trim().length > 0

  return (
    <div className="rounded-2xl overflow-hidden border" style={{ background: '#0D1117', borderColor: 'rgba(255,255,255,0.08)' }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-2.5">
          {hasLogo ? (
            <img src={branding.logoUrl} alt="Brand logo" className="h-7 w-auto object-contain rounded" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
          ) : (
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: accent + '22', border: `1px solid ${accent}44` }}>
              <Zap className="w-3.5 h-3.5" style={{ color: accent }} />
            </div>
          )}
          <span className="text-sm font-semibold text-white/80">{hasName ? branding.brandName : 'Your Brand'}</span>
        </div>
        <div className="text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-md" style={{ background: accent + '20', color: accent, border: `1px solid ${accent}40` }}>
          Live
        </div>
      </div>
      <div className="p-4 space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: accent }}>Question 1 of 5</p>
        <p className="text-sm font-semibold text-white/85 leading-snug">Which feature do you use most often?</p>
        <div className="space-y-2">
          {['Live Polls', 'Quizzes', 'Q&A Sessions', 'Word Clouds'].map((opt, i) => (
            <div key={opt} className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-all"
              style={{ background: i === 1 ? accent + '18' : 'rgba(255,255,255,0.04)', border: `1px solid ${i === 1 ? accent + '50' : 'rgba(255,255,255,0.07)'}`, color: i === 1 ? '#fff' : 'rgba(255,255,255,0.60)' }}>
              <span className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-bold"
                style={{ background: i === 1 ? accent : 'rgba(255,255,255,0.08)', color: i === 1 ? '#fff' : undefined }}>
                {String.fromCharCode(65 + i)}
              </span>
              {opt}
            </div>
          ))}
        </div>
        <button className="w-full py-2 rounded-xl text-xs font-bold mt-1" style={{ background: accent, color: '#fff' }}>Submit Answer</button>
      </div>
      {branding.showPoweredBy && (
        <div className="px-4 py-2 text-center text-[9px] text-white/20" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          Powered by <span className="text-white/35 font-semibold">LiveZapp</span>
        </div>
      )}
    </div>
  )
}

// ─── Client-side image compression ───────────────────────────────────────────
async function compressToWebP(file: File, maxWidth = 640, quality = 0.82): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxWidth / img.width)
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, w, h)
      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('Compression failed')),
        'image/webp',
        quality,
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Invalid image')) }
    img.src = url
  })
}

// ─── Locked overlay ───────────────────────────────────────────────────────────
function LockedOverlay() {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl" style={{ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(4px)' }}>
      <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-3" style={{ background: 'rgba(0,166,166,0.10)', border: '1px solid rgba(0,166,166,0.25)' }}>
        <Lock className="w-5 h-5" style={{ color: '#00A6A6' }} />
      </div>
      <p className="text-sm font-bold text-[#111111] mb-1">Paid plan required</p>
      <p className="text-xs text-[#6B7280] text-center mb-4 max-w-[200px]">Custom branding is available on Basic and above</p>
      <Link href="/plans" className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl" style={{ background: '#00A6A6', color: '#fff' }}>
        Upgrade plan <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  )
}

// ─── Main page (wrapped for useSearchParams) ──────────────────────────────────
function SettingsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()
  const plan      = PLANS.find(p => p.id === user?.planId) ?? PLANS[0]
  const canBrand  = plan.features.canUseBranding
  const fileInputRef = useRef<HTMLInputElement>(null)

  const tabParam = searchParams.get('tab') as Tab | null
  const [activeTab, setActiveTab] = useState<Tab>(tabParam ?? 'profile')

  useEffect(() => {
    if (tabParam && ['profile', 'subscription', 'branding'].includes(tabParam)) {
      setActiveTab(tabParam as Tab)
    }
  }, [tabParam])

  const switchTab = (tab: Tab) => {
    setActiveTab(tab)
    router.replace(`/app/settings?tab=${tab}`, { scroll: false })
  }

  // ── Profile state ────────────────────────────────────────────────────────
  const [profile, setProfile] = useState({
    fullName: '', phone: '', dateOfBirth: '',
    addressLine1: '', addressLine2: '', city: '', state: '', postalCode: '', country: '',
  })
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaved,  setProfileSaved]  = useState(false)
  const [profileError,  setProfileError]  = useState('')

  useEffect(() => {
    if (!user) return
    get(ref(rtdb, `users/${user.id}/profile`)).then(snap => {
      if (snap.exists()) {
        const d = snap.val()
        setProfile({
          fullName:     d.fullName     ?? user.name ?? '',
          phone:        d.phone        ?? '',
          dateOfBirth:  d.dateOfBirth  ?? '',
          addressLine1: d.addressLine1 ?? '',
          addressLine2: d.addressLine2 ?? '',
          city:         d.city         ?? '',
          state:        d.state        ?? '',
          postalCode:   d.postalCode   ?? '',
          country:      d.country      ?? '',
        })
      } else {
        setProfile(prev => ({ ...prev, fullName: user.name ?? '' }))
      }
    })
  }, [user])

  const handleProfileSave = async () => {
    if (!user || !profile.fullName.trim()) {
      setProfileError('Full name is required.')
      return
    }
    setProfileSaving(true)
    setProfileError('')
    try {
      await update(ref(rtdb, `users/${user.id}/profile`), profile)
      // Also update display name in root user record
      await update(ref(rtdb, `users/${user.id}`), { name: profile.fullName.trim() })
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 3000)
    } catch {
      setProfileError('Failed to save. Please try again.')
    } finally {
      setProfileSaving(false)
    }
  }

  // ── Subscription state ────────────────────────────────────────────────────
  const [cancelConfirm, setCancelConfirm] = useState(false)
  const [cancelDone,    setCancelDone]    = useState(false)
  const [cancelError,   setCancelError]   = useState('')

  const isPlanExpired =
    plan.pricePerMonth > 0 &&
    !!user?.planExpiresAt &&
    new Date(user.planExpiresAt) < new Date()

  const isCancelled = !!user?.planCancelledAt && !isPlanExpired

  const handleCancel = async () => {
    if (!user) return
    try {
      await update(ref(rtdb, `users/${user.id}`), {
        planCancelledAt: new Date().toISOString(),
      })
      setCancelDone(true)
      setCancelConfirm(false)
    } catch {
      setCancelError('Failed to cancel. Please try again or contact support.')
    }
  }

  const handleReactivate = async () => {
    if (!user) return
    await update(ref(rtdb, `users/${user.id}`), { planCancelledAt: null })
    setCancelDone(false)
  }

  // ── Branding state ────────────────────────────────────────────────────────
  const [branding,      setBranding]      = useState<BrandingConfig>({ ...DEFAULT_BRANDING })
  const [brandSaved,    setBrandSaved]    = useState(false)
  const [brandSaving,   setBrandSaving]   = useState(false)
  const [loadError,     setLoadError]     = useState(false)
  const [uploading,     setUploading]     = useState(false)
  const [uploadError,   setUploadError]   = useState('')
  const [uploadSuccess, setUploadSuccess] = useState(false)

  useEffect(() => {
    if (!user) return
    BrandingService.getBranding(user.id)
      .then(b => setBranding(b))
      .catch(() => setLoadError(true))
  }, [user])

  const updateBrand = (patch: Partial<BrandingConfig>) => {
    if (!canBrand) return
    setBrandSaved(false)
    setBranding(prev => ({ ...prev, ...patch }))
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploadError(''); setUploadSuccess(false); setUploading(true)
    try {
      // Compress raster images client-side before uploading
      let uploadBlob: Blob
      let storageName: string
      if (file.type === 'image/svg+xml') {
        uploadBlob = file
        storageName = 'logo.svg'
      } else {
        uploadBlob = await compressToWebP(file)
        storageName = 'logo.webp'
      }
      // Upload to Firebase Storage at logos/{userId}/logo.webp
      const logoRef = storageRef(storage, `logos/${user.id}/${storageName}`)
      await uploadBytes(logoRef, uploadBlob, { contentType: uploadBlob.type || 'image/webp', cacheControl: 'public,max-age=31536000' })
      const downloadUrl = await getDownloadURL(logoRef)
      updateBrand({ logoUrl: downloadUrl })
      setUploadSuccess(true)
      setTimeout(() => setUploadSuccess(false), 3000)
    } catch (err: any) {
      setUploadError(err.message ?? 'Upload failed')
    } finally {
      setUploading(false); e.target.value = ''
    }
  }

  const handleBrandSave = async () => {
    if (!user || !canBrand) return
    setBrandSaving(true)
    try {
      await BrandingService.saveBranding(user.id, branding)
      setBrandSaved(true)
      setTimeout(() => setBrandSaved(false), 3000)
    } catch { setLoadError(true) }
    finally { setBrandSaving(false) }
  }

  const itemVars = {
    hidden:  { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { ease: 'easeOut', duration: 0.3 } },
  }

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{className?: string}> }[] = [
    { id: 'profile',      label: 'My Profile',   icon: User       },
    { id: 'subscription', label: 'Subscription', icon: CreditCard },
    { id: 'branding',     label: 'Brand Identity', icon: Palette  },
  ]

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } }}
      className="max-w-4xl space-y-6 pb-16"
    >
      {/* Page header */}
      <motion.div variants={itemVars}>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-1" style={{ color: '#9CA3AF' }}>Account</p>
        <h1 className="font-display text-3xl font-bold tracking-tight" style={{ color: '#111111' }}>Settings</h1>
      </motion.div>

      {/* Tab bar */}
      <motion.div
        variants={itemVars}
        className="flex gap-1 p-1 rounded-2xl"
        style={{ background: '#F3F4F6' }}
      >
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => switchTab(id)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={
              activeTab === id
                ? { background: '#FFFFFF', color: '#111111', boxShadow: '0 1px 4px rgba(0,0,0,0.10)' }
                : { color: '#6B7280' }
            }
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </motion.div>

      {/* ══════════════════════════════════════════════════════════════════
          PROFILE TAB
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'profile' && (
        <motion.div variants={itemVars} className="space-y-5">
          <div className="glass-card p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center icon-bg-primary">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold" style={{ color: '#111111' }}>Personal details</h2>
                <p className="text-xs" style={{ color: '#6B7280' }}>Displayed on your invoices and account</p>
              </div>
            </div>

            {profileError && (
              <div className="flex items-center gap-2 text-xs px-3 py-2.5 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', color: '#DC2626', border: '1px solid rgba(239,68,68,0.18)' }}>
                <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {profileError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldInput
                label="Full Name" id="fullName" required
                placeholder="John Smith"
                value={profile.fullName}
                onChange={e => setProfile(p => ({ ...p, fullName: e.target.value }))}
              />
              <FieldInput
                label="Email address" id="email"
                value={user?.email ?? ''}
                disabled
                hint="Email address cannot be changed"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldInput
                label="Phone number" id="phone" type="tel"
                placeholder="+91 98765 43210"
                value={profile.phone}
                onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
              />
              <FieldInput
                label="Date of birth" id="dob" type="date"
                value={profile.dateOfBirth}
                onChange={e => setProfile(p => ({ ...p, dateOfBirth: e.target.value }))}
              />
            </div>
          </div>

          {/* Address */}
          <div className="glass-card p-6 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center icon-bg-secondary">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold" style={{ color: '#111111' }}>Billing address</h2>
                <p className="text-xs" style={{ color: '#6B7280' }}>Used for payment receipts</p>
              </div>
            </div>

            {/* Country — first so postcode lookup knows which behaviour to apply */}
            <div>
              <label htmlFor="country" className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B7280' }}>Country</label>
              <select
                id="country"
                value={profile.country}
                onChange={e => setProfile(p => ({ ...p, country: e.target.value }))}
                style={{ ...fieldBase }}
                onFocus={e => { e.currentTarget.style.borderColor = '#00A6A6'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,166,166,0.10)' }}
                onBlur={e  => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.12)'; e.currentTarget.style.boxShadow = 'none' }}
              >
                <option value="">Select country…</option>
                <optgroup label="Common">
                  {['United Kingdom','United States','India','Canada','Australia'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </optgroup>
                <optgroup label="All countries">
                  {COUNTRIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Postcode — for UK triggers auto-fill of city + county */}
            <div>
              <label htmlFor="postal" className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B7280' }}>
                {profile.country === 'United Kingdom' ? 'Postcode' : 'Postal / ZIP code'}
              </label>
              <div className="flex gap-2">
                <input
                  id="postal"
                  type="text"
                  placeholder={profile.country === 'United Kingdom' ? 'e.g. SW1A 1AA' : '400001'}
                  value={profile.postalCode}
                  onChange={e => setProfile(p => ({ ...p, postalCode: e.target.value }))}
                  style={{ ...fieldBase, flex: 1 }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#00A6A6'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,166,166,0.10)' }}
                  onBlur={e  => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.12)'; e.currentTarget.style.boxShadow = 'none' }}
                />
                {profile.country === 'United Kingdom' && (
                  <UKPostcodeLookup
                    postcode={profile.postalCode}
                    onResult={r => setProfile(p => ({ ...p, city: r.city, state: r.county, country: 'United Kingdom' }))}
                  />
                )}
              </div>
            </div>

            <FieldInput label="Address line 1" id="addr1" placeholder="123 High Street"
              value={profile.addressLine1} onChange={e => setProfile(p => ({ ...p, addressLine1: e.target.value }))} />
            <FieldInput label="Address line 2 (optional)" id="addr2" placeholder="Flat / Suite"
              value={profile.addressLine2} onChange={e => setProfile(p => ({ ...p, addressLine2: e.target.value }))} />

            <div className="grid grid-cols-2 gap-4">
              <FieldInput label="City / Town" id="city" placeholder="London"
                value={profile.city} onChange={e => setProfile(p => ({ ...p, city: e.target.value }))} />
              <FieldInput label={profile.country === 'United Kingdom' ? 'County' : 'State / Province'} id="state" placeholder={profile.country === 'United Kingdom' ? 'Greater London' : 'Maharashtra'}
                value={profile.state} onChange={e => setProfile(p => ({ ...p, state: e.target.value }))} />
            </div>
          </div>

          <button
            onClick={handleProfileSave}
            disabled={profileSaving}
            className="btn-primary gap-2 disabled:opacity-50"
          >
            {profileSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : profileSaved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {profileSaving ? 'Saving…' : profileSaved ? 'Saved!' : 'Save profile'}
          </button>
        </motion.div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          SUBSCRIPTION TAB
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'subscription' && (
        <motion.div variants={itemVars} className="space-y-5">

          {/* Current plan card */}
          <div className="glass-card p-6">
            <div className="flex items-start justify-between mb-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#9CA3AF' }}>Active Plan</p>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-2xl font-black" style={{ color: '#111111' }}>LiveZapp {plan.name}</h2>
                  {isCancelled && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-lg" style={{ background: 'rgba(249,115,22,0.10)', color: '#F08700', border: '1px solid rgba(249,115,22,0.25)' }}>
                      Cancellation pending
                    </span>
                  )}
                  {isPlanExpired && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-lg" style={{ background: 'rgba(239,68,68,0.10)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.25)' }}>
                      Expired
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                {plan.pricePerMonth > 0 ? (
                  <>
                    <p className="text-2xl font-black" style={{ color: '#111111' }}>
                      ${user?.billingCycle === 'annual' ? plan.pricePerYear : plan.pricePerMonth}
                    </p>
                    <p className="text-xs" style={{ color: '#9CA3AF' }}>
                      per {user?.billingCycle === 'annual' ? 'year' : 'month'}
                    </p>
                  </>
                ) : (
                  <p className="text-2xl font-black" style={{ color: '#111111' }}>Free</p>
                )}
              </div>
            </div>

            {/* Billing info */}
            {user?.planExpiresAt && plan.id !== 'free' && (
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-xl mb-5"
                style={{
                  background: isPlanExpired ? 'rgba(239,68,68,0.06)' : isCancelled ? 'rgba(249,115,22,0.06)' : 'rgba(0,166,166,0.06)',
                  border: `1px solid ${isPlanExpired ? 'rgba(239,68,68,0.18)' : isCancelled ? 'rgba(249,115,22,0.18)' : 'rgba(0,166,166,0.18)'}`,
                }}
              >
                <Calendar className="w-4 h-4 shrink-0" style={{ color: isPlanExpired ? '#EF4444' : isCancelled ? '#F08700' : '#00A6A6' }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#374151' }}>
                    {isPlanExpired
                      ? 'Plan expired'
                      : isCancelled
                      ? `Access until ${new Date(user.planExpiresAt).toLocaleDateString('en', { day: 'numeric', month: 'long', year: 'numeric' })}`
                      : user.billingCycle === 'annual'
                      ? `Renews ${new Date(user.planExpiresAt).toLocaleDateString('en', { day: 'numeric', month: 'long', year: 'numeric' })}`
                      : `Next charge ${new Date(user.planExpiresAt).toLocaleDateString('en', { day: 'numeric', month: 'long', year: 'numeric' })}`
                    }
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>
                    {user.billingCycle === 'annual' ? 'Annual subscription' : 'Monthly subscription'}
                    {isCancelled ? ' — will not renew' : ''}
                  </p>
                </div>
              </div>
            )}

            {/* Plan limits recap */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {[
                { label: 'Sessions', value: plan.limits.maxPresentations === 'unlimited' ? '∞' : `${plan.limits.maxPresentations}` },
                { label: 'Participants', value: plan.limits.maxParticipantsPerSession.toLocaleString() },
                { label: 'Questions', value: `${plan.limits.maxQuestionsPerPresentation}` },
                { label: 'Live at once', value: `${plan.limits.maxActiveSessions}` },
              ].map(({ label, value }) => (
                <div key={label} className="text-center px-2 py-3 rounded-xl" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                  <p className="text-lg font-black" style={{ color: '#111111' }}>{value}</p>
                  <p className="text-[10px] font-semibold mt-0.5" style={{ color: '#9CA3AF' }}>{label}</p>
                </div>
              ))}
            </div>

            {/* Recurring billing note */}
            <div
              className="flex items-start gap-3 p-4 rounded-xl mb-5"
              style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)' }}
            >
              <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#3B82F6' }} />
              <p className="text-xs leading-relaxed" style={{ color: '#6B7280' }}>
                <strong className="text-[#374151]">Recurring billing:</strong> Your {user?.billingCycle ?? 'monthly'} plan renews automatically each {user?.billingCycle === 'annual' ? 'year' : 'month'} via PayPal.
                You will receive an email reminder before each charge. Cancel any time from this page — access continues until your billing period ends.
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Upgrade */}
              {plan.id !== 'pro' && !isPlanExpired && (
                <Link
                  href="/plans"
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold transition-all"
                  style={{ background: '#00A6A6', color: '#fff' }}
                >
                  <TrendingUp className="w-4 h-4" />
                  {plan.id === 'free' ? 'Upgrade Plan' : 'Upgrade to Pro'}
                </Link>
              )}

              {/* Downgrade */}
              {plan.id !== 'free' && plan.id !== 'basic' && !isPlanExpired && (
                <Link
                  href="/plans"
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all"
                  style={{ background: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB' }}
                >
                  Downgrade Plan
                </Link>
              )}

              {/* Reactivate / Cancel */}
              {plan.id !== 'free' && !isPlanExpired && (
                isCancelled ? (
                  <button
                    onClick={handleReactivate}
                    className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all"
                    style={{ background: 'rgba(0,166,166,0.08)', color: '#00A6A6', border: '1px solid rgba(0,166,166,0.25)' }}
                  >
                    Reactivate subscription
                  </button>
                ) : cancelDone ? (
                  <div className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm" style={{ background: 'rgba(34,197,94,0.08)', color: '#16A34A', border: '1px solid rgba(34,197,94,0.20)' }}>
                    <CheckCircle className="w-4 h-4" /> Cancellation confirmed
                  </div>
                ) : !cancelConfirm ? (
                  <button
                    onClick={() => setCancelConfirm(true)}
                    className="py-2.5 px-4 rounded-xl text-sm font-semibold transition-all"
                    style={{ color: '#EF4444', border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.04)' }}
                  >
                    Cancel subscription
                  </button>
                ) : (
                  <div className="flex-1 p-4 rounded-xl space-y-3" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.20)' }}>
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                      <p className="text-xs leading-relaxed" style={{ color: '#374151' }}>
                        <strong>Cancel subscription?</strong> Your {plan.name} plan will stay active until{' '}
                        <strong>{user?.planExpiresAt ? new Date(user.planExpiresAt).toLocaleDateString('en', { day: 'numeric', month: 'long' }) : 'end of billing period'}</strong>, then revert to Free.
                      </p>
                    </div>
                    {cancelError && <p className="text-xs text-red-500">{cancelError}</p>}
                    <div className="flex gap-2">
                      <button onClick={handleCancel} className="flex-1 py-2 rounded-lg text-xs font-bold" style={{ background: '#EF4444', color: '#fff' }}>
                        Yes, cancel
                      </button>
                      <button onClick={() => setCancelConfirm(false)} className="flex-1 py-2 rounded-lg text-xs font-semibold" style={{ background: '#F3F4F6', color: '#374151' }}>
                        Keep plan
                      </button>
                    </div>
                  </div>
                )
              )}

              {/* Expired — renew */}
              {isPlanExpired && (
                <Link href="/plans" className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold" style={{ background: '#00A6A6', color: '#fff' }}>
                  Renew Plan
                </Link>
              )}
            </div>
          </div>

          {/* All plans comparison link */}
          <div className="text-center">
            <Link href="/plans" className="text-sm font-semibold" style={{ color: '#00A6A6' }}>
              View all plans & pricing →
            </Link>
          </div>
        </motion.div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          BRANDING TAB
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'branding' && (
        <motion.div variants={itemVars}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold" style={{ color: '#111111' }}>Brand Identity</h2>
              <p className="text-sm" style={{ color: '#6B7280' }}>Customise what participants see when they join your sessions.</p>
            </div>
            <div
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold"
              style={canBrand
                ? { background: 'rgba(0,166,166,0.10)', border: '1px solid rgba(0,166,166,0.25)', color: '#00A6A6' }
                : { background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.10)', color: '#6B7280' }
              }
            >
              {canBrand ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              {plan.name} plan — branding {canBrand ? 'enabled' : 'locked'}
            </div>
          </div>

          {loadError && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm mb-4" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)', color: '#DC2626' }}>
              <AlertCircle className="w-4 h-4 shrink-0" />
              Could not load branding settings. Check your connection.
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">
            <div className="space-y-5">
              {/* Brand name + logo */}
              <div className="relative glass-card p-6 space-y-5">
                {!canBrand && <LockedOverlay />}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center icon-bg-primary"><Type className="w-4 h-4" /></div>
                  <h3 className="text-sm font-bold" style={{ color: '#111111' }}>Brand name & logo</h3>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: '#6B7280' }}>Brand name</label>
                  <input
                    type="text" value={branding.brandName}
                    onChange={e => updateBrand({ brandName: e.target.value })}
                    disabled={!canBrand} placeholder="e.g. Acme Corp" maxLength={60}
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all disabled:opacity-40"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.12)', color: '#111111' }}
                    onFocus={e => { e.currentTarget.style.borderColor = '#00A6A6'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,166,166,0.10)' }}
                    onBlur={e  => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.12)'; e.currentTarget.style.boxShadow = 'none' }}
                  />
                </div>
                {/* Logo upload */}
                {branding.logoUrl ? (
                  <div className="flex items-center gap-4 px-4 py-3 rounded-xl" style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.08)' }}>
                    <img src={branding.logoUrl} alt="Logo" className="h-9 max-w-[80px] object-contain rounded" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: '#374151' }}>{branding.logoUrl.split('/').pop()}</p>
                    </div>
                    <div className="flex gap-2">
                      <label className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer" style={{ background: 'rgba(0,166,166,0.08)', color: '#00A6A6', border: '1px solid rgba(0,166,166,0.20)' }}>
                        <RefreshCw className="w-3 h-3" /> Replace
                        <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" disabled={!canBrand || uploading} onChange={handleLogoUpload} />
                      </label>
                      <button onClick={() => updateBrand({ logoUrl: '' })} disabled={!canBrand} className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-3 py-8 rounded-xl cursor-pointer" style={{ background: 'rgba(0,166,166,0.04)', border: '2px dashed rgba(0,166,166,0.20)' }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(0,166,166,0.10)' }}>
                      {uploading ? <RefreshCw className="w-5 h-5 animate-spin" style={{ color: '#00A6A6' }} /> : <Upload className="w-5 h-5" style={{ color: '#00A6A6' }} />}
                    </div>
                    <p className="text-sm font-semibold" style={{ color: '#6B7280' }}>{uploading ? 'Uploading…' : 'Click to upload logo'}</p>
                    <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" disabled={!canBrand || uploading} onChange={handleLogoUpload} />
                  </label>
                )}
                {uploadError && <p className="text-xs text-red-500">{uploadError}</p>}
                {uploadSuccess && <p className="text-xs" style={{ color: '#16A34A' }}>Logo uploaded!</p>}
              </div>

              {/* Accent colour */}
              <div className="relative glass-card p-6 space-y-4">
                {!canBrand && <LockedOverlay />}
                <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-xl flex items-center justify-center icon-bg-secondary"><Palette className="w-4 h-4" /></div><h3 className="text-sm font-bold" style={{ color: '#111111' }}>Accent colour</h3></div>
                <div className="flex flex-wrap gap-2">
                  {ACCENT_PRESETS.map(p => (
                    <button key={p.value} disabled={!canBrand} onClick={() => updateBrand({ accentColor: p.value })} title={p.label}
                      className="w-8 h-8 rounded-xl transition-all disabled:cursor-not-allowed hover:scale-110"
                      style={{ background: p.value, boxShadow: branding.accentColor === p.value ? `0 0 0 2px #FFFFFF, 0 0 0 4px #111111` : 'none' }} />
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl shrink-0" style={{ background: branding.accentColor }} />
                  <input type="text" value={branding.accentColor}
                    onChange={e => { const v = e.target.value; if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) updateBrand({ accentColor: v }) }}
                    disabled={!canBrand} placeholder="#00A6A6" maxLength={7}
                    className="flex-1 px-3 py-2 rounded-xl text-sm font-mono outline-none disabled:opacity-40"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.12)', color: '#111111' }}
                    onFocus={e => { e.currentTarget.style.borderColor = '#00A6A6' }}
                    onBlur={e  => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.12)' }}
                  />
                </div>
              </div>

              {/* Powered by toggle */}
              <div className="relative glass-card p-6">
                {!canBrand && <LockedOverlay />}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center icon-bg-accent"><Eye className="w-4 h-4" /></div>
                    <div>
                      <p className="text-sm font-bold" style={{ color: '#111111' }}>Show "Powered by LiveZapp"</p>
                      <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>Displays credit in participant session footer</p>
                    </div>
                  </div>
                  <button disabled={!canBrand} onClick={() => updateBrand({ showPoweredBy: !branding.showPoweredBy })}
                    className="relative w-11 h-6 rounded-full flex-shrink-0 transition-all disabled:opacity-40"
                    style={{ background: branding.showPoweredBy ? '#00A6A6' : 'rgba(0,0,0,0.12)' }}>
                    <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all" style={{ left: branding.showPoweredBy ? '22px' : '2px', boxShadow: '0 1px 4px rgba(0,0,0,0.25)' }} />
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={handleBrandSave} disabled={!canBrand || brandSaving} className="btn-primary gap-2 disabled:opacity-40">
                  {brandSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : brandSaved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  {brandSaving ? 'Saving…' : brandSaved ? 'Saved!' : 'Save branding'}
                </button>
                <button onClick={() => updateBrand({ ...DEFAULT_BRANDING })} disabled={!canBrand} className="btn-ghost gap-2 disabled:opacity-40">
                  <RefreshCw className="w-4 h-4" /> Reset
                </button>
              </div>
            </div>

            {/* Preview */}
            <div className="lg:sticky lg:top-8 self-start">
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#9CA3AF' }}>Preview</p>
              <ParticipantPreview branding={branding} />
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-sm" style={{ color: '#9CA3AF' }}>Loading…</div>}>
      <SettingsContent />
    </Suspense>
  )
}
