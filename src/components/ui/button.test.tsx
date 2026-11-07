import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { Button } from "./button";

describe("Button", () => {
  test("è un pulsante con il testo come nome accessibile", () => {
    render(<Button>Prenota</Button>);
    expect(screen.getByRole("button", { name: "Prenota" })).toBeEnabled();
  });

  test("di default non invia i form", () => {
    render(<Button>Prenota</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });

  test("disabilitato non riceve clic", async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Prenota
      </Button>,
    );
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  test("in corso mostra il testo di attesa e non riceve clic", async () => {
    const onClick = vi.fn();
    render(
      <Button pending pendingLabel="Prenotazione in corso…" onClick={onClick}>
        Prenota
      </Button>,
    );
    const button = screen.getByRole("button", {
      name: "Prenotazione in corso…",
    });
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});
