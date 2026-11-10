import "server-only";
import { cookies } from "next/headers";

// Numero a cui è stato inviato il codice, tra la prima e la seconda schermata di accesso.
// In un cookie e non nell'indirizzo, per non far finire il numero nei log.
const NAME = "gm_otp_phone";

export async function rememberOtpPhone(phone: string) {
  (await cookies()).set(NAME, phone, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });
}

export async function readOtpPhone(): Promise<string | null> {
  return (await cookies()).get(NAME)?.value ?? null;
}

export async function forgetOtpPhone() {
  (await cookies()).delete(NAME);
}
