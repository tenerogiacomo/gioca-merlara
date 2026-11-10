import { afterAll, beforeAll, describe, expect, test } from "vitest";
import {
  createAdminClient,
  requireDevelopmentProject,
  restoreConfig,
  snapshotConfig,
  type ConfigSnapshot,
} from "../../scripts/lib/admin";
import { anonymousClient, signedInClient, type Client } from "./helpers";

const admin = createAdminClient();
let snapshot: ConfigSnapshot;
let userA: Client;

beforeAll(async () => {
  requireDevelopmentProject();
  snapshot = await snapshotConfig(admin);
  userA = await signedInClient("USER_A");
});

afterAll(async () => {
  await restoreConfig(admin, snapshot);
  const after = await snapshotConfig(admin);
  expect(after.intervals.length).toBe(snapshot.intervals.length);
  expect(after.rules.length).toBe(snapshot.rules.length);
});

const sorted = <T>(rows: T[]) => rows.map((row) => JSON.stringify(row)).sort();

describe("sostituzione atomica dell'orario", () => {
  test("sostituisce l'orario intero", async () => {
    const result = await admin.rpc("replace_opening_intervals", {
      p_intervals: [
        { weekday: 1, opens: "09:00", closes: "13:00" },
        { weekday: 1, opens: "15:00", closes: "24:00" },
      ],
    });
    expect(result.error).toBeNull();
    const { data } = await admin
      .from("opening_intervals")
      .select("weekday, opens, closes");
    expect(sorted(data ?? [])).toEqual(
      sorted([
        { weekday: 1, opens: "09:00:00", closes: "13:00:00" },
        { weekday: 1, opens: "15:00:00", closes: "24:00:00" },
      ]),
    );
  });

  test("un dato non valido non cambia nulla", async () => {
    const before = await admin
      .from("opening_intervals")
      .select("weekday, opens, closes");
    const result = await admin.rpc("replace_opening_intervals", {
      p_intervals: [
        { weekday: 2, opens: "09:00", closes: "18:00" },
        { weekday: 3, opens: "18:00", closes: "09:00" },
      ],
    });
    expect(result.error).not.toBeNull();
    const after = await admin
      .from("opening_intervals")
      .select("weekday, opens, closes");
    expect(sorted(after.data ?? [])).toEqual(sorted(before.data ?? []));
  });
});

describe("sostituzione atomica dei prezzi di uno sport", () => {
  // Uno sport dei dati di esempio: le sue fasce vengono ripristinate alla fine.
  const sportId = "calcetto";

  test("sostituisce solo le fasce dello sport indicato", async () => {
    const others = await admin
      .from("price_rules")
      .select("id")
      .neq("sport_id", sportId);
    const result = await admin.rpc("replace_price_rules", {
      p_sport_id: sportId,
      p_rules: [
        { weekdays: [1, 2], from: "15:00", to: "17:00", priceCents: 0 },
      ],
    });
    expect(result.error).toBeNull();
    const mine = await admin
      .from("price_rules")
      .select("weekdays, price_cents")
      .eq("sport_id", sportId);
    expect(mine.data).toEqual([{ weekdays: [1, 2], price_cents: 0 }]);
    const othersAfter = await admin
      .from("price_rules")
      .select("id")
      .neq("sport_id", sportId);
    expect(othersAfter.data?.length).toBe(others.data?.length);
  });

  test("un prezzo negativo non cambia nulla", async () => {
    const before = await admin
      .from("price_rules")
      .select("*")
      .eq("sport_id", sportId);
    const result = await admin.rpc("replace_price_rules", {
      p_sport_id: sportId,
      p_rules: [{ weekdays: [1], from: "09:00", to: "10:00", priceCents: -1 }],
    });
    expect(result.error).not.toBeNull();
    const after = await admin
      .from("price_rules")
      .select("*")
      .eq("sport_id", sportId);
    expect(after.data).toEqual(before.data);
  });
});

describe("solo il server può sostituire la configurazione", () => {
  test.each([
    ["senza sessione", () => anonymousClient()],
    ["con sessione", () => userA],
  ])("%s non può eseguire le funzioni", async (_, client) => {
    const intervals = await client().rpc("replace_opening_intervals", {
      p_intervals: [],
    });
    expect(intervals.error?.code).toBe("42501");
    const rules = await client().rpc("replace_price_rules", {
      p_sport_id: "calcetto",
      p_rules: [],
    });
    expect(rules.error?.code).toBe("42501");
  });
});
