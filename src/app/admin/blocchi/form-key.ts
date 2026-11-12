export type BlockFields = {
  fromDate: string;
  fromTime: string;
  toDate: string;
  toTime: string;
  wholeDays: string;
  reason: string;
};

/** Chiave dei campi del modulo: la conferma vale solo per i campi per cui è stata chiesta. */
export function blockFormKey(fields: BlockFields): string {
  // Con le giornate intere gli orari non vengono inviati: non fanno parte della chiave.
  const wholeDays = fields.wholeDays === "on";
  return JSON.stringify([
    fields.fromDate,
    wholeDays ? "" : fields.fromTime,
    fields.toDate,
    wholeDays ? "" : fields.toTime,
    fields.wholeDays,
    fields.reason,
  ]);
}
