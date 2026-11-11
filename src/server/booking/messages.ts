import type { BookingRequestError } from "@/domain/booking-request";

/** Messaggi per gli errori di prenotazione: cosa è successo e cosa fare (DESIGN.md §10). */
export function bookingErrorMessage(
  error: BookingRequestError | "not_accepted",
): string {
  switch (error) {
    case "booked":
      return "Qualcuno ha appena prenotato questo orario: scegline un altro.";
    case "blocked":
      return "In questo orario la struttura non è disponibile: scegline un altro.";
    case "past":
      return "Questo orario è già iniziato: scegline uno successivo.";
    case "beyond_horizon":
      return "Si prenota al massimo due settimane prima: scegli un giorno più vicino.";
    case "outside_opening_hours":
    case "not_aligned":
      return "Questo orario non è valido: scegline uno dal calendario.";
    case "invalid_duration":
      return "Scegli per quante ore vuoi prenotare.";
    case "unknown_sport":
    case "unpriced":
      return "Questo sport non è prenotabile in questo orario: scegline un altro.";
    case "mixed_free_paid":
      return "Le ore gratuite si prenotano a parte: scegli una durata che resti tutta nella fascia gratuita o tutta in quella a pagamento.";
    case "not_accepted":
      return "Per prenotare devi accettare l'autocertificazione.";
  }
}
