export default function ProjectDetailLoading() {
  return (
    <div className="min-h-screen">
      <div className="bg-white border-b border-gray-200 px-6 py-3 h-[53px]" />

      <main className="max-w-5xl mx-auto px-4 md:px-6 py-5 md:py-8 space-y-4 md:space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2">
          <div className="skeleton h-3 w-16" />
          <div className="skeleton h-3 w-2" />
          <div className="skeleton h-3 w-12" />
          <div className="skeleton h-3 w-2" />
          <div className="skeleton h-3 w-32" />
        </div>

        {/* Project info card */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="skeleton h-5 w-24" />
            <div className="skeleton h-6 w-20 rounded-full" />
          </div>
          <div className="px-5 py-4 grid grid-cols-2 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="skeleton h-3 w-16" />
                <div className="skeleton h-4 w-28" />
              </div>
            ))}
          </div>
        </div>

        {/* Revenue section */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="skeleton h-4 w-12" />
            <div className="skeleton h-7 w-20" />
          </div>
          <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="px-5 py-3 space-y-1">
                <div className="skeleton h-3 w-12" />
                <div className="skeleton h-5 w-20" />
              </div>
            ))}
          </div>
          {[...Array(3)].map((_, i) => (
            <div key={i} className={`flex gap-4 px-4 py-3.5 border-b border-gray-50 ${i % 2 === 1 ? 'bg-gray-50/40' : ''}`}>
              <div className="skeleton h-3 flex-1" />
              <div className="skeleton h-3 w-24" />
              <div className="skeleton h-3 w-20" />
              <div className="skeleton h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>

        {/* Expense section */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="skeleton h-4 w-28" />
            <div className="skeleton h-7 w-28" />
          </div>
          <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="px-5 py-3 space-y-1">
                <div className="skeleton h-3 w-12" />
                <div className="skeleton h-5 w-20" />
              </div>
            ))}
          </div>
          {[...Array(4)].map((_, i) => (
            <div key={i} className={`flex gap-4 px-4 py-3.5 border-b border-gray-50 ${i % 2 === 1 ? 'bg-gray-50/40' : ''}`}>
              <div className="skeleton h-3 w-24" />
              <div className="skeleton h-3 flex-1" />
              <div className="skeleton h-3 w-20" />
              <div className="skeleton h-5 w-20 rounded-full" />
              <div className="skeleton h-3 w-16" />
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
