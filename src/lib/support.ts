/** Indirizzo a cui scrivere per correggere il profilo (pubblico). */
export function supportEmail(): string {
  return process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "neosaps@proton.me";
}
