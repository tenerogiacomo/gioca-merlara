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
    <nav aria-label="Gestione" className="flex flex-wrap gap-x-4">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="inline-flex min-h-11 items-center font-semibold text-primary hover:underline"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
