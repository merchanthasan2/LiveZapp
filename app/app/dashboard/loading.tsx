export default function DashboardLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-[80vh] animate-pulse">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="h-8 w-48 rounded-xl bg-gray-200" />
          <div className="h-4 w-64 rounded-lg bg-gray-100 mt-2" />
        </div>
        <div className="h-11 w-36 rounded-2xl bg-gray-200" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[1, 2, 3].map(i => (
          <div key={i} className="rounded-2xl border border-gray-100 p-5">
            <div className="h-3 w-20 rounded bg-gray-100 mb-3" />
            <div className="h-8 w-16 rounded-lg bg-gray-200" />
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="rounded-2xl border border-gray-100 p-5 flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <div className="h-5 w-48 rounded-lg bg-gray-200" />
              <div className="h-3 w-32 rounded bg-gray-100" />
            </div>
            <div className="h-9 w-24 rounded-xl bg-gray-100" />
          </div>
        ))}
      </div>
    </div>
  )
}
