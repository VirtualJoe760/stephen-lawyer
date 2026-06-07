import Link from "next/link";

const COLS = [
  {
    title: "Shop",
    links: [
      { href: "/shop", label: "All" },
      { href: "/shop/tees", label: "Tees" },
      { href: "/shop/hoodies", label: "Hoodies" },
      { href: "/shop/hats", label: "Hats" },
      { href: "/shop/accessories", label: "Accessories" },
    ],
  },
  {
    title: "Help",
    links: [
      { href: "/faq", label: "FAQ" },
      { href: "/sizing", label: "Size guide" },
      { href: "/shipping-returns", label: "Shipping & returns" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Stephen",
    links: [
      { href: "/about", label: "About" },
      { href: "/journal", label: "Journal" },
      { href: "/lookbook", label: "Lookbook" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
];

const SOCIALS = [
  { href: "https://instagram.com/stephenlawyer", label: "IG" },
  { href: "https://youtube.com/@stephenlawyer", label: "YT" },
  { href: "https://tiktok.com/@stephenlawyer", label: "TT" },
];

export function Footer() {
  return (
    <footer className="bg-ink text-bone mt-24">
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-16">
          {COLS.map((col) => (
            <div key={col.title}>
              <h3 className="font-mono text-xs uppercase tracking-widest text-bone/60 mb-4">
                {col.title}
              </h3>
              <ul className="flex flex-col gap-2 text-sm">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="hover:text-hazard transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pt-8 border-t border-bone/10">
          <Link href="/" className="wordmark text-5xl md:text-7xl leading-[0.85] block">
            STEPHEN<br />LAWYER
          </Link>
          <div className="flex flex-col gap-4 md:items-end">
            <ul className="flex gap-4 font-mono text-xs uppercase tracking-widest">
              {SOCIALS.map((s) => (
                <li key={s.href}>
                  <a href={s.href} target="_blank" rel="noopener noreferrer" className="hover:text-hazard">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
            <p className="font-mono text-xs text-bone/50 uppercase tracking-widest">
              © {new Date().getFullYear()} Stephen Lawyer. Encinitas, CA.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
