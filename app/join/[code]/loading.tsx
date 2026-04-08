export default function JoinLoading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: 'linear-gradient(135deg, #F8F7FF 0%, #F0EDFF 100%)' }}>
      <div className="h-8 w-8 animate-spin rounded-full border-4 mb-4" style={{ borderColor: 'rgba(101,12,217,0.15)', borderTopColor: '#650cd9' }} />
      <p className="text-sm font-medium" style={{ color: '#6d667b' }}>Joining session...</p>
    </div>
  )
}
