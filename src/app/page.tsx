import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col items-center justify-center px-4">
      <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 tracking-tight">
        Dental Hygiene
      </h1>
      <Link
        href="/login"
        className="mt-8 btn-primary text-base px-8 py-3"
      >
        Sign In
      </Link>
    </div>
  );
}
