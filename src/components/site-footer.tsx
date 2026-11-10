import Image from "next/image";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-divider">
      <div className="mx-auto flex max-w-md items-center gap-3 px-4 py-4">
        <Image
          src="/brand/merlara-coat-of-arms.svg"
          alt="Stemma del Comune di Merlara"
          width={41}
          height={48}
          className="h-12 w-auto"
        />
        <p className="text-sm text-text-muted">
          In collaborazione con il Comune di Merlara
        </p>
      </div>
    </footer>
  );
}
