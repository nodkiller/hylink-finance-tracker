'use client'

import { useState } from 'react'

export default function ExportButton() {
  const [loading, setLoading] = useState(false)

  const handleExport = async () => {
    if (loading) return
    setLoading(true)
    try {
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
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="text-xs text-[#2A4A6B] border border-[#2A4A6B]/30 rounded-md px-3 py-1.5 hover:bg-[#2A4A6B]/5 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? '导出中...' : '导出报表 CSV'}
    </button>
  )
}
