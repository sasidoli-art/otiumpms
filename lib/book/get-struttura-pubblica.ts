/**
 * Helper per caricare una struttura pubblica (booking engine) con tutti i dati
 * branding e lo stato dei moduli attivi dell'host.
 *
 * Usato da:
 *  - /book/[strutturaId]/page.tsx (landing)
 *  - /book/[strutturaId]/camere (booking camere)
 *  - /book/[strutturaId]/spa (booking SPA)
 *  - /book/[strutturaId]/ristorante (futuro)
 *  - components/book/booking-layout.tsx (shell)
 */

import { prisma } from '@/lib/db'
import { parseModuli } from '@/lib/moduli'

export type StrutturaPubblica = {
  id: string
  nome: string
  descrizione: string | null
  indirizzo: string | null
  citta: string | null
  regione: string | null
  logo: string | null
  fotoHero: string | null
  colorePrimario: string | null
  coloreSecondario: string | null
  messaggioChiusura: string | null
  linkFacebook: string | null
  linkInstagram: string | null
  linkSitoWeb: string | null
  nomeAzienda: string
  telefonoHost: string | null
  emailHost: string | null
  hostId: string
  moduli: {
    prenotazioni: boolean
    spa: boolean
    ristorazione: boolean
    pacchetti: boolean
  }
}

export async function getStrutturaPubblica(strutturaId: string): Promise<StrutturaPubblica | null> {
  const s = await prisma.struttura.findFirst({
    where: { id: strutturaId, attiva: true },
    select: {
      id: true,
      nome: true,
      descrizione: true,
      indirizzo: true,
      citta: true,
      regione: true,
      logo: true,
      fotoHero: true,
      colorePrimario: true,
      coloreSecondario: true,
      messaggioChiusura: true,
      linkFacebook: true,
      linkInstagram: true,
      linkSitoWeb: true,
      hostId: true,
      host: {
        select: {
          nomeAzienda: true,
          telefono: true,
          moduliAttivi: true,
          user: { select: { email: true } },
        },
      },
    },
  })
  if (!s) return null

  const moduli = parseModuli(s.host.moduliAttivi)
  // Pacchetti sono sempre disponibili se esiste almeno un pacchetto attivo sulla struttura
  const [hasPacchetti, hasTrattamenti] = await Promise.all([
    prisma.pacchetto.count({
      where: {
        strutturaId: s.id, attivo: true,
        OR: [{ dataFine: null }, { dataFine: { gte: new Date() } }],
      },
    }),
    moduli.spa
      ? prisma.trattamentoSpa.count({
          where: { attivo: true, prenotabileOnline: true, host: { strutture: { some: { id: s.id } } } },
        })
      : Promise.resolve(0),
  ])

  return {
    id: s.id,
    nome: s.nome,
    descrizione: s.descrizione,
    indirizzo: s.indirizzo,
    citta: s.citta,
    regione: s.regione,
    logo: s.logo,
    fotoHero: s.fotoHero,
    colorePrimario: s.colorePrimario,
    coloreSecondario: s.coloreSecondario,
    messaggioChiusura: s.messaggioChiusura,
    linkFacebook: s.linkFacebook,
    linkInstagram: s.linkInstagram,
    linkSitoWeb: s.linkSitoWeb,
    nomeAzienda: s.host.nomeAzienda,
    telefonoHost: s.host.telefono ?? null,
    emailHost: s.host.user.email,
    hostId: s.hostId,
    moduli: {
      prenotazioni: moduli.prenotazioni !== false, // default true
      spa: !!(moduli.spa && hasTrattamenti > 0),
      ristorazione: !!moduli.ristorazione,
      pacchetti: hasPacchetti > 0,
    },
  }
}
