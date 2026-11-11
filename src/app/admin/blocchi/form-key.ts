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
  return JSON.stringify([
    fields.fromDate,
    fields.fromTime,
    fields.toDate,
    fields.toTime,
    fields.wholeDays,
    fields.reason,
  ]);
}
