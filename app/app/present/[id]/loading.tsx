export default function PresentLoading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: '#0F0A1A' }}>
      <div className="h-10 w-10 animate-spin rounded-full border-4 mb-4" style={{ borderColor: 'rgba(101,12,217,0.25)', borderTopColor: '#650cd9' }} />
      <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>Loading presentation...</p>
    </div>
  )
}
