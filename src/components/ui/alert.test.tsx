import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { Alert } from "./alert";

describe("Alert", () => {
  test("un errore viene annunciato subito", () => {
    render(
      <Alert tone="error" title="Slot non più disponibile">
        Qualcuno l&apos;ha appena prenotato: scegline un altro.
      </Alert>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Slot non più disponibile",
    );
  });

  test("un successo viene annunciato senza interrompere", () => {
    render(<Alert tone="success">Prenotazione confermata.</Alert>);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Prenotazione confermata.",
    );
  });

  test("di default è un'informazione", () => {
    render(<Alert>Le prenotazioni aprono 14 giorni prima.</Alert>);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
