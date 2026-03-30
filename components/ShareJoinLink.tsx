'use client'

import { useState } from 'react'
import {
  Share2, Copy, CheckCircle2, MessageCircle, Twitter, Mail,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface ShareJoinLinkProps {
  joinCode: string
  presenterName: string
  sessionTitle: string
  siteUrl?: string
}

export default function ShareJoinLink({
  joinCode, presenterName, sessionTitle,
  siteUrl = typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.host}`
    : process.env.NEXT_PUBLIC_SITE_URL || 'https://livezapp.com',
}: ShareJoinLinkProps) {
  const [copied, setCopied] = useState(false)
  const [showOptions, setShowOptions] = useState(false)

  const joinUrl = `${siteUrl}/join/${joinCode}`
  const shareMessage = `${presenterName} is using LiveZapp to share a real-time interactive experience. Join now: ${joinUrl}`

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const shareViaWeb = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${sessionTitle}`,
          text: shareMessage,
          url: joinUrl,
        })
      } catch (err) {
        console.error('Share failed:', err)
      }
    }
  }

  const shareViaWhatsApp = () => {
    const encoded = encodeURIComponent(shareMessage)
    window.open(`https://wa.me/?text=${encoded}`, '_blank')
  }

  const shareViaTwitter = () => {
    const encoded = encodeURIComponent(shareMessage)
    window.open(`https://twitter.com/intent/tweet?text=${encoded}`, '_blank')
  }

  const shareViaEmail = () => {
    const subject = encodeURIComponent(`Join: ${sessionTitle}`)
    const body = encodeURIComponent(shareMessage)
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank')
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowOptions(!showOptions)}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-[0.98]"
        style={{
          background: '#00A6A6',
          color: '#FFFFFF',
        }}
        title="Share join link"
      >
        <Share2 className="w-4 h-4" />
        Share
      </button>

      <AnimatePresence>
        {showOptions && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowOptions(false)}
            />

            {/* Menu */}
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.95 }}
              transition={{ duration: 0.12 }}
              className="absolute right-0 top-full mt-2 w-56 rounded-2xl overflow-hidden z-50"
              style={{
                background: '#FFFFFF',
                border: '1px solid #E5E7EB',
                boxShadow: '0 16px 48px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06)',
              }}
            >
              {/* Copy link */}
              <button
                onClick={() => { copyToClipboard(); setShowOptions(false) }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors hover:bg-gray-50 text-left"
                style={{ color: '#374151' }}
              >
                {copied ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" style={{ color: '#9CA3AF' }} />
                )}
                {copied ? 'Link copied!' : 'Copy link'}
              </button>

              {/* Web Share API (mobile) */}
              {navigator.share && (
                <button
                  onClick={() => { shareViaWeb(); setShowOptions(false) }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors hover:bg-gray-50 text-left"
                  style={{ color: '#374151', borderTop: '1px solid #F3F4F6' }}
                >
                  <Share2 className="w-4 h-4" style={{ color: '#9CA3AF' }} />
                  Share…
                </button>
              )}

              {/* WhatsApp */}
              <button
                onClick={() => { shareViaWhatsApp(); setShowOptions(false) }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors hover:bg-gray-50 text-left"
                style={{ color: '#374151', borderTop: '1px solid #F3F4F6' }}
              >
                <MessageCircle className="w-4 h-4" style={{ color: '#25D366' }} />
                WhatsApp
              </button>

              {/* Twitter/X */}
              <button
                onClick={() => { shareViaTwitter(); setShowOptions(false) }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors hover:bg-gray-50 text-left"
                style={{ color: '#374151', borderTop: '1px solid #F3F4F6' }}
              >
                <Twitter className="w-4 h-4" style={{ color: '#1D9BF0' }} />
                Twitter/X
              </button>

              {/* Email */}
              <button
                onClick={() => { shareViaEmail(); setShowOptions(false) }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors hover:bg-gray-50 text-left"
                style={{ color: '#374151', borderTop: '1px solid #F3F4F6' }}
              >
                <Mail className="w-4 h-4" style={{ color: '#9CA3AF' }} />
                Email
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
