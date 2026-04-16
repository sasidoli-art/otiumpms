import { NextRequest, NextResponse } from 'next/server'
import { validatePin } from '@/lib/guest-pin'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { isModuloAttivo } from '@/lib/moduli'

/**
 * POST /api/guest/auth-pin
 * Body: { hostId: string, pin: string }
 *
 * Valida il PIN ospite e restituisce contesto completo:
 * prenotazione, camera, struttura, servizi disponibili.
 * Usato da: directory camera, WiFi login, concierge, richieste.
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const rl = rateLimit(`guest-pin:${ip}`, { windowMs: 60_000, max: 10 })
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Troppi tentativi. Riprova tra poco.' },
      { status: 429 },
    )
  }

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  const { hostId, pin } = body as { hostId?: string; pin?: string }
  if (!hostId || !pin || typeof pin !== 'string' || pin.length < 4) {
    return NextResponse.json({ error: 'hostId e pin (4+ cifre) obbligatori' }, { status: 422 })
  }

  const prenotazione = await validatePin(hostId, pin.trim())
  if (!prenotazione) {
    return NextResponse.json({ error: 'PIN non valido o prenotazione non attiva' }, { status: 401 })
  }

  const moduli = prenotazione.host.moduliAttivi
  const servizi = {
    wifi: isModuloAttivo(moduli, 'wifi'),
    spa: isModuloAttivo(moduli, 'spa'),
    ristorazione: isModuloAttivo(moduli, 'ristorazione'),
    concierge: isModuloAttivo(moduli, 'concierge') && prenotazione.host.conciergeAttivo,
    eventi: isModuloAttivo(moduli, 'eventi'),
    housekeeping: isModuloAttivo(moduli, 'housekeeping'),
    manutenzione: isModuloAttivo(moduli, 'manutenzione'),
  }

  return NextResponse.json({
    ok: true,
    guest: {
      nome: prenotazione.guestNome,
      cognome: prenotazione.guestCognome,
      prenotazioneId: prenotazione.id,
    },
    camera: prenotazione.unita ? {
      id: prenotazione.unita.id,
      nome: prenotazione.unita.nome,
      descrizione: prenotazione.unita.descrizione,
    } : null,
    struttura: prenotazione.struttura ? {
      id: prenotazione.struttura.id,
      nome: prenotazione.struttura.nome,
      citta: prenotazione.struttura.citta,
      indirizzo: prenotazione.struttura.indirizzo,
    } : null,
    soggiorno: {
      dataArrivo: prenotazione.dataArrivo,
      dataPartenza: prenotazione.dataPartenza,
      numOspiti: prenotazione.numOspiti,
    },
    host: {
      nome: prenotazione.host.nomeAzienda,
      telefono: prenotazione.host.telefono,
      email: prenotazione.host.emailMittente,
    },
    servizi,
  })
}
