export default function ProjectsLoading() {
  return (
    <div className="min-h-screen">
      <div className="bg-white border-b border-gray-200 px-6 py-3 h-[53px]" />

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-5 md:py-8 space-y-4">
        {/* Page title */}
        <div className="flex items-center justify-between">
          <div className="skeleton h-7 w-20" />
        </div>

        {/* Filter bar */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
          <div className="flex gap-2 flex-wrap">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton h-8 w-32" />
            ))}
            <div className="skeleton h-8 w-48" />
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 space-y-2">
              <div className="skeleton h-3 w-16" />
              <div className="skeleton h-7 w-28" />
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="flex gap-4 px-4 py-3 border-b">
            {[36, 20, 48, 24, 28, 28, 28, 28].map((w, i) => (
              <div key={i} className={`skeleton h-3 w-${w}`} />
            ))}
          </div>
          {/* Rows */}
          {[...Array(8)].map((_, i) => (
            <div key={i} className={`flex gap-4 px-4 py-3.5 border-b border-gray-50 ${i % 2 === 1 ? 'bg-gray-50/40' : ''}`}>
              <div className="skeleton h-3 w-28" />
              <div className="skeleton h-3 w-16" />
              <div className="skeleton h-3 w-40" />
              <div className="skeleton h-3 w-20" />
              <div className="skeleton h-5 w-20 rounded-full" />
              <div className="skeleton h-3 w-24 ml-auto" />
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
