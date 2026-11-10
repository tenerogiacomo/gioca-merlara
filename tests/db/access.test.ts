import { afterAll, beforeAll, describe, expect, test } from "vitest";
import {
  assignSuperadmin,
  createAdminClient,
  findUserByPhone,
  requireEnv,
  resetTestData,
} from "../../scripts/lib/admin";
import {
  anonymousClient,
  futureSlot,
  signedInClient,
  type Client,
} from "./helpers";

const admin = createAdminClient();
const TEST_BLOCK_REASON = "test: blocco di prova";
const range = { p_from: "2030-06-10T00:00:00Z", p_to: "2030-06-11T00:00:00Z" };

let userA: Client;
let userB: Client;
let superadmin: Client;
let idA: string;
let idB: string;

function booking(userId: string, hour: number) {
  return {
    user_id: userId,
    sport_id: "calcetto",
    ...futureSlot(hour),
    price_cents: 0,
    autocert_version: "test",
    autocert_accepted_at: new Date().toISOString(),
  };
}

async function cleanUp() {
  await resetTestData(admin);
  const blocks = await admin
    .from("blocks")
    .delete()
    .eq("reason", TEST_BLOCK_REASON);
  if (blocks.error) throw blocks.error;
}

beforeAll(async () => {
  await cleanUp();
  const sport = await admin
    .from("sports")
    .upsert({ id: "calcetto", name: "Calcetto", active: true, sort_order: 1 });
  if (sport.error) throw sport.error;

  // Il ruolo va assegnato prima dell'accesso, perché entra nel token al login.
  await assignSuperadmin(admin, requireEnv("TEST_PHONE_SUPERADMIN"));
  [userA, userB, superadmin] = await Promise.all([
    signedInClient("USER_A"),
    signedInClient("USER_B"),
    signedInClient("SUPERADMIN"),
  ]);
  idA = (await findUserByPhone(admin, requireEnv("TEST_PHONE_USER_A")))!.id;
  idB = (await findUserByPhone(admin, requireEnv("TEST_PHONE_USER_B")))!.id;

  const profiles = await admin.from("profiles").insert([
    {
      id: idA,
      first_name: "Anna",
      last_name: "Prova",
      birth_date: "1990-01-01",
      tax_code: "PRVNNA90A41A001A",
    },
    {
      id: idB,
      first_name: "Bruno",
      last_name: "Prova",
      birth_date: "1991-02-02",
      tax_code: "PRVBRN91B02A001B",
    },
  ]);
  if (profiles.error) throw profiles.error;
});

afterAll(cleanUp);

describe("1. esclusiva dello slot", () => {
  test("una seconda prenotazione attiva sullo stesso slot viene rifiutata", async () => {
    expect(
      (await admin.from("bookings").insert(booking(idA, 9))).error,
    ).toBeNull();
    const second = await admin.from("bookings").insert(booking(idB, 9));
    expect(second.error?.code).toBe("23505");
  });

  test("una prenotazione annullata libera lo slot", async () => {
    const cancelled = await admin
      .from("bookings")
      .update({
        status: "cancelled_by_user",
        cancelled_at: new Date().toISOString(),
      })
      .eq("user_id", idA)
      .eq("starts_at", futureSlot(9).starts_at);
    expect(cancelled.error).toBeNull();
    expect(
      (await admin.from("bookings").insert(booking(idB, 9))).error,
    ).toBeNull();
  });

  test("una prenotazione senza autocertificazione viene rifiutata", async () => {
    const withoutAutocert: Partial<ReturnType<typeof booking>> = booking(
      idA,
      20,
    );
    delete withoutAutocert.autocert_version;
    const result = await admin
      .from("bookings")
      .insert(withoutAutocert as never);
    expect(result.error?.code).toBe("23502");
  });
});

describe("2. nessuna scrittura diretta dagli utenti", () => {
  test("un utente non inserisce prenotazioni", async () => {
    const result = await userA.from("bookings").insert(booking(idA, 11));
    expect(result.error?.code).toBe("42501");
  });

  test("un utente non modifica né cancella il proprio profilo", async () => {
    const update = await userA
      .from("profiles")
      .update({ first_name: "Hacker" })
      .eq("id", idA);
    expect(update.error?.code).toBe("42501");
    const remove = await userA.from("profiles").delete().eq("id", idA);
    expect(remove.error?.code).toBe("42501");
  });

  test("un utente non crea profili", async () => {
    const result = await userA.from("profiles").insert({
      id: idA,
      first_name: "X",
      last_name: "Y",
      birth_date: "1990-01-01",
      tax_code: "XXXYYY90A01A001X",
    });
    expect(result.error?.code).toBe("42501");
  });

  test("un visitatore senza sessione non scrive nulla", async () => {
    const result = await anonymousClient()
      .from("sports")
      .insert({ id: "golf", name: "Golf" });
    expect(result.error?.code).toBe("42501");
  });
});

describe("3. isolamento dei dati personali", () => {
  beforeAll(async () => {
    const result = await admin.from("bookings").insert(booking(idA, 12));
    if (result.error) throw result.error;
  });

  test("un utente vede solo il proprio profilo", async () => {
    const { data, error } = await userA.from("profiles").select("id");
    expect(error).toBeNull();
    expect(data).toEqual([{ id: idA }]);
  });

  test("un utente vede solo le proprie prenotazioni", async () => {
    const { data } = await userB.from("bookings").select("user_id");
    expect(data?.every((row) => row.user_id === idB)).toBe(true);
    expect(data?.length).toBeGreaterThan(0);
  });

  test("senza sessione non si legge nessuna prenotazione né profilo", async () => {
    const anonymous = anonymousClient();
    expect((await anonymous.from("bookings").select("id")).data ?? []).toEqual(
      [],
    );
    expect((await anonymous.from("profiles").select("id")).data ?? []).toEqual(
      [],
    );
  });
});

describe("4. calendario: solo i dati previsti", () => {
  beforeAll(async () => {
    const result = await admin.from("blocks").insert({
      ...futureSlot(15),
      reason: TEST_BLOCK_REASON,
    });
    if (result.error) throw result.error;
  });

  test("senza sessione gli slot occupati mostrano solo l'orario", async () => {
    const { data, error } = await anonymousClient().rpc(
      "occupied_slots",
      range,
    );
    expect(error).toBeNull();
    expect(data?.length).toBeGreaterThan(0);
    for (const row of data ?? []) {
      expect(Object.keys(row).sort()).toEqual([
        "first_name",
        "sport_id",
        "starts_at",
      ]);
      expect(row.first_name).toBeNull();
      expect(row.sport_id).toBeNull();
    }
  });

  test("con sessione si vedono anche nome e sport, mai altro", async () => {
    const { data } = await userB.rpc("occupied_slots", range);
    const slotOfA = data?.find((row) =>
      row.starts_at.startsWith("2030-06-10T12:00"),
    );
    expect(slotOfA).toEqual({
      starts_at: expect.any(String),
      sport_id: "calcetto",
      first_name: "Anna",
    });
  });

  test("i blocchi mostrano solo inizio e fine", async () => {
    const { data } = await anonymousClient().rpc("blocked_periods", range);
    const block = data?.find((row) =>
      row.starts_at.startsWith("2030-06-10T15:00"),
    );
    expect(Object.keys(block ?? {}).sort()).toEqual(["ends_at", "starts_at"]);
  });

  test("un intervallo oltre 31 giorni non restituisce nulla", async () => {
    const { data } = await userB.rpc("occupied_slots", {
      p_from: "2030-01-01T00:00:00Z",
      p_to: "2030-12-31T00:00:00Z",
    });
    expect(data).toEqual([]);
  });

  test("la tabella dei blocchi, con il motivo, non è leggibile dagli utenti", async () => {
    expect((await userA.from("blocks").select("reason")).data).toEqual([]);
  });
});

describe("5. nessuno si dà il ruolo superadmin da solo", () => {
  test("modificare i propri metadati non concede il ruolo", async () => {
    const updated = await userA.auth.updateUser({
      data: { role: "superadmin" },
    });
    expect(updated.error).toBeNull();
    await userA.auth.refreshSession();
    const { data: isSuperadmin } = await userA.rpc("is_superadmin");
    expect(isSuperadmin).toBe(false);
    const { data } = await userA.from("profiles").select("id");
    expect(data).toEqual([{ id: idA }]);
  });
});

describe("6. il superadmin legge tutto", () => {
  test("vede profili, prenotazioni e blocchi di tutti", async () => {
    expect((await superadmin.rpc("is_superadmin")).data).toBe(true);
    const profiles = await superadmin
      .from("profiles")
      .select("id")
      .in("id", [idA, idB]);
    expect(profiles.data?.length).toBe(2);
    const bookings = await superadmin
      .from("bookings")
      .select("user_id")
      .in("user_id", [idA, idB]);
    expect(new Set(bookings.data?.map((row) => row.user_id))).toEqual(
      new Set([idA, idB]),
    );
    const blocks = await superadmin
      .from("blocks")
      .select("reason")
      .eq("reason", TEST_BLOCK_REASON);
    expect(blocks.data?.length).toBe(1);
  });

  test("anche il superadmin non scrive direttamente", async () => {
    const result = await superadmin
      .from("sports")
      .insert({ id: "golf", name: "Golf" });
    expect(result.error?.code).toBe("42501");
  });
});

describe("7. configurazione pubblica", () => {
  test("chiunque legge sport, orario e prezzi", async () => {
    const anonymous = anonymousClient();
    for (const table of [
      "sports",
      "opening_intervals",
      "price_rules",
    ] as const) {
      const { error } = await anonymous.from(table).select("*").limit(1);
      expect(error).toBeNull();
    }
    expect(
      (await anonymous.from("sports").select("id").eq("id", "calcetto")).data,
    ).toEqual([{ id: "calcetto" }]);
  });
});
