# Visual Audit — Otium PMS

> Generato: 2026-04-27 10:10:23 · Eseguibile: `npx ts-node scripts/visual-audit.ts`

## Cosa è questo report

Audit **statico euristico** dell'adozione del design system.
Ogni pagina viene letta + i suoi sibling client component nella stessa folder.
Le regex applicate sono best-effort: falsi positivi e negativi sono possibili.

**Cosa il report NON copre** (richiede browser/Playwright/manuale):
- Visibilità reale del focus ring
- Contrasto colori misurato (WCAG AA)
- Touch target size effettivo
- Hover behavior, animazioni renderizzate
- Overflow orizzontale a 375px

Marker:
- ✅ Heuristic pass
- ⚠️ Warning (probabile issue, falso positivo possibile)
- ❌ Fail (issue netto da fixare)
- — Non applicabile / non determinabile staticamente

## Sintesi

**148 pagine** auditate · **1184 check** totali
- ✅ Pass: **720** (61%)
- ⚠️ Warning: **403** (34%)
- ❌ Fail: **7** (1%)
- — Not applicable: **54** (5%)

## Tabella

| Pagina | Tipo | Spacing | Colori | Comp | Resp | Load | Anim | A11y |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `/book` | ✅ | ⚠️ | ✅ | ✅ | ✅ | — | ✅ | ✅ |
| `/book/[strutturaId]` | ⚠️ | ✅ | ⚠️ | ⚠️ | ✅ | ⚠️ | ✅ | ✅ |
| `/book/[strutturaId]/camere` | ✅ | ⚠️ | ✅ | ✅ | ⚠️ | — | ✅ | ✅ |
| `/book/[strutturaId]/pacchetti` | ✅ | ⚠️ | ✅ | ✅ | ✅ | — | ✅ | ✅ |
| `/book/[strutturaId]/pasti` | ⚠️ | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ |
| `/book/[strutturaId]/ristorante` | ✅ | ⚠️ | ✅ | ✅ | ⚠️ | — | ✅ | ✅ |
| `/book/[strutturaId]/spa` | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | ✅ |
| `/book/chat/[id]` | ⚠️ | ⚠️ | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ |
| `/book/conferma/[token]` | ⚠️ | ⚠️ | ⚠️ | ✅ | ✅ | — | ✅ | ✅ |
| `/checkin/[token]` | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ✅ | ✅ | ⚠️ |
| `/kiosk/[token]` | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ✅ | ✅ | ⚠️ | ✅ |
| `/kiosk/spa/[cabinaId]` | ⚠️ | ⚠️ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ |
| `/g/[strutturaId]/[pin]` | ⚠️ | ✅ | ⚠️ | ✅ | ✅ | — | ✅ | ✅ |
| `/g/[strutturaId]/[pin]/directory` | ⚠️ | ⚠️ | ⚠️ | ✅ | ⚠️ | — | ✅ | ✅ |
| `/wifi/[strutturaId]` | ✅ | ⚠️ | ✅ | ✅ | ⚠️ | — | ✅ | ✅ |
| `/wifi/login` | ⚠️ | ⚠️ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ |
| `/reception/display/[strutturaId]` | ✅ | ⚠️ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | ✅ |
| `/reception/spa-concierge/[strutturaId]` | ✅ | ⚠️ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | ✅ |
| `/reception/spa/[cabinaId]` | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/host/abbonamento` | ✅ | ⚠️ | ✅ | ⚠️ | ✅ | ⚠️ | ✅ | ✅ |
| `/host/alloggiati` | ✅ | ⚠️ | ✅ | ✅ | ⚠️ | — | ✅ | ✅ |
| `/host/allotment` | ✅ | ⚠️ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ |
| `/host/analytics` | ✅ | ✅ | ✅ | ✅ | ⚠️ | — | ✅ | ✅ |
| `/host/audit` | ✅ | ⚠️ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ |
| `/host/booking-engine` | ✅ | ✅ | ✅ | ✅ | — | — | ✅ | ✅ |
| `/host/business-intelligence` | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/host/calendario` | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ✅ | — | ✅ | ✅ |
| `/host/canali` | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ |
| `/host/cassa` | ✅ | ⚠️ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ⚠️ |
| `/host/concierge` | ⚠️ | ⚠️ | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ |
| `/host/concierge/[id]` | ⚠️ | ⚠️ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ |
| `/host/concierge/impostazioni` | ✅ | ⚠️ | ✅ | ✅ | ⚠️ | — | ✅ | ✅ |
| `/host/concierge/test` | ⚠️ | ⚠️ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ |
| `/host/crm` | ✅ | ⚠️ | ✅ | ✅ | ⚠️ | — | ✅ | ✅ |
| `/host/crm/[id]` | ✅ | ⚠️ | ✅ | ✅ | ⚠️ | — | ✅ | ✅ |
| `/host/dashboard` | ✅ | ⚠️ | ⚠️ | ✅ | ⚠️ | — | ✅ | ✅ |
| `/host/dpa` | ✅ | ⚠️ | ✅ | ✅ | ⚠️ | — | ✅ | ✅ |
| `/host/email-automatiche` | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/host/fatture` | ✅ | ⚠️ | ✅ | ✅ | ⚠️ | — | ✅ | ✅ |
| `/host/fatture-emesse` | ✅ | ⚠️ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ⚠️ |
| `/host/fatture/nuova` | ⚠️ | ⚠️ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ⚠️ |
| `/host/gdpr` | ⚠️ | ⚠️ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ |
| `/host/gdpr/dpa` | ✅ | ⚠️ | ✅ | ✅ | ✅ | — | ✅ | ✅ |
| `/host/help` | ⚠️ | ⚠️ | ✅ | ⚠️ | ✅ | — | ✅ | ✅ |
| `/host/housekeeping` | ⚠️ | ⚠️ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ |
| `/host/housekeeping/[unitaId]` | ⚠️ | ⚠️ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ |
| `/host/housekeeping/biancheria` | ⚠️ | ⚠️ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ⚠️ |
| `/host/impostazioni-checkin` | ✅ | ⚠️ | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ |
| `/host/impostazioni-regcard` | ⚠️ | ⚠️ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ |
| `/host/impostazioni-valuta` | ✅ | ⚠️ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ |
| `/host/integrazione` | ✅ | ⚠️ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ |
| `/host/magazzino` | ⚠️ | ⚠️ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ |
| `/host/manutenzione` | ⚠️ | ⚠️ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ |
| `/host/moduli` | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/host/notifiche` | ✅ | ⚠️ | ✅ | ⚠️ | ⚠️ | ⚠️ | ✅ | ⚠️ |
| `/host/oggetti-smarriti` | ⚠️ | ⚠️ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ |
| `/host/oggi` | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/host/onboarding` | ⚠️ | ✅ | ✅ | ⚠️ | ✅ | ✅ | ⚠️ | ✅ |
| `/host/pacchetti` | ✅ | ⚠️ | ✅ | ✅ | ✅ | — | ✅ | ✅ |
| `/host/pacchetti/[id]` | ✅ | ⚠️ | ✅ | ⚠️ | ⚠️ | ⚠️ | ✅ | ⚠️ |
| `/host/pacchetti/nuovo` | ✅ | ⚠️ | ✅ | ⚠️ | ⚠️ | ⚠️ | ✅ | ✅ |
| `/host/pos` | ✅ | ⚠️ | ✅ | ⚠️ | ✅ | ⚠️ | ✅ | ✅ |
| `/host/prenotazioni` | ✅ | ⚠️ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ |
| `/host/prenotazioni/[id]` | ⚠️ | ⚠️ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ⚠️ |
| `/host/prenotazioni/[id]/ricevuta` | ✅ | ⚠️ | ❌ | ✅ | ⚠️ | — | ✅ | ✅ |
| `/host/prenotazioni/nuova` | ⚠️ | ⚠️ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ |
| `/host/profilo` | ✅ | ⚠️ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ |
| `/host/promemoria` | ⚠️ | ⚠️ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ |
| `/host/report` | ⚠️ | ⚠️ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ⚠️ |
| `/host/ristorazione` | ✅ | ⚠️ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ⚠️ |
| `/host/ristorazione/menu` | ⚠️ | ⚠️ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ⚠️ |
| `/host/ristorazione/prenotazioni` | ⚠️ | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ |
| `/host/seleziona-struttura` | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/host/servizi` | ⚠️ | ⚠️ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ |
| `/host/spa` | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | — | ✅ | ✅ |
| `/host/spa/appuntamenti` | ✅ | ⚠️ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ |
| `/host/spa/cabine` | ✅ | ⚠️ | ❌ | ⚠️ | ✅ | ⚠️ | ✅ | ✅ |
| `/host/spa/calendario` | ✅ | ⚠️ | ⚠️ | ⚠️ | ✅ | ⚠️ | ✅ | ⚠️ |
| `/host/spa/gift-card` | ✅ | ⚠️ | ✅ | ⚠️ | ✅ | ⚠️ | ✅ | ⚠️ |
| `/host/spa/loyalty` | ✅ | ⚠️ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | ⚠️ |
| `/host/spa/percorsi` | ✅ | ⚠️ | ❌ | ⚠️ | ⚠️ | ⚠️ | ✅ | ⚠️ |
| `/host/spa/report` | ⚠️ | ⚠️ | ✅ | ⚠️ | ✅ | — | ✅ | ✅ |
| `/host/spa/terapisti` | ⚠️ | ⚠️ | ❌ | ⚠️ | ⚠️ | ⚠️ | ✅ | ✅ |
| `/host/spa/trattamenti` | ⚠️ | ⚠️ | ❌ | ⚠️ | ✅ | ⚠️ | ✅ | ✅ |
| `/host/spa/waiting-list` | ✅ | ⚠️ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ |
| `/host/staff` | ⚠️ | ⚠️ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ⚠️ |
| `/host/strutture` | ✅ | ⚠️ | ✅ | ✅ | ✅ | — | ✅ | ✅ |
| `/host/strutture/[id]` | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | ✅ |
| `/host/strutture/[id]/disponibilita` | ✅ | ⚠️ | ✅ | ⚠️ | ⚠️ | ⚠️ | ✅ | ✅ |
| `/host/strutture/[id]/impostazioni` | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | ✅ |
| `/host/strutture/[id]/pannello` | ✅ | ⚠️ | ❌ | ⚠️ | ✅ | ⚠️ | ✅ | ✅ |
| `/host/strutture/[id]/tariffe` | ⚠️ | ⚠️ | ❌ | ⚠️ | ✅ | ✅ | ✅ | ✅ |
| `/host/strutture/[id]/wifi` | ✅ | ⚠️ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | ✅ |
| `/host/strutture/nuova` | ✅ | ⚠️ | ✅ | ⚠️ | ⚠️ | ⚠️ | ✅ | ✅ |
| `/host/supporto` | ⚠️ | ⚠️ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ |
| `/host/supporto/[id]` | ✅ | ✅ | ✅ | ✅ | ⚠️ | — | ✅ | ✅ |
| `/host/upselling` | ⚠️ | ⚠️ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ |
| `/host/utenti` | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ |
| `/host/wifi` | ⚠️ | ⚠️ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ |
| `/admin/billing` | ✅ | ✅ | ✅ | ✅ | ⚠️ | — | ✅ | ✅ |
| `/admin/clienti` | ✅ | ⚠️ | ✅ | ⚠️ | ⚠️ | — | ✅ | ✅ |
| `/admin/clienti/[id]` | ✅ | ⚠️ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ |
| `/admin/clienti/nuovo` | ✅ | ⚠️ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ |
| `/admin/dashboard` | ✅ | ✅ | ✅ | ✅ | ⚠️ | — | ✅ | ✅ |
| `/admin/fatture` | ✅ | ⚠️ | ✅ | ⚠️ | ⚠️ | — | ✅ | ✅ |
| `/admin/fatture/[id]` | ✅ | ⚠️ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ |
| `/admin/fatture/nuovo` | ✅ | ⚠️ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ |
| `/admin/host` | ✅ | ✅ | ✅ | ✅ | — | — | ✅ | ✅ |
| `/admin/host/[id]` | ✅ | ✅ | ✅ | ✅ | ⚠️ | — | ✅ | ✅ |
| `/admin/impostazioni` | ✅ | ⚠️ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ |
| `/admin/pagamenti` | ✅ | ⚠️ | ✅ | ⚠️ | ⚠️ | ⚠️ | ✅ | ⚠️ |
| `/admin/pagamenti/nuovo` | ✅ | ⚠️ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ |
| `/admin/prenotazioni` | ✅ | ⚠️ | ✅ | ⚠️ | ⚠️ | — | ✅ | ✅ |
| `/admin/ticket` | ⚠️ | ⚠️ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ |
| `/admin/ticket/[id]` | ✅ | ✅ | ✅ | ✅ | ⚠️ | — | ✅ | ✅ |
| `/superadmin` | ✅ | ✅ | ✅ | ✅ | — | — | ✅ | ✅ |
| `/superadmin/abbonamenti` | ✅ | ⚠️ | ✅ | ✅ | ✅ | — | ✅ | ✅ |
| `/superadmin/analytics` | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | — | ✅ | ✅ |
| `/superadmin/audit` | ⚠️ | ⚠️ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ |
| `/superadmin/compliance` | ✅ | ⚠️ | ⚠️ | ✅ | ⚠️ | ✅ | ✅ | ✅ |
| `/superadmin/fatture` | ✅ | ⚠️ | ✅ | ✅ | ✅ | — | ✅ | ✅ |
| `/superadmin/host` | ⚠️ | ⚠️ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ |
| `/superadmin/host/[id]` | ⚠️ | ⚠️ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ⚠️ |
| `/superadmin/impostazioni` | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/superadmin/impostazioni/2fa` | ⚠️ | ⚠️ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ |
| `/superadmin/impostazioni/ai` | ✅ | ⚠️ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ |
| `/superadmin/moduli` | ⚠️ | ⚠️ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ |
| `/superadmin/monitoring` | ✅ | ✅ | ✅ | ✅ | ⚠️ | — | ✅ | ✅ |
| `/superadmin/settings` | ✅ | ✅ | ✅ | ✅ | ⚠️ | — | ✅ | ✅ |
| `/superadmin/settings/notifiche` | ⚠️ | ⚠️ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ |
| `/superadmin/strutture` | ⚠️ | ⚠️ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ |
| `/superadmin/tickets` | ✅ | ✅ | ✅ | ✅ | ⚠️ | — | ✅ | ✅ |
| `/superadmin/tickets/[id]` | ⚠️ | ⚠️ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ |
| `/superadmin/utenti` | ✅ | ⚠️ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ |
| `/api-docs` | ✅ | ⚠️ | ⚠️ | ✅ | ⚠️ | — | ✅ | ✅ |
| `/cookie-policy` | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ |
| `/docs` | ✅ | ✅ | ✅ | ✅ | ⚠️ | — | ✅ | ✅ |
| `/login` | ⚠️ | ⚠️ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ |
| `/offline` | ✅ | ✅ | ✅ | ✅ | ⚠️ | — | ✅ | ✅ |
| `/page.tsx` | ✅ | ⚠️ | ⚠️ | ✅ | ⚠️ | — | ✅ | ✅ |
| `/privacy/[token]` | ✅ | ⚠️ | ✅ | ✅ | ⚠️ | — | ✅ | ✅ |
| `/privacy-policy` | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ |
| `/registrazione/[token]` | ✅ | ⚠️ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ |
| `/room/[unitaId]` | ⚠️ | ⚠️ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ |
| `/room/[unitaId]/qr` | ⚠️ | ⚠️ | ⚠️ | ✅ | ⚠️ | — | ✅ | ✅ |
| `/spa/wellness-card/[token]` | ⚠️ | ⚠️ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ |
| `/terms` | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ |
| `/test` | ⚠️ | ✅ | ✅ | ⚠️ | ✅ | — | ✅ | ✅ |

## Dettagli — pagine con warning/fail

### `/login`
File: [`app/(auth)/login/page.tsx`](../app/(auth)/login/page.tsx)
- **Tipografia** ⚠️
  - Sub-12px text trovato: text-[11px]
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Componenti** ⚠️
  - 7 <button> raw — considera <Button>
  - 5 <input> raw — considera <Input>/<FormField>
- **Responsive** ⚠️
  - Nessun breakpoint responsive trovato

### `/admin/billing`
File: [`app/admin/billing/page.tsx`](../app/admin/billing/page.tsx)
- **Responsive** ⚠️
  - Nessun breakpoint responsive trovato

### `/admin/clienti/[id]`
File: [`app/admin/clienti/[id]/page.tsx`](../app/admin/clienti/[id]/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Componenti** ⚠️
  - 4 <button> raw — considera <Button>
  - 5 <input> raw — considera <Input>/<FormField>

### `/admin/clienti/nuovo`
File: [`app/admin/clienti/nuovo/page.tsx`](../app/admin/clienti/nuovo/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Componenti** ⚠️
  - 16 <input> raw — considera <Input>/<FormField>
  - 2 <select> raw — considera <Select> custom

### `/admin/clienti`
File: [`app/admin/clienti/page.tsx`](../app/admin/clienti/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Componenti** ⚠️
  - 2 <select> raw — considera <Select> custom
- **Responsive** ⚠️
  - Nessun breakpoint responsive trovato

### `/admin/dashboard`
File: [`app/admin/dashboard/page.tsx`](../app/admin/dashboard/page.tsx)
- **Responsive** ⚠️
  - Nessun breakpoint responsive trovato

### `/admin/fatture/[id]`
File: [`app/admin/fatture/[id]/page.tsx`](../app/admin/fatture/[id]/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Componenti** ⚠️
  - 5 <button> raw — considera <Button>
- **Responsive** ⚠️
  - Nessun breakpoint responsive trovato

### `/admin/fatture/nuovo`
File: [`app/admin/fatture/nuovo/page.tsx`](../app/admin/fatture/nuovo/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Componenti** ⚠️
  - 3 <button> raw — considera <Button>
  - 14 <input> raw — considera <Input>/<FormField>
  - 2 <select> raw — considera <Select> custom

### `/admin/fatture`
File: [`app/admin/fatture/page.tsx`](../app/admin/fatture/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Componenti** ⚠️
  - 2 <select> raw — considera <Select> custom
- **Responsive** ⚠️
  - Nessun breakpoint responsive trovato

### `/admin/host/[id]`
File: [`app/admin/host/[id]/page.tsx`](../app/admin/host/[id]/page.tsx)
- **Responsive** ⚠️
  - Nessun breakpoint responsive trovato

### `/admin/impostazioni`
File: [`app/admin/impostazioni/page.tsx`](../app/admin/impostazioni/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Componenti** ⚠️
  - 3 <input> raw — considera <Input>/<FormField>

### `/admin/pagamenti/nuovo`
File: [`app/admin/pagamenti/nuovo/page.tsx`](../app/admin/pagamenti/nuovo/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Componenti** ⚠️
  - 4 <input> raw — considera <Input>/<FormField>
  - 3 <select> raw — considera <Select> custom
- **Responsive** ⚠️
  - Nessun breakpoint responsive trovato

### `/admin/pagamenti`
File: [`app/admin/pagamenti/page.tsx`](../app/admin/pagamenti/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Componenti** ⚠️
  - 3 <button> raw — considera <Button>
  - 1 <select> raw — considera <Select> custom
- **Responsive** ⚠️
  - Nessun breakpoint responsive trovato
- **Loading** ⚠️
  - Fetch presente ma nessun loader/skeleton evidente
- **A11y** ⚠️
  - 2 possibili icon-only button senza aria-label

### `/admin/prenotazioni`
File: [`app/admin/prenotazioni/page.tsx`](../app/admin/prenotazioni/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Componenti** ⚠️
  - 2 <input> raw — considera <Input>/<FormField>
- **Responsive** ⚠️
  - Nessun breakpoint responsive trovato

### `/admin/ticket/[id]`
File: [`app/admin/ticket/[id]/page.tsx`](../app/admin/ticket/[id]/page.tsx)
- **Responsive** ⚠️
  - Nessun breakpoint responsive trovato

### `/admin/ticket`
File: [`app/admin/ticket/page.tsx`](../app/admin/ticket/page.tsx)
- **Tipografia** ⚠️
  - Sub-12px text trovato: text-[10px], text-[11px]
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Componenti** ⚠️
  - 5 <button> raw — considera <Button>
- **Responsive** ⚠️
  - Nessun breakpoint responsive trovato

### `/api-docs`
File: [`app/api-docs/page.tsx`](../app/api-docs/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Colori** ⚠️
  - Hex hardcoded: #fafafa
- **Responsive** ⚠️
  - Nessun breakpoint responsive trovato

### `/book/[strutturaId]/camere`
File: [`app/book/[strutturaId]/camere/page.tsx`](../app/book/[strutturaId]/camere/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Responsive** ⚠️
  - Nessun breakpoint responsive trovato

### `/book/[strutturaId]/pacchetti`
File: [`app/book/[strutturaId]/pacchetti/page.tsx`](../app/book/[strutturaId]/pacchetti/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato

### `/book/[strutturaId]`
File: [`app/book/[strutturaId]/page.tsx`](../app/book/[strutturaId]/page.tsx)
- **Tipografia** ⚠️
  - Sub-12px text trovato: text-[11px], text-[10px]
- **Colori** ⚠️
  - Hex hardcoded: #e0e7ff, #6366f1
- **Componenti** ⚠️
  - 11 <button> raw — considera <Button>
  - 5 <input> raw — considera <Input>/<FormField>
- **Loading** ⚠️
  - Fetch presente ma nessun loader/skeleton evidente

### `/book/[strutturaId]/pasti`
File: [`app/book/[strutturaId]/pasti/page.tsx`](../app/book/[strutturaId]/pasti/page.tsx)
- **Tipografia** ⚠️
  - Sub-12px text trovato: text-[10px]
- **Componenti** ⚠️
  - 3 <input> raw — considera <Input>/<FormField>

### `/book/[strutturaId]/ristorante`
File: [`app/book/[strutturaId]/ristorante/page.tsx`](../app/book/[strutturaId]/ristorante/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Responsive** ⚠️
  - Nessun breakpoint responsive trovato

### `/book/[strutturaId]/spa`
File: [`app/book/[strutturaId]/spa/page.tsx`](../app/book/[strutturaId]/spa/page.tsx)
- **Tipografia** ⚠️
  - Sub-12px text trovato: text-[10px]
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Colori** ⚠️
  - Hex hardcoded: #4f46e5
- **Componenti** ⚠️
  - 13 <button> raw — considera <Button>
  - 4 <input> raw — considera <Input>/<FormField>
  - 1 <select> raw — considera <Select> custom

### `/book/chat/[id]`
File: [`app/book/chat/[id]/page.tsx`](../app/book/chat/[id]/page.tsx)
- **Tipografia** ⚠️
  - Sub-12px text trovato: text-[10px]
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Responsive** ⚠️
  - Nessun breakpoint responsive trovato

### `/book/conferma/[token]`
File: [`app/book/conferma/[token]/page.tsx`](../app/book/conferma/[token]/page.tsx)
- **Tipografia** ⚠️
  - Sub-12px text trovato: text-[10px]
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Colori** ⚠️
  - Hex hardcoded: #4f46e5

### `/book`
File: [`app/book/page.tsx`](../app/book/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato

### `/checkin/[token]`
File: [`app/checkin/[token]/page.tsx`](../app/checkin/[token]/page.tsx)
- **Tipografia** ⚠️
  - Sub-12px text trovato: text-[10px]
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Colori** ⚠️
  - Hex hardcoded: #4f46e5
- **Componenti** ⚠️
  - 8 <button> raw — considera <Button>
  - 17 <input> raw — considera <Input>/<FormField>
  - 7 <select> raw — considera <Select> custom
- **Responsive** ⚠️
  - Nessun breakpoint responsive trovato
- **A11y** ⚠️
  - 2 possibili icon-only button senza aria-label

### `/docs`
File: [`app/docs/page.tsx`](../app/docs/page.tsx)
- **Responsive** ⚠️
  - Nessun breakpoint responsive trovato

### `/g/[strutturaId]/[pin]/directory`
File: [`app/g/[strutturaId]/[pin]/directory/page.tsx`](../app/g/[strutturaId]/[pin]/directory/page.tsx)
- **Tipografia** ⚠️
  - Sub-12px text trovato: text-[11px], text-[10px]
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Colori** ⚠️
  - Hex hardcoded: #4f46e5
- **Responsive** ⚠️
  - Nessun breakpoint responsive trovato

### `/g/[strutturaId]/[pin]`
File: [`app/g/[strutturaId]/[pin]/page.tsx`](../app/g/[strutturaId]/[pin]/page.tsx)
- **Tipografia** ⚠️
  - Sub-12px text trovato: text-[11px], text-[10px]
- **Colori** ⚠️
  - Hex hardcoded: #4f46e5

### `/host/abbonamento`
File: [`app/host/abbonamento/page.tsx`](../app/host/abbonamento/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Componenti** ⚠️
  - 3 <button> raw — considera <Button>
- **Loading** ⚠️
  - Fetch presente ma nessun loader/skeleton evidente

### `/host/alloggiati`
File: [`app/host/alloggiati/page.tsx`](../app/host/alloggiati/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Responsive** ⚠️
  - Nessun breakpoint responsive trovato

### `/host/allotment`
File: [`app/host/allotment/page.tsx`](../app/host/allotment/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Componenti** ⚠️
  - 6 <button> raw — considera <Button>
  - 14 <input> raw — considera <Input>/<FormField>
  - 5 <select> raw — considera <Select> custom

### `/host/analytics`
File: [`app/host/analytics/page.tsx`](../app/host/analytics/page.tsx)
- **Responsive** ⚠️
  - Nessun breakpoint responsive trovato

### `/host/audit`
File: [`app/host/audit/page.tsx`](../app/host/audit/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Componenti** ⚠️
  - 2 <input> raw — considera <Input>/<FormField>
  - 1 <select> raw — considera <Select> custom
- **Responsive** ⚠️
  - Nessun breakpoint responsive trovato

### `/host/business-intelligence`
File: [`app/host/business-intelligence/page.tsx`](../app/host/business-intelligence/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato

### `/host/calendario`
File: [`app/host/calendario/page.tsx`](../app/host/calendario/page.tsx)
- **Tipografia** ⚠️
  - Sub-12px text trovato: text-[10px], text-[9px]
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Colori** ⚠️
  - Hex hardcoded: #fbbf24, #22c55e, #60a5fa
- **Componenti** ⚠️
  - 5 <button> raw — considera <Button>

### `/host/canali`
File: [`app/host/canali/page.tsx`](../app/host/canali/page.tsx)
- **Tipografia** ⚠️
  - Sub-12px text trovato: text-[10px]
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Colori** ⚠️
  - Hex hardcoded: #003580, #ff5a5f, #1a6ee0, #4285f4, #6b7280
- **Componenti** ⚠️
  - 9 <button> raw — considera <Button>
  - 1 <select> raw — considera <Select> custom
- **Responsive** ⚠️
  - Nessun breakpoint responsive trovato

### `/host/cassa`
File: [`app/host/cassa/page.tsx`](../app/host/cassa/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Componenti** ⚠️
  - 8 <button> raw — considera <Button>
  - 12 <input> raw — considera <Input>/<FormField>
  - 2 <select> raw — considera <Select> custom
- **A11y** ⚠️
  - 2 possibili icon-only button senza aria-label

### `/host/concierge/[id]`
File: [`app/host/concierge/[id]/page.tsx`](../app/host/concierge/[id]/page.tsx)
- **Tipografia** ⚠️
  - Sub-12px text trovato: text-[10px]
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Componenti** ⚠️
  - 3 <button> raw — considera <Button>
- **Responsive** ⚠️
  - Nessun breakpoint responsive trovato

### `/host/concierge/impostazioni`
File: [`app/host/concierge/impostazioni/page.tsx`](../app/host/concierge/impostazioni/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Responsive** ⚠️
  - Nessun breakpoint responsive trovato

### `/host/concierge`
File: [`app/host/concierge/page.tsx`](../app/host/concierge/page.tsx)
- **Tipografia** ⚠️
  - Sub-12px text trovato: text-[10px]
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Responsive** ⚠️
  - Nessun breakpoint responsive trovato

### `/host/concierge/test`
File: [`app/host/concierge/test/page.tsx`](../app/host/concierge/test/page.tsx)
- **Tipografia** ⚠️
  - Sub-12px text trovato: text-[10px], text-[9px], text-[11px]
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Componenti** ⚠️
  - 3 <button> raw — considera <Button>
  - 3 <input> raw — considera <Input>/<FormField>

### `/host/crm/[id]`
File: [`app/host/crm/[id]/page.tsx`](../app/host/crm/[id]/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Responsive** ⚠️
  - Nessun breakpoint responsive trovato

### `/host/crm`
File: [`app/host/crm/page.tsx`](../app/host/crm/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Responsive** ⚠️
  - Nessun breakpoint responsive trovato

### `/host/dashboard`
File: [`app/host/dashboard/page.tsx`](../app/host/dashboard/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Colori** ⚠️
  - Hex hardcoded: #94a3b8, #e2e8f0
- **Responsive** ⚠️
  - Nessun breakpoint responsive trovato

### `/host/dpa`
File: [`app/host/dpa/page.tsx`](../app/host/dpa/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Responsive** ⚠️
  - Nessun breakpoint responsive trovato

### `/host/email-automatiche`
File: [`app/host/email-automatiche/page.tsx`](../app/host/email-automatiche/page.tsx)
- **Tipografia** ⚠️
  - Sub-12px text trovato: text-[11px]
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato

### `/host/fatture-emesse`
File: [`app/host/fatture-emesse/page.tsx`](../app/host/fatture-emesse/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Componenti** ⚠️
  - 19 <button> raw — considera <Button>
  - 28 <input> raw — considera <Input>/<FormField>
  - 5 <select> raw — considera <Select> custom
- **A11y** ⚠️
  - 6 possibili icon-only button senza aria-label

### `/host/fatture/nuova`
File: [`app/host/fatture/nuova/page.tsx`](../app/host/fatture/nuova/page.tsx)
- **Tipografia** ⚠️
  - Sub-12px text trovato: text-[11px]
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Componenti** ⚠️
  - 6 <button> raw — considera <Button>
  - 15 <input> raw — considera <Input>/<FormField>
  - 2 <select> raw — considera <Select> custom
- **A11y** ⚠️
  - 2 possibili icon-only button senza aria-label

### `/host/fatture`
File: [`app/host/fatture/page.tsx`](../app/host/fatture/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Responsive** ⚠️
  - Nessun breakpoint responsive trovato

### `/host/gdpr/dpa`
File: [`app/host/gdpr/dpa/page.tsx`](../app/host/gdpr/dpa/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato

### `/host/gdpr`
File: [`app/host/gdpr/page.tsx`](../app/host/gdpr/page.tsx)
- **Tipografia** ⚠️
  - Sub-12px text trovato: text-[10px]
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Componenti** ⚠️
  - 7 <button> raw — considera <Button>
- **Responsive** ⚠️
  - Nessun breakpoint responsive trovato

### `/host/help`
File: [`app/host/help/page.tsx`](../app/host/help/page.tsx)
- **Tipografia** ⚠️
  - Sub-12px text trovato: text-[10px]
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Componenti** ⚠️
  - 3 <button> raw — considera <Button>

### `/host/housekeeping/[unitaId]`
File: [`app/host/housekeeping/[unitaId]/page.tsx`](../app/host/housekeeping/[unitaId]/page.tsx)
- **Tipografia** ⚠️
  - Sub-12px text trovato: text-[10px], text-[11px]
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Componenti** ⚠️
  - 11 <button> raw — considera <Button>
  - 2 <input> raw — considera <Input>/<FormField>
  - 2 <select> raw — considera <Select> custom

### `/host/housekeeping/biancheria`
File: [`app/host/housekeeping/biancheria/page.tsx`](../app/host/housekeeping/biancheria/page.tsx)
- **Tipografia** ⚠️
  - Sub-12px text trovato: text-[10px]
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Componenti** ⚠️
  - 11 <button> raw — considera <Button>
  - 4 <input> raw — considera <Input>/<FormField>
  - 1 <select> raw — considera <Select> custom
- **A11y** ⚠️
  - 2 possibili icon-only button senza aria-label

### `/host/housekeeping`
File: [`app/host/housekeeping/page.tsx`](../app/host/housekeeping/page.tsx)
- **Tipografia** ⚠️
  - Sub-12px text trovato: text-[10px]
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Componenti** ⚠️
  - 11 <button> raw — considera <Button>
  - 2 <input> raw — considera <Input>/<FormField>
  - 4 <select> raw — considera <Select> custom

### `/host/impostazioni-checkin`
File: [`app/host/impostazioni-checkin/page.tsx`](../app/host/impostazioni-checkin/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Responsive** ⚠️
  - Nessun breakpoint responsive trovato

### `/host/impostazioni-regcard`
File: [`app/host/impostazioni-regcard/page.tsx`](../app/host/impostazioni-regcard/page.tsx)
- **Tipografia** ⚠️
  - Sub-12px text trovato: text-[11px]
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Componenti** ⚠️
  - 5 <button> raw — considera <Button>
  - 3 <input> raw — considera <Input>/<FormField>
  - 1 <select> raw — considera <Select> custom
- **Responsive** ⚠️
  - Nessun breakpoint responsive trovato

### `/host/impostazioni-valuta`
File: [`app/host/impostazioni-valuta/page.tsx`](../app/host/impostazioni-valuta/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Componenti** ⚠️
  - 1 <select> raw — considera <Select> custom

### `/host/integrazione`
File: [`app/host/integrazione/page.tsx`](../app/host/integrazione/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Componenti** ⚠️
  - 1 <select> raw — considera <Select> custom

### `/host/magazzino`
File: [`app/host/magazzino/page.tsx`](../app/host/magazzino/page.tsx)
- **Tipografia** ⚠️
  - Sub-12px text trovato: text-[10px]
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Componenti** ⚠️
  - 10 <button> raw — considera <Button>
  - 8 <input> raw — considera <Input>/<FormField>
  - 4 <select> raw — considera <Select> custom

### `/host/manutenzione`
File: [`app/host/manutenzione/page.tsx`](../app/host/manutenzione/page.tsx)
- **Tipografia** ⚠️
  - Sub-12px text trovato: text-[11px]
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Componenti** ⚠️
  - 16 <button> raw — considera <Button>
  - 8 <input> raw — considera <Input>/<FormField>
  - 6 <select> raw — considera <Select> custom

### `/host/moduli`
File: [`app/host/moduli/page.tsx`](../app/host/moduli/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato

### `/host/notifiche`
File: [`app/host/notifiche/page.tsx`](../app/host/notifiche/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Componenti** ⚠️
  - 3 <button> raw — considera <Button>
- **Responsive** ⚠️
  - Nessun breakpoint responsive trovato
- **Loading** ⚠️
  - Fetch presente ma nessun loader/skeleton evidente
- **A11y** ⚠️
  - 2 possibili icon-only button senza aria-label

### `/host/oggetti-smarriti`
File: [`app/host/oggetti-smarriti/page.tsx`](../app/host/oggetti-smarriti/page.tsx)
- **Tipografia** ⚠️
  - Sub-12px text trovato: text-[10px]
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Componenti** ⚠️
  - 8 <button> raw — considera <Button>
  - 7 <input> raw — considera <Input>/<FormField>
  - 1 <select> raw — considera <Select> custom

### `/host/oggi`
File: [`app/host/oggi/page.tsx`](../app/host/oggi/page.tsx)
- **Tipografia** ⚠️
  - Sub-12px text trovato: text-[11px], text-[10px]
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato

### `/host/onboarding`
File: [`app/host/onboarding/page.tsx`](../app/host/onboarding/page.tsx)
- **Tipografia** ⚠️
  - Sub-12px text trovato: text-[10px], text-[11px]
- **Componenti** ⚠️
  - 6 <button> raw — considera <Button>
  - 9 <input> raw — considera <Input>/<FormField>
- **Animazioni** ⚠️
  - Animazioni potenzialmente troppo lunghe: duration-500

### `/host/pacchetti/[id]`
File: [`app/host/pacchetti/[id]/page.tsx`](../app/host/pacchetti/[id]/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Componenti** ⚠️
  - 5 <button> raw — considera <Button>
  - 10 <input> raw — considera <Input>/<FormField>
  - 1 <select> raw — considera <Select> custom
- **Responsive** ⚠️
  - Nessun breakpoint responsive trovato
- **Loading** ⚠️
  - Fetch presente ma nessun loader/skeleton evidente
- **A11y** ⚠️
  - 3 possibili icon-only button senza aria-label

### `/host/pacchetti/nuovo`
File: [`app/host/pacchetti/nuovo/page.tsx`](../app/host/pacchetti/nuovo/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Componenti** ⚠️
  - 4 <button> raw — considera <Button>
  - 9 <input> raw — considera <Input>/<FormField>
  - 1 <select> raw — considera <Select> custom
- **Responsive** ⚠️
  - Nessun breakpoint responsive trovato
- **Loading** ⚠️
  - Fetch presente ma nessun loader/skeleton evidente

### `/host/pacchetti`
File: [`app/host/pacchetti/page.tsx`](../app/host/pacchetti/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato

### `/host/pos`
File: [`app/host/pos/page.tsx`](../app/host/pos/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Componenti** ⚠️
  - 12 <button> raw — considera <Button>
  - 7 <input> raw — considera <Input>/<FormField>
- **Loading** ⚠️
  - Fetch presente ma nessun loader/skeleton evidente

### `/host/prenotazioni/[id]`
File: [`app/host/prenotazioni/[id]/page.tsx`](../app/host/prenotazioni/[id]/page.tsx)
- **Tipografia** ⚠️
  - Sub-12px text trovato: text-[10px], text-[11px]
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Componenti** ⚠️
  - 79 <button> raw — considera <Button>
  - 39 <input> raw — considera <Input>/<FormField>
  - 18 <select> raw — considera <Select> custom
- **A11y** ⚠️
  - 3 possibili icon-only button senza aria-label

### `/host/prenotazioni/[id]/ricevuta`
File: [`app/host/prenotazioni/[id]/ricevuta/page.tsx`](../app/host/prenotazioni/[id]/ricevuta/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Colori** ❌
  - 17 hex distinti hardcoded (es. #1a1a2e, #6366f1, #666…)
- **Responsive** ⚠️
  - Nessun breakpoint responsive trovato

### `/host/prenotazioni/nuova`
File: [`app/host/prenotazioni/nuova/page.tsx`](../app/host/prenotazioni/nuova/page.tsx)
- **Tipografia** ⚠️
  - Sub-12px text trovato: text-[11px]
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Componenti** ⚠️
  - 8 <input> raw — considera <Input>/<FormField>
  - 4 <select> raw — considera <Select> custom
- **Responsive** ⚠️
  - Nessun breakpoint responsive trovato

### `/host/prenotazioni`
File: [`app/host/prenotazioni/page.tsx`](../app/host/prenotazioni/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Componenti** ⚠️
  - 7 <button> raw — considera <Button>
  - 3 <input> raw — considera <Input>/<FormField>

### `/host/profilo`
File: [`app/host/profilo/page.tsx`](../app/host/profilo/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Componenti** ⚠️
  - 27 <input> raw — considera <Input>/<FormField>
  - 1 <select> raw — considera <Select> custom

### `/host/promemoria`
File: [`app/host/promemoria/page.tsx`](../app/host/promemoria/page.tsx)
- **Tipografia** ⚠️
  - Sub-12px text trovato: text-[10px]
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Componenti** ⚠️
  - 9 <button> raw — considera <Button>
  - 4 <input> raw — considera <Input>/<FormField>
  - 3 <select> raw — considera <Select> custom

### `/host/report`
File: [`app/host/report/page.tsx`](../app/host/report/page.tsx)
- **Tipografia** ⚠️
  - Sub-12px text trovato: text-[10px]
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Componenti** ⚠️
  - 4 <button> raw — considera <Button>
- **A11y** ⚠️
  - 4 possibili icon-only button senza aria-label

### `/host/ristorazione/menu`
File: [`app/host/ristorazione/menu/page.tsx`](../app/host/ristorazione/menu/page.tsx)
- **Tipografia** ⚠️
  - Sub-12px text trovato: text-[10px]
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Componenti** ⚠️
  - 13 <button> raw — considera <Button>
  - 7 <input> raw — considera <Input>/<FormField>
  - 5 <select> raw — considera <Select> custom
- **A11y** ⚠️
  - 3 possibili icon-only button senza aria-label

### `/host/ristorazione`
File: [`app/host/ristorazione/page.tsx`](../app/host/ristorazione/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Componenti** ⚠️
  - 5 <button> raw — considera <Button>
- **Responsive** ⚠️
  - Nessun breakpoint responsive trovato
- **A11y** ⚠️
  - 3 possibili icon-only button senza aria-label

### `/host/ristorazione/prenotazioni`
File: [`app/host/ristorazione/prenotazioni/page.tsx`](../app/host/ristorazione/prenotazioni/page.tsx)
- **Tipografia** ⚠️
  - Sub-12px text trovato: text-[11px], text-[10px]
- **Componenti** ⚠️
  - 4 <button> raw — considera <Button>

### `/host/seleziona-struttura`
File: [`app/host/seleziona-struttura/page.tsx`](../app/host/seleziona-struttura/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato

### `/host/servizi`
File: [`app/host/servizi/page.tsx`](../app/host/servizi/page.tsx)
- **Tipografia** ⚠️
  - Sub-12px text trovato: text-[10px], text-[9px]
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Componenti** ⚠️
  - 11 <button> raw — considera <Button>
  - 12 <input> raw — considera <Input>/<FormField>
  - 4 <select> raw — considera <Select> custom

### `/host/spa/appuntamenti`
File: [`app/host/spa/appuntamenti/page.tsx`](../app/host/spa/appuntamenti/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Componenti** ⚠️
  - 10 <button> raw — considera <Button>
  - 2 <input> raw — considera <Input>/<FormField>
  - 7 <select> raw — considera <Select> custom
- **Responsive** ⚠️
  - Nessun breakpoint responsive trovato

### `/host/spa/cabine`
File: [`app/host/spa/cabine/page.tsx`](../app/host/spa/cabine/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Colori** ❌
  - 10 hex distinti hardcoded (es. #8b5cf6, #6366f1, #ec4899…)
- **Componenti** ⚠️
  - 6 <button> raw — considera <Button>
  - 2 <input> raw — considera <Input>/<FormField>
- **Loading** ⚠️
  - Fetch presente ma nessun loader/skeleton evidente

### `/host/spa/calendario`
File: [`app/host/spa/calendario/page.tsx`](../app/host/spa/calendario/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Colori** ⚠️
  - Hex hardcoded: #8b5cf6
- **Componenti** ⚠️
  - 6 <button> raw — considera <Button>
- **Loading** ⚠️
  - Fetch presente ma nessun loader/skeleton evidente
- **A11y** ⚠️
  - 2 possibili icon-only button senza aria-label

### `/host/spa/gift-card`
File: [`app/host/spa/gift-card/page.tsx`](../app/host/spa/gift-card/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Componenti** ⚠️
  - 8 <button> raw — considera <Button>
  - 8 <input> raw — considera <Input>/<FormField>
  - 1 <select> raw — considera <Select> custom
- **Loading** ⚠️
  - Fetch presente ma nessun loader/skeleton evidente
- **A11y** ⚠️
  - 2 possibili icon-only button senza aria-label

### `/host/spa/loyalty`
File: [`app/host/spa/loyalty/page.tsx`](../app/host/spa/loyalty/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Colori** ⚠️
  - Hex hardcoded: #cd7f32, #c0c0c0, #ffd700, #e5e4e2, #6b7280
- **Componenti** ⚠️
  - 15 <button> raw — considera <Button>
  - 12 <input> raw — considera <Input>/<FormField>
  - 1 <select> raw — considera <Select> custom
- **A11y** ⚠️
  - 2 possibili icon-only button senza aria-label

### `/host/spa`
File: [`app/host/spa/page.tsx`](../app/host/spa/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Colori** ⚠️
  - Hex hardcoded: #8b5cf6

### `/host/spa/percorsi`
File: [`app/host/spa/percorsi/page.tsx`](../app/host/spa/percorsi/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Colori** ❌
  - 10 hex distinti hardcoded (es. #f59e0b, #8b5cf6, #ec4899…)
- **Componenti** ⚠️
  - 9 <button> raw — considera <Button>
  - 3 <input> raw — considera <Input>/<FormField>
  - 1 <select> raw — considera <Select> custom
- **Responsive** ⚠️
  - Nessun breakpoint responsive trovato
- **Loading** ⚠️
  - Fetch presente ma nessun loader/skeleton evidente
- **A11y** ⚠️
  - 2 possibili icon-only button senza aria-label

### `/host/spa/report`
File: [`app/host/spa/report/page.tsx`](../app/host/spa/report/page.tsx)
- **Tipografia** ⚠️
  - Sub-12px text trovato: text-[9px]
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Componenti** ⚠️
  - 3 <button> raw — considera <Button>

### `/host/spa/terapisti`
File: [`app/host/spa/terapisti/page.tsx`](../app/host/spa/terapisti/page.tsx)
- **Tipografia** ⚠️
  - Sub-12px text trovato: text-[10px]
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Colori** ❌
  - 10 hex distinti hardcoded (es. #6366f1, #8b5cf6, #ec4899…)
- **Componenti** ⚠️
  - 15 <button> raw — considera <Button>
  - 6 <input> raw — considera <Input>/<FormField>
  - 1 <select> raw — considera <Select> custom
- **Responsive** ⚠️
  - Nessun breakpoint responsive trovato
- **Loading** ⚠️
  - Fetch presente ma nessun loader/skeleton evidente

### `/host/spa/trattamenti`
File: [`app/host/spa/trattamenti/page.tsx`](../app/host/spa/trattamenti/page.tsx)
- **Tipografia** ⚠️
  - Sub-12px text trovato: text-[10px]
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Colori** ❌
  - 10 hex distinti hardcoded (es. #06b6d4, #8b5cf6, #ec4899…)
- **Componenti** ⚠️
  - 7 <button> raw — considera <Button>
  - 3 <input> raw — considera <Input>/<FormField>
  - 1 <select> raw — considera <Select> custom
- **Loading** ⚠️
  - Fetch presente ma nessun loader/skeleton evidente

### `/host/spa/waiting-list`
File: [`app/host/spa/waiting-list/page.tsx`](../app/host/spa/waiting-list/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Componenti** ⚠️
  - 13 <button> raw — considera <Button>
  - 4 <input> raw — considera <Input>/<FormField>
  - 2 <select> raw — considera <Select> custom
- **Responsive** ⚠️
  - Nessun breakpoint responsive trovato

### `/host/staff`
File: [`app/host/staff/page.tsx`](../app/host/staff/page.tsx)
- **Tipografia** ⚠️
  - Sub-12px text trovato: text-[10px]
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Componenti** ⚠️
  - 20 <button> raw — considera <Button>
  - 6 <input> raw — considera <Input>/<FormField>
- **A11y** ⚠️
  - 3 possibili icon-only button senza aria-label

### `/host/strutture/[id]/disponibilita`
File: [`app/host/strutture/[id]/disponibilita/page.tsx`](../app/host/strutture/[id]/disponibilita/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Componenti** ⚠️
  - 6 <button> raw — considera <Button>
- **Responsive** ⚠️
  - Nessun breakpoint responsive trovato
- **Loading** ⚠️
  - Fetch presente ma nessun loader/skeleton evidente

### `/host/strutture/[id]/impostazioni`
File: [`app/host/strutture/[id]/impostazioni/page.tsx`](../app/host/strutture/[id]/impostazioni/page.tsx)
- **Tipografia** ⚠️
  - Sub-12px text trovato: text-[10px]
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Colori** ⚠️
  - Hex hardcoded: #4f46e5, #6366f1
- **Componenti** ⚠️
  - 6 <button> raw — considera <Button>
  - 24 <input> raw — considera <Input>/<FormField>
  - 1 <select> raw — considera <Select> custom

### `/host/strutture/[id]`
File: [`app/host/strutture/[id]/page.tsx`](../app/host/strutture/[id]/page.tsx)
- **Tipografia** ⚠️
  - Sub-12px text trovato: text-[10px]
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Colori** ⚠️
  - Hex hardcoded: #0f172a
- **Componenti** ⚠️
  - 23 <button> raw — considera <Button>
  - 14 <input> raw — considera <Input>/<FormField>

### `/host/strutture/[id]/pannello`
File: [`app/host/strutture/[id]/pannello/page.tsx`](../app/host/strutture/[id]/pannello/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Colori** ❌
  - 8 hex distinti hardcoded (es. #6366f1, #8b5cf6, #ec4899…)
- **Componenti** ⚠️
  - 7 <button> raw — considera <Button>
  - 5 <input> raw — considera <Input>/<FormField>
- **Loading** ⚠️
  - Fetch presente ma nessun loader/skeleton evidente

### `/host/strutture/[id]/tariffe`
File: [`app/host/strutture/[id]/tariffe/page.tsx`](../app/host/strutture/[id]/tariffe/page.tsx)
- **Tipografia** ⚠️
  - Sub-12px text trovato: text-[10px], text-[11px]
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Colori** ❌
  - 8 hex distinti hardcoded (es. #6366f1, #8b5cf6, #ec4899…)
- **Componenti** ⚠️
  - 29 <button> raw — considera <Button>
  - 13 <input> raw — considera <Input>/<FormField>
  - 6 <select> raw — considera <Select> custom

### `/host/strutture/[id]/wifi`
File: [`app/host/strutture/[id]/wifi/page.tsx`](../app/host/strutture/[id]/wifi/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Colori** ⚠️
  - Hex hardcoded: #4f46e5
- **Componenti** ⚠️
  - 3 <input> raw — considera <Input>/<FormField>

### `/host/strutture/nuova`
File: [`app/host/strutture/nuova/page.tsx`](../app/host/strutture/nuova/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Componenti** ⚠️
  - 6 <input> raw — considera <Input>/<FormField>
  - 1 <select> raw — considera <Select> custom
- **Responsive** ⚠️
  - Nessun breakpoint responsive trovato
- **Loading** ⚠️
  - Fetch presente ma nessun loader/skeleton evidente

### `/host/strutture`
File: [`app/host/strutture/page.tsx`](../app/host/strutture/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato

### `/host/supporto/[id]`
File: [`app/host/supporto/[id]/page.tsx`](../app/host/supporto/[id]/page.tsx)
- **Responsive** ⚠️
  - Nessun breakpoint responsive trovato

### `/host/supporto`
File: [`app/host/supporto/page.tsx`](../app/host/supporto/page.tsx)
- **Tipografia** ⚠️
  - Sub-12px text trovato: text-[10px], text-[11px]
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Componenti** ⚠️
  - 4 <button> raw — considera <Button>
  - 2 <select> raw — considera <Select> custom
- **Responsive** ⚠️
  - Nessun breakpoint responsive trovato

### `/host/upselling`
File: [`app/host/upselling/page.tsx`](../app/host/upselling/page.tsx)
- **Tipografia** ⚠️
  - Sub-12px text trovato: text-[10px]
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Componenti** ⚠️
  - 7 <button> raw — considera <Button>
  - 4 <input> raw — considera <Input>/<FormField>
  - 4 <select> raw — considera <Select> custom

### `/host/utenti`
File: [`app/host/utenti/page.tsx`](../app/host/utenti/page.tsx)
- **Componenti** ⚠️
  - 12 <button> raw — considera <Button>
  - 4 <input> raw — considera <Input>/<FormField>

### `/host/wifi`
File: [`app/host/wifi/page.tsx`](../app/host/wifi/page.tsx)
- **Tipografia** ⚠️
  - Sub-12px text trovato: text-[10px], text-[11px]
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Componenti** ⚠️
  - 9 <button> raw — considera <Button>
  - 3 <input> raw — considera <Input>/<FormField>

### `/kiosk/[token]`
File: [`app/kiosk/[token]/page.tsx`](../app/kiosk/[token]/page.tsx)
- **Tipografia** ⚠️
  - Sub-12px text trovato: text-[10px]
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Colori** ⚠️
  - Hex hardcoded: #4f46e5, #fafafa
- **Componenti** ⚠️
  - 13 <button> raw — considera <Button>
  - 2 <input> raw — considera <Input>/<FormField>
- **Animazioni** ⚠️
  - Animazioni potenzialmente troppo lunghe: duration-1000

### `/kiosk/spa/[cabinaId]`
File: [`app/kiosk/spa/[cabinaId]/page.tsx`](../app/kiosk/spa/[cabinaId]/page.tsx)
- **Tipografia** ⚠️
  - Sub-12px text trovato: text-[10px]
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Componenti** ⚠️
  - 5 <button> raw — considera <Button>
- **Responsive** ⚠️
  - Nessun breakpoint responsive trovato

### `/offline`
File: [`app/offline/page.tsx`](../app/offline/page.tsx)
- **Responsive** ⚠️
  - Nessun breakpoint responsive trovato

### `/page.tsx`
File: [`app/page.tsx`](../app/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Colori** ⚠️
  - Hex hardcoded: #6b7280, #9ca3af, #0f172a
- **Responsive** ⚠️
  - Nessun breakpoint responsive trovato

### `/privacy/[token]`
File: [`app/privacy/[token]/page.tsx`](../app/privacy/[token]/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Responsive** ⚠️
  - Nessun breakpoint responsive trovato

### `/reception/display/[strutturaId]`
File: [`app/reception/display/[strutturaId]/page.tsx`](../app/reception/display/[strutturaId]/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Colori** ⚠️
  - Hex hardcoded: #4f46e5, #dc2626, #16a34a
- **Componenti** ⚠️
  - 4 <button> raw — considera <Button>

### `/reception/spa-concierge/[strutturaId]`
File: [`app/reception/spa-concierge/[strutturaId]/page.tsx`](../app/reception/spa-concierge/[strutturaId]/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Colori** ⚠️
  - Hex hardcoded: #8b5cf6, #4c1d95
- **Componenti** ⚠️
  - 4 <button> raw — considera <Button>

### `/reception/spa/[cabinaId]`
File: [`app/reception/spa/[cabinaId]/page.tsx`](../app/reception/spa/[cabinaId]/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato

### `/registrazione/[token]`
File: [`app/registrazione/[token]/page.tsx`](../app/registrazione/[token]/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Componenti** ⚠️
  - 5 <input> raw — considera <Input>/<FormField>
- **Responsive** ⚠️
  - Nessun breakpoint responsive trovato

### `/room/[unitaId]`
File: [`app/room/[unitaId]/page.tsx`](../app/room/[unitaId]/page.tsx)
- **Tipografia** ⚠️
  - Sub-12px text trovato: text-[10px]
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Componenti** ⚠️
  - 3 <button> raw — considera <Button>
- **Responsive** ⚠️
  - Nessun breakpoint responsive trovato

### `/room/[unitaId]/qr`
File: [`app/room/[unitaId]/qr/page.tsx`](../app/room/[unitaId]/qr/page.tsx)
- **Tipografia** ⚠️
  - Sub-12px text trovato: text-[11px], text-[9px], text-[10px]
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Colori** ⚠️
  - Hex hardcoded: #1e293b
- **Responsive** ⚠️
  - Nessun breakpoint responsive trovato

### `/spa/wellness-card/[token]`
File: [`app/spa/wellness-card/[token]/page.tsx`](../app/spa/wellness-card/[token]/page.tsx)
- **Tipografia** ⚠️
  - Sub-12px text trovato: text-[10px]
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Componenti** ⚠️
  - 3 <button> raw — considera <Button>
  - 10 <input> raw — considera <Input>/<FormField>
  - 4 <select> raw — considera <Select> custom

### `/superadmin/abbonamenti`
File: [`app/superadmin/abbonamenti/page.tsx`](../app/superadmin/abbonamenti/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato

### `/superadmin/analytics`
File: [`app/superadmin/analytics/page.tsx`](../app/superadmin/analytics/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Colori** ⚠️
  - Hex hardcoded: #94a3b8, #e2e8f0

### `/superadmin/audit`
File: [`app/superadmin/audit/page.tsx`](../app/superadmin/audit/page.tsx)
- **Tipografia** ⚠️
  - Sub-12px text trovato: text-[10px]
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Componenti** ⚠️
  - 2 <input> raw — considera <Input>/<FormField>
  - 1 <select> raw — considera <Select> custom
- **Responsive** ⚠️
  - Nessun breakpoint responsive trovato

### `/superadmin/compliance`
File: [`app/superadmin/compliance/page.tsx`](../app/superadmin/compliance/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Colori** ⚠️
  - Hex hardcoded: #16a34a, #d97706, #dc2626
- **Responsive** ⚠️
  - Nessun breakpoint responsive trovato

### `/superadmin/fatture`
File: [`app/superadmin/fatture/page.tsx`](../app/superadmin/fatture/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato

### `/superadmin/host/[id]`
File: [`app/superadmin/host/[id]/page.tsx`](../app/superadmin/host/[id]/page.tsx)
- **Tipografia** ⚠️
  - Sub-12px text trovato: text-[11px], text-[10px]
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Componenti** ⚠️
  - 21 <button> raw — considera <Button>
  - 21 <input> raw — considera <Input>/<FormField>
  - 4 <select> raw — considera <Select> custom
- **A11y** ⚠️
  - 4 possibili icon-only button senza aria-label

### `/superadmin/host`
File: [`app/superadmin/host/page.tsx`](../app/superadmin/host/page.tsx)
- **Tipografia** ⚠️
  - Sub-12px text trovato: text-[10px], text-[9px], text-[11px]
  - 4 possibili valute hardcoded — usa formatValuta()
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Componenti** ⚠️
  - 11 <button> raw — considera <Button>
  - 11 <input> raw — considera <Input>/<FormField>
  - 1 <select> raw — considera <Select> custom
- **Responsive** ⚠️
  - Nessun breakpoint responsive trovato

### `/superadmin/impostazioni/2fa`
File: [`app/superadmin/impostazioni/2fa/page.tsx`](../app/superadmin/impostazioni/2fa/page.tsx)
- **Tipografia** ⚠️
  - Sub-12px text trovato: text-[11px]
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Componenti** ⚠️
  - 11 <button> raw — considera <Button>
  - 2 <input> raw — considera <Input>/<FormField>
- **Responsive** ⚠️
  - Nessun breakpoint responsive trovato

### `/superadmin/impostazioni/ai`
File: [`app/superadmin/impostazioni/ai/page.tsx`](../app/superadmin/impostazioni/ai/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Componenti** ⚠️
  - 4 <button> raw — considera <Button>
  - 3 <input> raw — considera <Input>/<FormField>
- **Responsive** ⚠️
  - Nessun breakpoint responsive trovato

### `/superadmin/impostazioni`
File: [`app/superadmin/impostazioni/page.tsx`](../app/superadmin/impostazioni/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato

### `/superadmin/moduli`
File: [`app/superadmin/moduli/page.tsx`](../app/superadmin/moduli/page.tsx)
- **Tipografia** ⚠️
  - Sub-12px text trovato: text-[10px], text-[11px], text-[9px]
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Componenti** ⚠️
  - 3 <button> raw — considera <Button>
  - 2 <input> raw — considera <Input>/<FormField>

### `/superadmin/monitoring`
File: [`app/superadmin/monitoring/page.tsx`](../app/superadmin/monitoring/page.tsx)
- **Responsive** ⚠️
  - Nessun breakpoint responsive trovato

### `/superadmin/settings/notifiche`
File: [`app/superadmin/settings/notifiche/page.tsx`](../app/superadmin/settings/notifiche/page.tsx)
- **Tipografia** ⚠️
  - Sub-12px text trovato: text-[10px]
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Componenti** ⚠️
  - 7 <button> raw — considera <Button>
  - 2 <input> raw — considera <Input>/<FormField>
  - 1 <select> raw — considera <Select> custom

### `/superadmin/settings`
File: [`app/superadmin/settings/page.tsx`](../app/superadmin/settings/page.tsx)
- **Responsive** ⚠️
  - Nessun breakpoint responsive trovato

### `/superadmin/strutture`
File: [`app/superadmin/strutture/page.tsx`](../app/superadmin/strutture/page.tsx)
- **Tipografia** ⚠️
  - Sub-12px text trovato: text-[11px]
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Componenti** ⚠️
  - 5 <button> raw — considera <Button>
  - 8 <input> raw — considera <Input>/<FormField>
  - 5 <select> raw — considera <Select> custom
- **Responsive** ⚠️
  - Nessun breakpoint responsive trovato

### `/superadmin/tickets/[id]`
File: [`app/superadmin/tickets/[id]/page.tsx`](../app/superadmin/tickets/[id]/page.tsx)
- **Tipografia** ⚠️
  - Sub-12px text trovato: text-[10px]
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Componenti** ⚠️
  - 2 <select> raw — considera <Select> custom

### `/superadmin/tickets`
File: [`app/superadmin/tickets/page.tsx`](../app/superadmin/tickets/page.tsx)
- **Responsive** ⚠️
  - Nessun breakpoint responsive trovato

### `/superadmin/utenti`
File: [`app/superadmin/utenti/page.tsx`](../app/superadmin/utenti/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Componenti** ⚠️
  - 6 <button> raw — considera <Button>
  - 4 <input> raw — considera <Input>/<FormField>
  - 3 <select> raw — considera <Select> custom
- **Responsive** ⚠️
  - Nessun breakpoint responsive trovato

### `/test`
File: [`app/test/page.tsx`](../app/test/page.tsx)
- **Tipografia** ⚠️
  - Sub-12px text trovato: text-[10px]
- **Componenti** ⚠️
  - 3 <button> raw — considera <Button>

### `/wifi/[strutturaId]`
File: [`app/wifi/[strutturaId]/page.tsx`](../app/wifi/[strutturaId]/page.tsx)
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Responsive** ⚠️
  - Nessun breakpoint responsive trovato

### `/wifi/login`
File: [`app/wifi/login/page.tsx`](../app/wifi/login/page.tsx)
- **Tipografia** ⚠️
  - Sub-12px text trovato: text-[10px]
- **Spacing** ⚠️
  - Nessun spacing responsive (md:/lg:) trovato
- **Componenti** ⚠️
  - 4 <button> raw — considera <Button>
  - 10 <input> raw — considera <Input>/<FormField>
- **Responsive** ⚠️
  - Nessun breakpoint responsive trovato

_Totale pagine con issue: **142**._