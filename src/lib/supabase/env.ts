/**
 * Variabili pubbliche di Supabase. Lette solo quando servono, così build e test
 * senza rete non le richiedono. L'accesso diretto a `process.env.NEXT_PUBLIC_…`
 * permette a Next.js di inserirle nel codice del browser.
 */
export function publicSupabaseEnv(): { url: string; publishableKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new Error(
      "Mancano NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: vedi .env.example",
    );
  }
  return { url, publishableKey };
}
