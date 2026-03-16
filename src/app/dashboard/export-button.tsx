'use client'

export default function ExportButton() {
  const handleExport = async () => {
    const res = await fetch('/api/export-projects')
    if (!res.ok) { alert('导出失败，请确认权限'); return }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const date = new Date().toISOString().slice(0, 10)
    a.href = url
    a.download = `hylink-report-${date}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={handleExport}
      className="text-xs text-[#2A4A6B] border border-[#2A4A6B]/30 rounded-md px-3 py-1.5 hover:bg-[#2A4A6B]/5 transition-colors font-medium"
    >
      导出报表 CSV
    </button>
  )
}
