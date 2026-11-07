/** Unisce classi CSS ignorando i valori vuoti. */
export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
