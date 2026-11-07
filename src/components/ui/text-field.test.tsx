import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { TextField } from "./text-field";

describe("TextField", () => {
  test("l'etichetta è collegata al campo", () => {
    render(<TextField label="Nome" name="firstName" />);
    expect(screen.getByLabelText("Nome")).toHaveAttribute("name", "firstName");
  });

  test("il testo d'aiuto descrive il campo", () => {
    render(
      <TextField label="Codice fiscale" hint="16 caratteri" name="taxCode" />,
    );
    expect(screen.getByLabelText("Codice fiscale")).toHaveAccessibleDescription(
      "16 caratteri",
    );
  });

  test("l'errore marca il campo come non valido ed è annunciato", () => {
    render(
      <TextField
        label="Codice fiscale"
        hint="16 caratteri"
        error="Il codice fiscale non è valido: controlla le ultime lettere."
        name="taxCode"
      />,
    );
    const input = screen.getByLabelText("Codice fiscale");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription(
      "16 caratteri Il codice fiscale non è valido: controlla le ultime lettere.",
    );
  });

  test("senza errore il campo è valido", () => {
    render(<TextField label="Nome" name="firstName" />);
    expect(screen.getByLabelText("Nome")).not.toHaveAttribute("aria-invalid");
  });
});
