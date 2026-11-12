import { describe, expect, test } from "vitest";
import { blockFormKey } from "./form-key";

describe("blockFormKey", () => {
  test("con le giornate intere gli orari (non inviati) non contano", () => {
    const fields = {
      fromDate: "2026-11-12",
      fromTime: "09:00",
      toDate: "2026-11-13",
      toTime: "10:00",
      wholeDays: "on",
      reason: "",
    };
    // Il server riceve i campi senza orari: la chiave deve coincidere con quella del modulo.
    expect(blockFormKey({ ...fields, fromTime: "", toTime: "" })).toBe(
      blockFormKey(fields),
    );
    expect(blockFormKey({ ...fields, wholeDays: "" })).not.toBe(
      blockFormKey({ ...fields, wholeDays: "", fromTime: "" }),
    );
  });
});
