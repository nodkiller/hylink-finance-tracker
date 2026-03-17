import type { Metadata } from "next"
import { Inter, Noto_Sans_SC } from "next/font/google"
import "./globals.css"
import { ToastProvider } from "@/components/toast"

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
})

const notoSansSC = Noto_Sans_SC({
  variable: "--font-noto-sc",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "Hylink Finance Tracker",
  description: "财务管理系统",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${inter.variable} ${notoSansSC.variable} antialiased`}>
        {/* Decorative background — fixed, behind all page content */}
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none select-none" aria-hidden="true">
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 1440 900"
            preserveAspectRatio="xMidYMid slice"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Large organic sweep — upper right */}
            <path
              d="M 1050 -250 C 1620 -50 1780 380 1400 650 C 1100 860 580 830 200 680 C -140 530 -80 160 180 -60 C 400 -240 720 -480 1050 -250 Z"
              fill="#3182CE"
              opacity="0.038"
            />
            {/* Ribbon swoosh — diagonal mid */}
            <path
              d="M -120 280 C 260 60 680 160 980 360 C 1220 520 1420 700 1560 660 C 1520 740 1360 800 1100 680 C 820 540 440 420 80 600 C -60 660 -160 580 -120 280 Z"
              fill="#2B6CB0"
              opacity="0.028"
            />
            {/* Accent blob — lower left */}
            <path
              d="M -280 780 C -60 560 280 560 440 760 C 580 940 400 1140 80 1060 C -200 980 -500 1000 -280 780 Z"
              fill="#1A365D"
              opacity="0.03"
            />
          </svg>
        </div>

        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
