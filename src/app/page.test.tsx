import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import HomePage from "./page";

test("mostra il nome del servizio", () => {
  render(<HomePage />);
  expect(
    screen.getByRole("heading", { level: 1, name: "Gioca Merlara" }),
  ).toBeInTheDocument();
});
