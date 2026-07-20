const YEAR = new Date().getFullYear();

export default function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-2 px-6 py-6 text-center text-xs text-slate-500 sm:flex-row sm:justify-between sm:text-left">
        <p>
          © {YEAR} FTC International. PCP Planner is a food safety documentation tool and does not
          replace review by a qualified individual.
        </p>
        <a
          href="https://www.ftcinternational.com"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-brand-600 hover:text-brand-700"
        >
          ftcinternational.com
        </a>
      </div>
    </footer>
  );
}
