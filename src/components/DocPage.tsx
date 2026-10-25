import type { ReactNode } from "react";
import Link from "next/link";

const NAV = [
  { href: "/", label: "MAP" },
  { href: "/docs", label: "DOCS" },
  { href: "/privacy", label: "PRIVACY" },
];

export default function DocPage({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <div className="doc-root">
      <header className="doc-bar">
        <Link href="/" className="doc-brand">
          <svg width="20" height="20" viewBox="0 0 40 40" fill="none" aria-hidden="true">
            <circle cx="20" cy="20" r="17.2" stroke="#d4af37" strokeWidth="1" opacity="0.5" />
            <path d="M20 3.2 24.4 15.6 36.8 20 24.4 24.4 20 36.8 15.6 24.4 3.2 20 15.6 15.6Z" fill="#d4af37" />
            <circle cx="20" cy="20" r="3.1" fill="#06060c" />
          </svg>
          <span>OSIRIS</span>
        </Link>
        <nav className="doc-nav">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href}>
              {n.label}
            </Link>
          ))}
        </nav>
        <span className="doc-version">V5.0</span>
      </header>

      <main className="doc-scroll">
        <article className="doc-body">
          <div className="doc-eyebrow">{eyebrow}</div>
          <h1>{title}</h1>
          <p className="doc-intro">{intro}</p>
          {children}
          <footer className="doc-foot">
            <span>OSIRIS · Open Source Intelligence Platform</span>
            <Link href="/">← Return to the globe</Link>
          </footer>
        </article>
      </main>
    </div>
  );
}
