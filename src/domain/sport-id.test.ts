import { describe, expect, test } from "vitest";
import { sportIdFromName } from "./sport-id";

describe("sportIdFromName", () => {
  test.each([
    ["Calcetto", "calcetto"],
    ["Beach volley", "beach-volley"],
    ["  Pallavolo  ", "pallavolo"],
    ["Ping-pong", "ping-pong"],
    ["Bocce & Petanque!", "bocce-petanque"],
    ["Pattinaggio à roulettes", "pattinaggio-a-roulettes"],
  ])("%j → %j", (name, id) => {
    expect(sportIdFromName(name)).toBe(id);
  });

  test("restituisce null se non resta nulla", () => {
    expect(sportIdFromName("!!!")).toBeNull();
  });

  test("non supera i 40 caratteri", () => {
    expect(sportIdFromName("a".repeat(60))?.length).toBe(40);
  });
});
