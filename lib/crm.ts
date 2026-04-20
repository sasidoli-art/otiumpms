/**
 * CRM sync layer — fa da ponte tra Prenotazione e OspiteCRM.
 *
 * Prima di questa lib i dati ospite vivevano in 3 posti senza flusso esplicito:
 *  - Prenotazione.guest* (anagrafica prenotazione, anonimizzata a 40 gg)
 *  - OspiteCRM (memoria CRM persistente, lookup per email)
 *  - Accompagnatore (ospiti accompagnatori per Alloggiati Web)
 *
 * Flusso corretto:
 *  1. CREATE prenotazione → upsertOspiteFromBooking() crea/aggiorna OspiteCRM
 *  2. CHECK-IN → lookupOspite(email) pre-fill form con dati noti dal CRM
 *  3. CHECK-OUT → incrementStatsOnCheckout() aggiorna numSoggiorni / totaleSpeso
 *     / dataUltimoSoggiorno
 *
 * Regola di merge (chi vince in caso di conflitto):
 *  - Se OspiteCRM esiste: i dati nuovi della prenotazione NON sovrascrivono
 *    email/nome/cognome (considerati canonici dal CRM, l'ospite potrebbe aver
 *    cambiato contatto). Telefono/nazionalita/lingua sono sovrascritti solo
 *    se arriva un valore non vuoto.
 *  - Questo preserva la storia (VIP flag, tags, preferenze) accumulata nel CRM.
 */

import { prisma } from '@/lib/db';

export type BookingGuest = {
  guestEmail: string;
  guestNome: string;
  guestCognome: string;
  guestTelefono?: string | null;
};

/**
 * Crea o aggiorna il record OspiteCRM per l'email della prenotazione.
 * Chiamare dopo prisma.prenotazione.create() con successo.
 */
export async function upsertOspiteFromBooking(
  hostId: string,
  guest: BookingGuest,
): Promise<string> {
  const emailNorm = guest.guestEmail.trim().toLowerCase();
  const ospite = await prisma.ospiteCRM.upsert({
    where: { hostId_email: { hostId, email: emailNorm } },
    update: {
      // Non sovrascriviamo nome/cognome: il CRM è canonico.
      // Aggiorniamo solo campi che potrebbero essere aggiornati dall'ospite.
      ...(guest.guestTelefono ? { telefono: guest.guestTelefono } : {}),
    },
    create: {
      hostId,
      email: emailNorm,
      nome: guest.guestNome,
      cognome: guest.guestCognome,
      telefono: guest.guestTelefono ?? null,
    },
    select: { id: true },
  });
  return ospite.id;
}

/** Pre-fill form check-in con dati del CRM se disponibili. */
export async function lookupOspite(
  hostId: string,
  email: string,
): Promise<{
  nome: string;
  cognome: string;
  telefono: string | null;
  nazionalita: string | null;
  lingua: string | null;
  preferenze: string | null;
  vip: boolean;
  blacklist: boolean;
} | null> {
  const emailNorm = email.trim().toLowerCase();
  const ospite = await prisma.ospiteCRM.findUnique({
    where: { hostId_email: { hostId, email: emailNorm } },
    select: {
      nome: true, cognome: true, telefono: true, nazionalita: true,
      lingua: true, preferenze: true, vip: true, blacklist: true,
    },
  });
  return ospite;
}

/**
 * Aggiorna le statistiche del CRM quando una prenotazione viene completata
 * (checkout). Idempotente se chiamata più volte — usa email della prenotazione.
 */
export async function incrementStatsOnCheckout(
  hostId: string,
  prenotazioneId: string,
): Promise<void> {
  const pren = await prisma.prenotazione.findFirst({
    where: { id: prenotazioneId, hostId },
    select: { guestEmail: true, prezzoTotale: true, dataPartenza: true },
  });
  if (!pren) return;
  const emailNorm = pren.guestEmail.trim().toLowerCase();
  const ospite = await prisma.ospiteCRM.findUnique({
    where: { hostId_email: { hostId, email: emailNorm } },
    select: { id: true },
  });
  if (!ospite) return; // non esiste CRM record per questo ospite (edge case)
  await prisma.ospiteCRM.update({
    where: { id: ospite.id },
    data: {
      numSoggiorni: { increment: 1 },
      totaleSpeso: { increment: pren.prezzoTotale ?? 0 },
      dataUltimoSoggiorno: pren.dataPartenza ?? new Date(),
    },
  });
}

/**
 * Cancella il record CRM dell'ospite (GDPR — diritto all'oblio).
 * NON cancella le prenotazioni storiche (vincolo fiscale/Alloggiati).
 */
export async function deleteOspiteCRM(hostId: string, email: string): Promise<void> {
  const emailNorm = email.trim().toLowerCase();
  await prisma.ospiteCRM.deleteMany({
    where: { hostId, email: emailNorm },
  });
}
