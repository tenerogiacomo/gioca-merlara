import { afterAll, beforeAll, describe, expect, test } from "vitest";
import {
  createAdminClient,
  findUserByPhone,
  requireDevelopmentProject,
  requireEnv,
  resetTestData,
} from "../../scripts/lib/admin";
import { anonymousClient, signedInClient, type Client } from "./helpers";

const admin = createAdminClient();
const TEST_REASON = "test: blocchi e annulli";
const TEST_SPORT = "test-sport-blocchi";

let idA: string;
let userA: Client;

/** Istante nel 2031 (lontano dai dati reali), all'ora UTC indicata. */
const at = (day: number, hour: number, minute = 0) =>
  new Date(Date.UTC(2031, 2, day, hour, minute)).toISOString();

async function insertBooking(startsAt: string, endsAt: string) {
  const { data, error } = await admin
    .from("bookings")
    .insert({
      user_id: idA,
      sport_id: TEST_SPORT,
      starts_at: startsAt,
      ends_at: endsAt,
      price_cents: 0,
      autocert_version: "test",
      autocert_accepted_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  return { id: data?.id, error };
}

function createBlock(
  startsAt: string,
  endsAt: string,
  confirmedIds: string[] = [],
  client: Client = admin,
) {
  return client.rpc("create_block", {
    p_starts_at: startsAt,
    p_ends_at: endsAt,
    p_reason: TEST_REASON,
    p_created_by: null as unknown as string,
    p_confirmed_ids: confirmedIds,
  });
}

async function cleanUp() {
  await resetTestData(admin);
  const blocks = await admin.from("blocks").delete().eq("reason", TEST_REASON);
  if (blocks.error) throw blocks.error;
  const sport = await admin.from("sports").delete().eq("id", TEST_SPORT);
  if (sport.error) throw sport.error;
}

beforeAll(async () => {
  requireDevelopmentProject();
  await cleanUp();
  const sport = await admin.from("sports").insert({
    id: TEST_SPORT,
    name: "Sport di prova (blocchi)",
    active: false,
    sort_order: 98,
  });
  if (sport.error) throw sport.error;
  userA = await signedInClient("USER_A");
  idA = (await findUserByPhone(admin, requireEnv("TEST_PHONE_USER_A")))!.id;
  const profile = await admin.from("profiles").insert({
    id: idA,
    first_name: "Anna",
    last_name: "Prova",
    birth_date: "1990-01-01",
    tax_code: "PRVNNA90A41A001A",
  });
  if (profile.error) throw profile.error;
});

afterAll(cleanUp);

describe("1. blocco con annullo delle prenotazioni coinvolte", () => {
  test("senza prenotazioni il blocco si salva subito, anche a mezz'ore", async () => {
    const { data, error } = await createBlock(at(3, 9, 30), at(3, 10, 30));
    expect(error).toBeNull();
    expect(data).toMatchObject({ status: "created", cancelled: 0 });
  });

  test("un blocco non allineato alle mezz'ore viene rifiutato", async () => {
    const { error } = await createBlock(at(3, 11, 15), at(3, 12));
    expect(error).not.toBeNull();
  });

  test("con prenotazioni non confermate non salva nulla e le elenca", async () => {
    const booking = await insertBooking(at(4, 17), at(4, 19));
    expect(booking.error).toBeNull();
    const { data, error } = await createBlock(at(4, 18, 30), at(4, 20));
    expect(error).toBeNull();
    expect(data).toEqual({ status: "confirm", booking_ids: [booking.id] });

    const blocks = await admin
      .from("blocks")
      .select("id")
      .eq("starts_at", at(4, 18, 30));
    expect(blocks.data).toHaveLength(0);
    const row = await admin
      .from("bookings")
      .select("status")
      .eq("id", booking.id!)
      .single();
    expect(row.data?.status).toBe("active");
  });

  test("con la conferma annulla d'ufficio con il motivo e salva il blocco insieme", async () => {
    const booking = await insertBooking(at(5, 17), at(5, 18));
    const { data } = await createBlock(at(5, 17), at(5, 18), [booking.id!]);
    expect(data).toMatchObject({ status: "created", cancelled: 1 });
    const row = await admin
      .from("bookings")
      .select("status, cancel_reason, cancelled_at")
      .eq("id", booking.id!)
      .single();
    expect(row.data).toMatchObject({
      status: "cancelled_by_admin",
      cancel_reason: TEST_REASON,
    });
    expect(row.data?.cancelled_at).not.toBeNull();
  });

  test("una conferma non più valida (nuova prenotazione nel periodo) richiede di nuovo la conferma", async () => {
    const first = await insertBooking(at(6, 8), at(6, 9));
    const second = await insertBooking(at(6, 9), at(6, 10));
    const { data } = await createBlock(at(6, 8), at(6, 10), [first.id!]);
    expect(data).toMatchObject({ status: "confirm" });
    expect((data as { booking_ids: string[] }).booking_ids.toSorted()).toEqual(
      [first.id, second.id].toSorted(),
    );
  });

  test("se una prenotazione confermata è stata annullata nel frattempo, il blocco si salva", async () => {
    const booking = await insertBooking(at(7, 8), at(7, 9));
    await admin
      .from("bookings")
      .update({
        status: "cancelled_by_user",
        cancelled_at: new Date().toISOString(),
      })
      .eq("id", booking.id!);
    const { data } = await createBlock(at(7, 8), at(7, 9), [booking.id!]);
    expect(data).toMatchObject({ status: "created", cancelled: 0 });
  });

  test("un blocco nel passato viene rifiutato", async () => {
    const { error } = await createBlock(
      "2020-01-01T10:00:00Z",
      "2020-01-01T11:00:00Z",
    );
    expect(error?.message).toContain("block_in_past");
  });

  test("un blocco su una prenotazione già iniziata viene rifiutato", async () => {
    const now = Date.now();
    const hour = 60 * 60 * 1000;
    const started = new Date(Math.floor(now / hour) * hour - hour);
    const booking = await insertBooking(
      started.toISOString(),
      new Date(started.getTime() + 3 * hour).toISOString(),
    );
    expect(booking.error).toBeNull();
    const from = new Date(Math.floor(now / hour) * hour + hour);
    const { error } = await createBlock(
      from.toISOString(),
      new Date(from.getTime() + hour).toISOString(),
      [booking.id!],
    );
    expect(error?.message).toContain("block_hits_started_booking");
    await admin.from("bookings").delete().eq("id", booking.id!);
  });

  test("un blocco e una prenotazione nello stesso istante non passano entrambi", async () => {
    for (let round = 0; round < 6; round++) {
      const startsAt = at(10 + round, 12);
      const endsAt = at(10 + round, 13);
      const [block, booking] = await Promise.all([
        createBlock(startsAt, endsAt),
        insertBooking(startsAt, endsAt),
      ]);
      const blockCreated =
        !block.error && (block.data as { status: string }).status === "created";
      const bookingSaved = !booking.error;
      expect(blockCreated && bookingSaved, `giro ${round}`).toBe(false);
      expect(blockCreated || bookingSaved, `giro ${round}`).toBe(true);
    }
  });
});

describe("2. eliminazione dallo storico", () => {
  const from = "2021-01-01T00:00:00Z";
  const to = "2021-02-01T00:00:00Z";
  let pastIds: string[] = [];

  beforeAll(async () => {
    const one = await insertBooking(
      "2021-01-05T10:00:00Z",
      "2021-01-05T11:00:00Z",
    );
    const two = await insertBooking(
      "2021-01-20T10:00:00Z",
      "2021-01-20T12:00:00Z",
    );
    pastIds = [one.id!, two.id!];
  });

  test("un elenco diverso dalle prenotazioni del periodo non elimina nulla", async () => {
    const { error } = await admin.rpc("delete_bookings", {
      p_from: from,
      p_to: to,
      p_ids: [pastIds[0]],
    });
    expect(error?.message).toContain("export_outdated");
    const rows = await admin.from("bookings").select("id").in("id", pastIds);
    expect(rows.data).toHaveLength(2);
  });

  test("le prenotazioni non ancora concluse non si eliminano", async () => {
    const future = await insertBooking(at(20, 10), at(20, 11));
    const { error } = await admin.rpc("delete_bookings", {
      p_from: at(20, 0),
      p_to: at(21, 0),
      p_ids: [future.id!],
    });
    expect(error?.message).toContain("export_outdated");
  });

  test("con l'elenco esatto elimina le prenotazioni del periodo", async () => {
    const { data, error } = await admin.rpc("delete_bookings", {
      p_from: from,
      p_to: to,
      p_ids: pastIds,
    });
    expect(error).toBeNull();
    expect(data).toBe(2);
    const rows = await admin.from("bookings").select("id").in("id", pastIds);
    expect(rows.data).toHaveLength(0);
  });
});

describe("3. funzioni riservate al server", () => {
  test("utenti e visitatori non eseguono blocchi, eliminazioni né leggono i telefoni", async () => {
    for (const client of [userA, anonymousClient()]) {
      const block = await createBlock(at(25, 10), at(25, 11), [], client);
      expect(block.error).not.toBeNull();
      const deletion = await client.rpc("delete_bookings", {
        p_from: "2021-01-01T00:00:00Z",
        p_to: "2021-02-01T00:00:00Z",
        p_ids: [],
      });
      expect(deletion.error).not.toBeNull();
      const phones = await client.rpc("user_phones", { p_ids: [idA] });
      expect(phones.error).not.toBeNull();
    }
  });

  test("il server legge il telefono di chi ha prenotato", async () => {
    const { data, error } = await admin.rpc("user_phones", { p_ids: [idA] });
    expect(error).toBeNull();
    expect(data).toEqual([{ id: idA, phone: requireEnv("TEST_PHONE_USER_A") }]);
  });
});
