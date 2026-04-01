'use client'

import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { useTranslations } from 'next-intl'
import type { Prenotazione } from '@prisma/client'

const docLabel: Record<string, string> = {
  PPORT: 'Passaporto',
  IDENTE: "Carta d'identità",
  PATEN: 'Patente',
  PERMSOS: 'Perm. soggiorno',
}

interface RicevutaClientProps {
  prenotazione: Prenotazione & {
    struttura: { nome: string; indirizzo: string | null; citta: string | null; regione: string | null } | null
    unita: { nome: string } | null
    host: {
      nomeAzienda: string | null
      partitaIva: string | null
      indirizzo: string | null
      citta: string | null
      cap: string | null
      provincia: string | null
      telefono: string | null
    } | null
  }
  notti: number | null
}

export default function RicevutaClient({ prenotazione: p, notti }: RicevutaClientProps) {
  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; font-size: 13px; color: #1a1a2e; background: white; }
        .page { max-width: 700px; margin: 0 auto; padding: 40px 32px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #6366f1; padding-bottom: 20px; margin-bottom: 24px; }
        .logo { font-size: 22px; font-weight: 800; color: #6366f1; }
        .logo span { color: #1a1a2e; }
        .host-info { text-align: right; font-size: 11px; color: #666; line-height: 1.6; }
        h1 { font-size: 18px; font-weight: 700; color: #1a1a2e; margin-bottom: 4px; }
        .subtitle { font-size: 12px; color: #888; }
        .section { margin-bottom: 20px; }
        .section-title { font-size: 11px; font-weight: 600; color: #6366f1; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
        .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
        .field label { font-size: 10px; color: #888; display: block; margin-bottom: 2px; }
        .field span { font-weight: 500; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 600; }
        .badge-green { background: #d1fae5; color: #065f46; }
        .badge-yellow { background: #fef3c7; color: #92400e; }
        .badge-red { background: #fee2e2; color: #991b1b; }
        .badge-blue { background: #dbeafe; color: #1e40af; }
        .total-box { background: #f5f3ff; border: 1px solid #e0e7ff; border-radius: 8px; padding: 12px 16px; margin-top: 16px; }
        .total-row { display: flex; justify-content: space-between; font-size: 13px; padding: 3px 0; }
        .total-row.main { font-weight: 700; font-size: 15px; color: #6366f1; border-top: 1px solid #c7d2fe; margin-top: 6px; padding-top: 6px; }
        .footer { margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 16px; font-size: 10px; color: #999; display: flex; justify-content: space-between; }
        .print-btn { position: fixed; bottom: 24px; right: 24px; background: #6366f1; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px rgba(99,102,241,0.4); }
        @media print {
          .print-btn { display: none; }
          body { padding: 0; }
          .page { padding: 20px; }
        }
      `}</style>

      <div className="page">
          {/* Header */}
          <div className="header">
            <div>
              <p className="logo">Otium<span> Week</span></p>
              <p style={{ fontSize: 11, color: '#888', marginTop: 4 }}>Gestionale PMS</p>
            </div>
            <div className="host-info">
              <p style={{ fontWeight: 700, fontSize: 13, color: '#1a1a2e' }}>
                {p.host?.nomeAzienda}
              </p>
              {p.host?.indirizzo && <p>{p.host.indirizzo}</p>}
              {p.host?.citta && (
                <p>
                  {p.host.citta} {p.host.cap} ({p.host.provincia})
                </p>
              )}
              {p.host?.partitaIva && <p>P.IVA: {p.host.partitaIva}</p>}
              {p.host?.telefono && <p>Tel: {p.host.telefono}</p>}
            </div>
          </div>

          {/* Title */}
          <div
            style={{
              marginBottom: 24,
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <h1>Documento di prenotazione</h1>
              <p className="subtitle">
                Emesso il {format(new Date(), 'd MMMM yyyy', { locale: it })}
              </p>
            </div>
            <span
              className={`badge ${
                p.stato === 'CONFERMATA'
                  ? 'badge-green'
                  : p.stato === 'ANNULLATA'
                    ? 'badge-red'
                    : p.stato === 'COMPLETATA'
                      ? 'badge-blue'
                      : 'badge-yellow'
              }`}
            >
              {p.stato === 'CONFERMATA'
                ? 'CONFERMATA'
                : p.stato === 'COMPLETATA'
                  ? 'COMPLETATA'
                  : p.stato === 'ANNULLATA'
                    ? 'ANNULLATA'
                    : 'IN ATTESA'}
            </span>
          </div>

          {/* Ospite */}
          <div className="section">
            <p className="section-title">Ospite</p>
            <div className="grid2">
              <div className="field">
                <label>Nome e cognome</label>
                <span>
                  {p.guestNome} {p.guestCognome}
                </span>
              </div>
              <div className="field">
                <label>Email</label>
                <span>{p.guestEmail}</span>
              </div>
              {p.guestTelefono && (
                <div className="field">
                  <label>Telefono</label>
                  <span>{p.guestTelefono}</span>
                </div>
              )}
              {p.guestSesso && (
                <div className="field">
                  <label>Sesso</label>
                  <span>{p.guestSesso === 'M' ? 'Maschio' : 'Femmina'}</span>
                </div>
              )}
              {p.guestDataNascita && (
                <div className="field">
                  <label>Data di nascita</label>
                  <span>
                    {format(new Date(p.guestDataNascita), 'd MMM yyyy', { locale: it })}
                  </span>
                </div>
              )}
              {p.guestLuogoNascita && (
                <div className="field">
                  <label>Luogo di nascita</label>
                  <span>
                    {p.guestLuogoNascita} ({p.guestProvinciaNascita})
                  </span>
                </div>
              )}
              {p.guestTipoDocumento && (
                <div className="field">
                  <label>Documento</label>
                  <span>
                    {docLabel[p.guestTipoDocumento] ?? p.guestTipoDocumento} n°{' '}
                    {p.guestNumeroDocumento}
                  </span>
                </div>
              )}
              {p.guestLuogoRilascio && (
                <div className="field">
                  <label>Rilasciato a</label>
                  <span>
                    {p.guestLuogoRilascio} ({p.guestProvinciaRilascio})
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Struttura */}
          <div className="section">
            <p className="section-title">Struttura</p>
            <div className="grid2">
              <div className="field">
                <label>Nome struttura</label>
                <span>{p.struttura?.nome ?? '—'}</span>
              </div>
              {p.unita && (
                <div className="field">
                  <label>Unità / Camera</label>
                  <span>{p.unita.nome}</span>
                </div>
              )}
              {p.struttura?.indirizzo && (
                <div className="field">
                  <label>Indirizzo</label>
                  <span>
                    {p.struttura.indirizzo}, {p.struttura.citta}
                  </span>
                </div>
              )}
              {p.fonte && (
                <div className="field">
                  <label>Fonte</label>
                  <span>{p.fonte}</span>
                </div>
              )}
            </div>
          </div>

          {/* Soggiorno */}
          <div className="section">
            <p className="section-title">Soggiorno</p>
            <div className="grid2">
              <div className="field">
                <label>Arrivo</label>
                <span>
                  {format(new Date(p.dataArrivo), 'eeee d MMMM yyyy', { locale: it })}
                </span>
              </div>
              {p.dataPartenza && (
                <div className="field">
                  <label>Partenza</label>
                  <span>
                    {format(new Date(p.dataPartenza), 'eeee d MMMM yyyy', { locale: it })}
                  </span>
                </div>
              )}
              {notti && (
                <div className="field">
                  <label>Notti</label>
                  <span>{notti}</span>
                </div>
              )}
              <div className="field">
                <label>Ospiti</label>
                <span>{p.numOspiti}</span>
              </div>
            </div>

            {/* Totale */}
            {(p.prezzoTotale != null || p.acconto != null) && (
              <div className="total-box">
                {p.acconto != null && (
                  <div className="total-row">
                    <span>Acconto ricevuto</span>
                    <span>€ {p.acconto.toFixed(2)}</span>
                  </div>
                )}
                {p.prezzoTotale != null && p.acconto != null && (
                  <div className="total-row">
                    <span>Saldo da pagare</span>
                    <span>€ {(p.prezzoTotale - p.acconto).toFixed(2)}</span>
                  </div>
                )}
                {p.prezzoTotale != null && (
                  <div className="total-row main">
                    <span>Totale prenotazione</span>
                    <span>€ {p.prezzoTotale.toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Note */}
          {(p.guestNote || p.noteInterne) && (
            <div className="section">
              <p className="section-title">Note</p>
              {p.guestNote && (
                <p style={{ marginBottom: 6 }}>
                  <strong>Ospite:</strong> {p.guestNote}
                </p>
              )}
              {p.noteInterne && (
                <p>
                  <strong>Interne:</strong> {p.noteInterne}
                </p>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="footer">
            <span>
              ID: {p.id} · Creato il {format(new Date(p.createdAt), 'd/MM/yyyy HH:mm', { locale: it })}
            </span>
            <span>{p.host?.nomeAzienda} · Otium Week PMS</span>
          </div>
        </div>

        <button className="print-btn" onClick={() => window.print()}>
          Stampa / Salva PDF
        </button>
      </>
  )
}
