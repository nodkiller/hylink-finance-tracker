export default function DashboardLoading() {
  return (
    <div className="min-h-screen">
      {/* Header placeholder */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 h-[53px]" />

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-5 md:py-8 space-y-5">
        {/* Title */}
        <div className="flex items-center justify-between">
          <div className="skeleton h-8 w-24" />
          <div className="skeleton h-8 w-48" />
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 space-y-2">
              <div className="skeleton h-3 w-24" />
              <div className="skeleton h-8 w-32" />
              <div className="skeleton h-3 w-20" />
            </div>
          ))}
        </div>

        {/* Chart row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 space-y-1">
                <div className="skeleton h-4 w-32" />
                <div className="skeleton h-3 w-24" />
              </div>
              <div className="px-4 py-4">
                <div className="skeleton h-48 w-full" />
              </div>
            </div>
          ))}
        </div>

        {/* Alert row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <div className="skeleton h-4 w-28" />
              </div>
              <div className="p-4 space-y-3">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="flex items-center gap-3">
                    <div className="skeleton w-2 h-2 rounded-full" />
                    <div className="skeleton h-3 flex-1" />
                    <div className="skeleton h-3 w-20" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
