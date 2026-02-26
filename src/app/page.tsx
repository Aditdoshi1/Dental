import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Nav */}
      <nav className="max-w-5xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold text-sm shadow-sm">
            Q
          </div>
          <span className="font-bold text-lg text-slate-900">QRShelf</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/login" className="btn-ghost text-sm">
            Sign In
          </Link>
          <Link href="/signup" className="btn-primary text-sm">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-700 rounded-full px-4 py-1.5 text-sm font-medium mb-6 ring-1 ring-brand-100">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          Free to use &middot; No credit card required
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.1]">
          Product recommendations,
          <br />
          <span className="bg-gradient-to-r from-brand-600 to-brand-500 bg-clip-text text-transparent">
            delivered by QR code
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-slate-500 mt-5 max-w-2xl mx-auto leading-relaxed">
          Create your shop, curate product collections, print QR codes, and let
          your customers scan to see what you recommend. Track every scan and click.
        </p>

        <div className="flex items-center justify-center gap-3 mt-8">
          <Link href="/signup" className="btn-primary text-base px-6 py-3">
            Get Started Free
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
          </Link>
          <Link href="/login" className="btn-secondary text-base px-6 py-3">
            Sign In
          </Link>
        </div>

        {/* Features */}
        <div className="grid sm:grid-cols-3 gap-6 mt-20 text-left">
          {[
            {
              icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
              ),
              title: "Generate QR Codes",
              desc: "Create printable QR codes for each product collection. Patients scan and instantly see your recommendations.",
              color: "bg-brand-50 text-brand-600",
            },
            {
              icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              ),
              title: "Auto-Fetch Product Info",
              desc: "Paste a product link and we automatically fetch the title, image, and description. No manual entry needed.",
              color: "bg-amber-50 text-amber-600",
            },
            {
              icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              ),
              title: "Track Everything",
              desc: "See which QR codes get the most scans and which products get the most clicks. Export data anytime.",
              color: "bg-purple-50 text-purple-600",
            },
          ].map((feature) => (
            <div key={feature.title} className="card-hover p-6">
              <div className={`w-10 h-10 rounded-xl ${feature.color} flex items-center justify-center mb-4`}>
                {feature.icon}
              </div>
              <h3 className="font-semibold text-slate-900 mb-1.5">{feature.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>

        <p className="text-xs text-slate-400 mt-12">
          Works for dental clinics, salons, gyms, bookshops — any business that recommends products.
        </p>
      </div>
    </div>
  );
}
