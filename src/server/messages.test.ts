import { describe, expect, test } from "vitest";
import { authErrorMessage, profileErrorMessage } from "./messages";

describe("profileErrorMessage", () => {
  test.each([
    "format",
    "check_character",
    "birth_date_mismatch",
    "name_mismatch",
    "underage",
    "invalid_birth_date",
    "duplicate_tax_code",
  ] as const)("%s ha un messaggio", (code) => {
    expect(profileErrorMessage(code).length).toBeGreaterThan(20);
  });

  test("il codice fiscale già registrato rimanda al contatto", () => {
    expect(
      profileErrorMessage("duplicate_tax_code", "neosaps@proton.me"),
    ).toContain("neosaps@proton.me");
  });
});

describe("authErrorMessage", () => {
  test("troppe richieste", () => {
    expect(
      authErrorMessage({ status: 429, code: "over_sms_send_rate_limit" }),
    ).toMatch(/aspetta/i);
  });

  test("codice errato o scaduto", () => {
    expect(authErrorMessage({ status: 403, code: "otp_expired" })).toMatch(
      /codice/i,
    );
  });

  test("errore sconosciuto", () => {
    expect(
      authErrorMessage({ status: 500, code: "unexpected_failure" }),
    ).toMatch(/riprova/i);
  });
});
