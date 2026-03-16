import LoginForm from './login-form'

export default function LoginPage() {
  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0d2137] via-[#1a3a5c] to-[#2A4A6B]" />

      {/* Decorative blobs */}
      <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-[#B9A284]/30 to-[#D48E00]/20 blur-3xl" />
      <div className="absolute bottom-[-15%] left-[-5%] w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-[#2A4A6B]/60 to-[#3A7D44]/20 blur-3xl" />

      {/* Large decorative character */}
      <div className="absolute left-[8%] top-1/2 -translate-y-1/2 select-none pointer-events-none hidden lg:block">
        <span className="text-[280px] font-black text-white/[0.04] leading-none tracking-tighter">H</span>
      </div>

      {/* Logo top-left */}
      <div className="absolute top-8 left-10 z-10">
        <span className="text-white/90 text-lg font-bold tracking-widest uppercase">Hylink</span>
        <span className="ml-2 text-white/40 text-xs tracking-widest uppercase">Finance</span>
      </div>

      {/* Center content */}
      <div className="relative z-10 flex w-full max-w-5xl px-8 items-center justify-between gap-16">
        {/* Left: headline */}
        <div className="hidden lg:block flex-1">
          <p className="text-white/50 text-sm tracking-[0.3em] uppercase mb-6">Internal Management System</p>
          <h1 className="text-white font-bold leading-[1.15] tracking-tight" style={{ fontSize: 'clamp(2.5rem, 4vw, 3.5rem)' }}>
            数字驱动，<br />精准管控。
          </h1>
          <p className="mt-5 text-white/40 text-sm tracking-widest">
            Precision financial management<br />for every campaign.
          </p>
        </div>

        {/* Right: login card */}
        <div className="w-full max-w-sm flex-shrink-0">
          <div className="backdrop-blur-xl bg-white/[0.07] border border-white/10 rounded-2xl p-8 shadow-2xl">
            <div className="mb-7">
              <h2 className="text-white text-xl font-semibold tracking-tight">欢迎回来</h2>
              <p className="mt-1 text-white/40 text-sm">请使用公司账户登录</p>
            </div>
            <LoginForm />
          </div>
          <p className="mt-5 text-center text-white/20 text-xs tracking-widest">
            © 2025 Hylink Australia
          </p>
        </div>
      </div>
    </div>
  )
}
