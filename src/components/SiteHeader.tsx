import Link from "next/link";

// Global site header shown on every page (rendered from the root layout).
// The logo lives at /public/ftc-logo.svg — to swap in the official FTC
// International asset, replace that file (keep the same name), or drop in a
// PNG and change the src below to "/ftc-logo.png".
export default function SiteHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center" aria-label="FTC International — home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/ftc-logo.svg" alt="FTC International" className="h-9 w-auto" />
        </Link>
        <nav className="flex items-center gap-4 text-sm font-medium text-slate-600">
          <Link href="/pricing" className="hover:text-brand-600">
            Pricing
          </Link>
          <Link href="/login" className="hover:text-brand-600">
            Log in
          </Link>
          <Link
            href="/register"
            className="rounded-md bg-brand-600 px-3 py-1.5 font-semibold text-white hover:bg-brand-700"
          >
            Start your plan
          </Link>
        </nav>
      </div>
    </header>
  );
}
