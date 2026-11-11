import Link from "next/link";

const LINKS = [
  { href: "/admin", label: "Riepilogo" },
  { href: "/admin/orario", label: "Orario" },
  { href: "/admin/sport", label: "Sport e prezzi" },
  { href: "/admin/blocchi", label: "Blocchi" },
  { href: "/admin/prenotazioni", label: "Prenotazioni" },
];

export function AdminNav() {
  return (
    <nav
      aria-label="Gestione"
      className="flex flex-wrap gap-x-4 gap-y-1 text-sm"
    >
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="font-semibold text-primary hover:underline"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
