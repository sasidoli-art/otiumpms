# Multi-Tenant Audit

> Generato: 2026-05-01 · File scansionati: **217** · CRITICAL: **0** · WARN: **245**

Audit euristico statico delle route `app/api/host/*`. Verifica che
ogni query Prisma filtri per `hostId` ricavato dalla sessione.

Esecuzione: `npx ts-node scripts/audit-multi-tenant.ts`

## ✅ Nessuna CRITICAL — isolamento multi-tenant OK

## 🟡 WARN (245)

Query con guard ma senza `hostId` esplicito. Potrebbero filtrare
via relazione (es. `where: { struttura: { hostId } }`) — revisione manuale.

### `app/api/host/allotment/[id]/route.ts` (3)

- L30: `prisma.contrattoAllotment.findFirst()` — `turn prisma.contrattoAllotment.findFirst({ where: { id, hostId }, include: {`
- L84: `prisma.contrattoAllotment.update()` — `wait prisma.contrattoAllotment.update({ where: { id }, data: { ...(data`
- L124: `prisma.contrattoAllotment.delete()` — `wait prisma.contrattoAllotment.delete({ where: { id } }) return NextResponse.json({`

### `app/api/host/analytics/route.ts` (3)

- L174: `prisma.unitaPrenotabile.count()` — `wait prisma.unitaPrenotabile.count({ where: unitaWhere }) // ─── Fetch prenotazion`
- L195: `prisma.prenotazione.findMany()` — `wait prisma.prenotazione.findMany({ where: { ...whereBase, dataArrivo`
- L208: `prisma.prenotazione.findMany()` — `wait prisma.prenotazione.findMany({ where: { ...whereBase,`

### `app/api/host/api-keys/[id]/route.ts` (1)

- L20: `prisma.apiKey.update()` — `wait prisma.apiKey.update({ where: { id }, data: { revocata: true }, })`

### `app/api/host/audit/route.ts` (3)

- L45: `prisma.auditLog.findMany()` — `wait prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' },`
- L76: `prisma.auditLog.findMany()` — `prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' },`
- L82: `prisma.auditLog.count()` — `prisma.auditLog.count({ where }), ]) return NextResponse.json({ logs, total`

### `app/api/host/biancheria/[id]/invia/route.ts` (1)

- L105: `prisma.richiestaBiancheria.update()` — `wait prisma.richiestaBiancheria.update({ where: { id }, data: { s`

### `app/api/host/booking-engine/branding/route.ts` (2)

- L47: `prisma.struttura.findFirst()` — `wait prisma.struttura.findFirst({ where: { id: strutturaId, hostId }, select:`
- L65: `prisma.struttura.update()` — `wait prisma.struttura.update({ where: { id: strutturaId }, data, select:`

### `app/api/host/booking-engine/verify-domain/route.ts` (3)

- L51: `prisma.struttura.findFirst()` — `wait prisma.struttura.findFirst({ where: { id: strutturaId, hostId }, select:`
- L60: `prisma.struttura.findFirst()` — `wait prisma.struttura.findFirst({ where: { customDomain: domain, NOT: { id: strut`
- L107: `prisma.struttura.update()` — `wait prisma.struttura.update({ where: { id: strutturaId }, data: { customDoma`

### `app/api/host/calendario/route.ts` (5)

- L36: `prisma.unitaPrenotabile.findMany()` — `wait prisma.unitaPrenotabile.findMany({ where: { attiva: true, strutt`
- L84: `prisma.canaleEsterno.findMany()` — `wait prisma.canaleEsterno.findMany({ where: { attivo: true, struttura: struttureW`
- L89: `prisma.prenotazioneCanale.findMany()` — `wait prisma.prenotazioneCanale.findMany({ where: { canaleId: { in: canali.m`
- L135: `prisma.tariffaPeriodo.findMany()` — `wait prisma.tariffaPeriodo.findMany({ where: { unitaId: { in: unitaIds },`
- L145: `prisma.disponibilita.findMany()` — `wait prisma.disponibilita.findMany({ where: { unitaId: { in: unitaIds },`

### `app/api/host/canali/[id]/route.ts` (2)

- L19: `prisma.canaleEsterno.delete()` — `wait prisma.canaleEsterno.delete({ where: { id } }) return NextResponse.json({ ok:`
- L43: `prisma.canaleEsterno.update()` — `wait prisma.canaleEsterno.update({ where: { id }, data }) return NextResponse.json(`

### `app/api/host/canali/[id]/sync/route.ts` (3)

- L54: `prisma.prenotazioneCanale.deleteMany()` — `wait prisma.prenotazioneCanale.deleteMany({ where: { canaleId: id, uidEvento:`
- L60: `prisma.canaleEsterno.update()` — `wait prisma.canaleEsterno.update({ where: { id }, data: { ultimoS`
- L75: `prisma.canaleEsterno.update()` — `wait prisma.canaleEsterno.update({ where: { id }, data: { ultimoS`

### `app/api/host/cassa/chiusura/[id]/route.ts` (1)

- L73: `prisma.chiusuraCassa.update()` — `wait prisma.chiusuraCassa.update({ where: { id }, data: { ...(body.note`

### `app/api/host/cassa/chiusura/route.ts` (1)

- L46: `prisma.chiusuraCassa.findMany()` — `wait prisma.chiusuraCassa.findMany({ where, orderBy: { data: 'desc' }, })`

### `app/api/host/cassa/incassi/route.ts` (1)

- L68: `prisma.incasso.findMany()` — `wait prisma.incasso.findMany({ where, orderBy: { data: 'desc' }, }) // C`

### `app/api/host/chat/[id]/route.ts` (2)

- L34: `prisma.messaggio.updateMany()` — `wait prisma.messaggio.updateMany({ where: { chatId: params.id, mittente: 'GUEST',`
- L72: `prisma.chat.update()` — `wait prisma.chat.update({ where: { id: params.id }, data: { updatedAt: new Date() } }`

### `app/api/host/concierge/[id]/route.ts` (1)

- L36: `prisma.conversazioneWhatsApp.update()` — `wait prisma.conversazioneWhatsApp.update({ where: { id }, data }) return NextRespon`

### `app/api/host/crm/[id]/route.ts` (3)

- L77: `prisma.ospiteCRM.findUnique()` — `wait prisma.ospiteCRM.findUnique({ where: { id: params.id }, select: {`
- L146: `prisma.ospiteCRM.update()` — `wait prisma.ospiteCRM.update({ where: { id: params.id }, data: { nome:`
- L192: `prisma.ospiteCRM.update()` — `wait prisma.ospiteCRM.update({ where: { id: ospite.id }, data: { nome:`

### `app/api/host/crm/export/route.ts` (1)

- L55: `prisma.ospiteCRM.findMany()` — `wait prisma.ospiteCRM.findMany({ where, orderBy: [{ cognome: 'asc' }, { nome:`

### `app/api/host/crm/route.ts` (2)

- L83: `prisma.ospiteCRM.findMany()` — `prisma.ospiteCRM.findMany({ where, orderBy, skip: (page - 1) *`
- L89: `prisma.ospiteCRM.count()` — `prisma.ospiteCRM.count({ where }), // Distinct tags for filter dropdown (all`

### `app/api/host/dashboard/route.ts` (11)

- L86: `prisma.prenotazione.findMany()` — `prisma.prenotazione.findMany({ where: { ...scope, dataArri`
- L106: `prisma.prenotazione.findMany()` — `prisma.prenotazione.findMany({ where: { ...scope, dataPart`
- L124: `prisma.prenotazione.count()` — `prisma.prenotazione.count({ where: { ...scope, stato: 'CON`
- L137: `prisma.prenotazione.count()` — `prisma.prenotazione.count({ where: { ...scope, stato: 'RICHIESTA' }, }`
- L156: `prisma.messaggio.count()` — `prisma.messaggio.count({ where: { chat: { hostId }, mittente: 'GUEST', let`
- L170: `prisma.prenotazione.count()` — `prisma.prenotazione.count({ where: { ...scope, statoCheckIn: 'ONLINE_COMPL`
- L176: `prisma.prenotazione.count()` — `? prisma.prenotazione.count({ where: { ...scope, stato: 'COMPLETATA', fa`
- L194: `prisma.prenotazione.findMany()` — `prisma.prenotazione.findMany({ where: { ...scope, stato: {`
- L249: `prisma.auditLog.findMany()` — `prisma.auditLog.findMany({ where: { hostId }, select: { azio`
- L263: `prisma.prenotazione.aggregate()` — `prisma.prenotazione.aggregate({ where: { ...scope, stato:`
- L272: `prisma.prenotazione.aggregate()` — `prisma.prenotazione.aggregate({ where: { ...scope, stato:`

### `app/api/host/email-automatiche/invia/route.ts` (3)

- L74: `prisma.prenotazione.update()` — `wait prisma.prenotazione.update({ where: { id: p.id }, data: { remind`
- L113: `prisma.prenotazione.update()` — `wait prisma.prenotazione.update({ where: { id: p.id }, data: { follow`
- L152: `prisma.appuntamentoSpa.update()` — `wait prisma.appuntamentoSpa.update({ where: { id: a.id }, data: { rem`

### `app/api/host/fatture/[id]/invia-sdi/route.ts` (2)

- L126: `prisma.fattura.update()` — `wait prisma.fattura.update({ where: { id }, data: { stato: 'INVIA`
- L151: `prisma.fattura.update()` — `wait prisma.fattura.update({ where: { id }, data: { sdiMessaggio:`

### `app/api/host/fatture/[id]/nota-credito/route.ts` (1)

- L141: `prisma.fattura.update()` — `wait prisma.fattura.update({ where: { id: originale.id }, data: { stato:`

### `app/api/host/fatture/[id]/route.ts` (3)

- L107: `prisma.fattura.update()` — `wait prisma.fattura.update({ where: { id }, data: updateData, }) const f`
- L150: `prisma.prenotazione.updateMany()` — `wait prisma.prenotazione.updateMany({ where: { fatturaId: id }, data: { fattu`
- L156: `prisma.fattura.update()` — `wait prisma.fattura.update({ where: { id }, data: { deletedAt: new Date() } }) awa`

### `app/api/host/fatture/export/route.ts` (1)

- L20: `prisma.fattura.findMany()` — `wait prisma.fattura.findMany({ where, orderBy: { dataEmissione: 'desc' }, }`

### `app/api/host/fatture/route.ts` (3)

- L58: `prisma.fattura.findMany()` — `prisma.fattura.findMany({ where, orderBy: { dataEmissione: 'desc' },`
- L75: `prisma.fattura.count()` — `prisma.fattura.count({ where }), ]) return NextResponse.json({ fatture, tot`
- L107: `prisma.prenotazione.findFirst()` — `wait prisma.prenotazione.findFirst({ where: { id: data.prenotazioneId, hostId },`

### `app/api/host/firma-display/route.ts` (6)

- L42: `prisma.struttura.update()` — `wait prisma.struttura.update({ where: { id: strutturaId }, data: { firmaD`
- L53: `prisma.prenotazione.findUnique()` — `wait prisma.prenotazione.findUnique({ where: { id: struttura.firmaDisplayPrenotaz`
- L74: `prisma.struttura.update()` — `wait prisma.struttura.update({ where: { id: strutturaId }, data: { firmaD`
- L133: `prisma.struttura.update()` — `wait prisma.struttura.update({ where: { id: strutturaId }, data: { firmaD`
- L151: `prisma.prenotazione.update()` — `wait prisma.prenotazione.update({ where: { id: prenotazioneId }, data: {`
- L157: `prisma.struttura.update()` — `wait prisma.struttura.update({ where: { id: strutturaId }, data: { firmaDispl`

### `app/api/host/gdpr/consensi/route.ts` (1)

- L17: `prisma.userConsent.findMany()` — `wait prisma.userConsent.findMany({ where: { hostId }, orderBy: { createdAt: '`

### `app/api/host/gdpr/retention-status/route.ts` (1)

- L41: `prisma.waiverSpa.count()` — `turn prisma.waiverSpa.count({ where: { appuntamento: { hostId }`

### `app/api/host/gdpr/richieste/[id]/esegui/route.ts` (1)

- L41: `prisma.richiestaCancellazione.update()` — `wait prisma.richiestaCancellazione.update({ where: { id }, data: {`

### `app/api/host/gdpr/richieste/[id]/export/route.ts` (1)

- L25: `prisma.richiestaCancellazione.findFirst()` — `wait prisma.richiestaCancellazione.findFirst({ where: { id, hostId }, select:`

### `app/api/host/gdpr/richieste/[id]/rifiuta/route.ts` (1)

- L41: `prisma.richiestaCancellazione.update()` — `wait prisma.richiestaCancellazione.update({ where: { id }, data: { stato: 'RI`

### `app/api/host/gdpr/route.ts` (2)

- L193: `prisma.accompagnatore.deleteMany()` — `wait prisma.accompagnatore.deleteMany({ where: { prenotazioneId: { in: prenotazio`
- L214: `prisma.messaggio.deleteMany()` — `wait prisma.messaggio.deleteMany({ where: { chatId: { in: chats.map(c => c.id) }`

### `app/api/host/gruppi/[id]/route.ts` (2)

- L128: `prisma.prenotazione.updateMany()` — `prisma.prenotazione.updateMany({ where: { gruppoPrenotazioneId: id },`
- L132: `prisma.gruppoPrenotazione.update()` — `prisma.gruppoPrenotazione.update({ where: { id }, data: { deletedAt:`

### `app/api/host/gruppi/route.ts` (1)

- L41: `prisma.gruppoPrenotazione.findMany()` — `wait prisma.gruppoPrenotazione.findMany({ where, include: { _count: { s`

### `app/api/host/housekeeping/route.ts` (1)

- L22: `prisma.unitaPrenotabile.findMany()` — `wait prisma.unitaPrenotabile.findMany({ where, include: { struttura: {`

### `app/api/host/housekeeping/task/[id]/route.ts` (2)

- L33: `prisma.taskHK.update()` — `wait prisma.taskHK.update({ where: { id: params.id }, data, }) return Ne`
- L56: `prisma.taskHK.delete()` — `wait prisma.taskHK.delete({ where: { id: params.id } }) return NextResponse.json({`

### `app/api/host/housekeeping/unita/[id]/route.ts` (1)

- L31: `prisma.unitaPrenotabile.update()` — `wait prisma.unitaPrenotabile.update({ where: { id: params.id }, data, })`

### `app/api/host/kiosk/route.ts` (1)

- L51: `prisma.prenotazione.update()` — `wait prisma.prenotazione.update({ where: { id: prenotazioneId }, data: {`

### `app/api/host/magazzino/[id]/movimento/route.ts` (1)

- L50: `prisma.articoloMagazzino.update()` — `prisma.articoloMagazzino.update({ where: { id }, data: { quantita: n`

### `app/api/host/magazzino/[id]/route.ts` (2)

- L30: `prisma.articoloMagazzino.update()` — `wait prisma.articoloMagazzino.update({ where: { id }, data }) return NextResponse.j`
- L45: `prisma.articoloMagazzino.delete()` — `wait prisma.articoloMagazzino.delete({ where: { id } }) return NextResponse.json({`

### `app/api/host/manutenzione/[id]/route.ts` (2)

- L40: `prisma.segnalazioneManutenzione.update()` — `wait prisma.segnalazioneManutenzione.update({ where: { id: params.id }, data,`
- L88: `prisma.segnalazioneManutenzione.delete()` — `wait prisma.segnalazioneManutenzione.delete({ where: { id: params.id } }) return Ne`

### `app/api/host/notifiche/[id]/route.ts` (1)

- L20: `prisma.notifica.update()` — `wait prisma.notifica.update({ where: { id }, data: { letta: true }, }) re`

### `app/api/host/notifiche/route.ts` (2)

- L23: `prisma.notifica.findMany()` — `prisma.notifica.findMany({ where, orderBy: { createdAt: 'desc' },`
- L29: `prisma.notifica.count()` — `prisma.notifica.count({ where }), prisma.notifica.count({ where: { hostId, l`

### `app/api/host/oggetti-smarriti/[id]/route.ts` (2)

- L32: `prisma.oggettoSmarrito.update()` — `wait prisma.oggettoSmarrito.update({ where: { id }, data }) return NextResponse.jso`
- L47: `prisma.oggettoSmarrito.delete()` — `wait prisma.oggettoSmarrito.delete({ where: { id } }) return NextResponse.json({ ok`

### `app/api/host/pacchetti/[id]/route.ts` (2)

- L59: `prisma.pacchetto.update()` — `wait prisma.pacchetto.update({ where: { id: params.id }, data: { ...dat`
- L88: `prisma.pacchetto.delete()` — `wait prisma.pacchetto.delete({ where: { id: params.id } }) return NextResponse.json`

### `app/api/host/pos/[id]/route.ts` (3)

- L61: `prisma.giftCard.findUnique()` — `wait prisma.giftCard.findUnique({ where: { id: transazione.giftCardId } }) if (gc`
- L65: `prisma.giftCard.update()` — `prisma.giftCard.update({ where: { id: gc.id }, data: { saldo`
- L82: `prisma.transazionePOS.update()` — `wait prisma.transazionePOS.update({ where: { id }, data: { stato: data.stato`

### `app/api/host/pos/route.ts` (3)

- L52: `prisma.transazionePOS.findMany()` — `wait prisma.transazionePOS.findMany({ where, include: { voci: true,`
- L138: `prisma.giftCard.findUnique()` — `wait prisma.giftCard.findUnique({ where: { id: giftCardId } }) if (gc) { co`
- L142: `prisma.giftCard.update()` — `prisma.giftCard.update({ where: { id: giftCardId }, data: {`

### `app/api/host/prenotazioni/[id]/accompagnatori/route.ts` (2)

- L46: `prisma.accompagnatore.findMany()` — `wait prisma.accompagnatore.findMany({ where: { prenotazioneId: id }, orderBy:`
- L110: `prisma.accompagnatore.delete()` — `wait prisma.accompagnatore.delete({ where: { id: accId } }) await auditFromAuth(au`

### `app/api/host/prenotazioni/[id]/addebiti/route.ts` (1)

- L35: `prisma.addebitoPrenotazione.findMany()` — `wait prisma.addebitoPrenotazione.findMany({ where: { prenotazioneId: id },`

### `app/api/host/prenotazioni/[id]/assegna-camera/route.ts` (1)

- L124: `prisma.unitaPrenotabile.findUnique()` — `wait prisma.unitaPrenotabile.findUnique({ where: { id: cameraScelta }, select`

### `app/api/host/prenotazioni/[id]/checkin-token/route.ts` (1)

- L31: `prisma.prenotazione.update()` — `wait prisma.prenotazione.update({ where: { id }, data: { checkInToken: to`

### `app/api/host/prenotazioni/[id]/checkin/route.ts` (1)

- L35: `prisma.prenotazione.update()` — `wait prisma.prenotazione.update({ where: { id: params.id }, data: {`

### `app/api/host/prenotazioni/[id]/checkout/route.ts` (1)

- L33: `prisma.prenotazione.update()` — `wait prisma.prenotazione.update({ where: { id: params.id }, data: { stato:`

### `app/api/host/prenotazioni/[id]/conto-email/route.ts` (2)

- L77: `prisma.chat.findFirst()` — `wait prisma.chat.findFirst({ where: { prenotazioneId: p.id } }) if (chat) {`
- L88: `prisma.chat.update()` — `wait prisma.chat.update({ where: { id: chat.id }, data: { updatedAt: new Date() } })`

### `app/api/host/prenotazioni/[id]/conto/route.ts` (1)

- L49: `prisma.regolaTariffa.findMany()` — `wait prisma.regolaTariffa.findMany({ where: { strutturaId: pren.struttura.id, a`

### `app/api/host/prenotazioni/[id]/documenti/route.ts` (1)

- L39: `prisma.prenotazione.update()` — `wait prisma.prenotazione.update({ where: { id }, data: { fotoDocumentoF`

### `app/api/host/prenotazioni/[id]/route.ts` (2)

- L76: `prisma.prenotazione.update()` — `wait prisma.prenotazione.update({ where: { id: params.id }, data: { sta`
- L174: `prisma.unitaPrenotabile.update()` — `wait prisma.unitaPrenotabile.update({ where: { id: prenotazione.unitaId },`

### `app/api/host/prenotazioni/[id]/send-checkin/route.ts` (2)

- L50: `prisma.prenotazione.update()` — `wait prisma.prenotazione.update({ where: { id }, data: { checkInToken: to`
- L79: `prisma.prenotazione.update()` — `wait prisma.prenotazione.update({ where: { id }, data: { reminderInviato:`

### `app/api/host/prenotazioni/[id]/send-email/route.ts` (1)

- L55: `prisma.chat.update()` — `wait prisma.chat.update({ where: { id: chatId }, data: { updatedAt: new Date() } })`

### `app/api/host/prenotazioni/[id]/stato-camera/route.ts` (1)

- L25: `prisma.unitaPrenotabile.findUnique()` — `wait prisma.unitaPrenotabile.findUnique({ where: { id: prenotazione.unitaId },`

### `app/api/host/prenotazioni/[id]/verifica-checkin/route.ts` (2)

- L22: `prisma.prenotazione.findFirst()` — `wait prisma.prenotazione.findFirst({ where: { id, hostId }, select: { id: tru`
- L34: `prisma.prenotazione.update()` — `wait prisma.prenotazione.update({ where: { id }, data: { statoCheckIn:`

### `app/api/host/prenotazioni/import/route.ts` (1)

- L61: `prisma.unitaPrenotabile.findMany()` — `wait prisma.unitaPrenotabile.findMany({ where: { struttura: { hostId }, attiva: t`

### `app/api/host/prenotazioni/route.ts` (2)

- L70: `prisma.struttura.findUnique()` — `wait prisma.struttura.findUnique({ where: { id: strutturaId }, select: {`
- L122: `prisma.struttura.findUnique()` — `wait prisma.struttura.findUnique({ where: { id: strutturaId }, select: { nome: true }`

### `app/api/host/report/incassi/route.ts` (1)

- L73: `prisma.pagamentoSpa.findMany()` — `wait prisma.pagamentoSpa.findMany({ where: { stato: 'RISCOSSO', dataR`

### `app/api/host/report/pdf/route.ts` (1)

- L28: `prisma.unitaPrenotabile.count()` — `prisma.unitaPrenotabile.count({ where: { struttura: { hostId } } }), ]) con`

### `app/api/host/report/revenue/route.ts` (2)

- L55: `prisma.prenotazione.findMany()` — `wait prisma.prenotazione.findMany({ where: { ...wherePrenBase, dataAr`
- L78: `prisma.pagamentoSpa.findMany()` — `wait prisma.pagamentoSpa.findMany({ where: { stato: 'RISCOSSO', dataR`

### `app/api/host/report/route.ts` (4)

- L133: `prisma.unitaPrenotabile.count()` — `wait prisma.unitaPrenotabile.count({ where: { struttura: { hostId } }, }) //`
- L157: `prisma.prenotazione.findMany()` — `prisma.prenotazione.findMany({ where: whereBase(inizioMese, fineMese),`
- L161: `prisma.prenotazione.findMany()` — `prisma.prenotazione.findMany({ where: whereBase(inizioMesePrec, fineMesePr`
- L166: `prisma.prenotazione.findMany()` — `prisma.prenotazione.findMany({ where: whereBase(inizioMeseYoY, fineMeseYoY`

### `app/api/host/ristorazione/menu/[id]/route.ts` (2)

- L35: `prisma.menuGiornaliero.findFirst()` — `turn prisma.menuGiornaliero.findFirst({ where: { id: menuId, struttur`
- L151: `prisma.menuGiornaliero.delete()` — `wait prisma.menuGiornaliero.delete({ where: { id } }) return NextResponse.json({ o`

### `app/api/host/ristorazione/menu/route.ts` (1)

- L67: `prisma.menuGiornaliero.findMany()` — `wait prisma.menuGiornaliero.findMany({ where, include: { piatti: { orde`

### `app/api/host/ristorazione/prenotazioni/[id]/route.ts` (2)

- L28: `prisma.prenotazioneRistorante.findFirst()` — `wait prisma.prenotazioneRistorante.findFirst({ where: { id, hostId }, select:`
- L36: `prisma.prenotazioneRistorante.update()` — `wait prisma.prenotazioneRistorante.update({ where: { id }, data: { stato: par`

### `app/api/host/ristorazione/scelte/route.ts` (1)

- L44: `prisma.sceltaPastoOspite.findMany()` — `wait prisma.sceltaPastoOspite.findMany({ where: { data: { gte: giorno, lte:`

### `app/api/host/servizi/[id]/route.ts` (2)

- L13: `prisma.servizioStruttura.update()` — `wait prisma.servizioStruttura.update({ where: { id }, data: body }) return NextResp`
- L23: `prisma.servizioStruttura.delete()` — `wait prisma.servizioStruttura.delete({ where: { id } }) return NextResponse.json({`

### `app/api/host/servizi/pacchetti/[id]/route.ts` (2)

- L14: `prisma.pacchettoServizio.update()` — `wait prisma.pacchettoServizio.update({ where: { id }, data }) return NextResponse.j`
- L24: `prisma.pacchettoServizio.delete()` — `wait prisma.pacchettoServizio.delete({ where: { id } }) return NextResponse.json({`

### `app/api/host/sidebar-badges/route.ts` (1)

- L101: `prisma.messaggio.count()` — `prisma.messaggio.count({ where: { chat: { hostId }, mitten`

### `app/api/host/spa/appuntamenti/[id]/route.ts` (2)

- L69: `prisma.appuntamentoSpa.update()` — `wait prisma.appuntamentoSpa.update({ where: { id }, data: { ...(gues`
- L160: `prisma.appuntamentoSpa.delete()` — `wait prisma.appuntamentoSpa.delete({ where: { id } }) await auditFromAuth(auth,`

### `app/api/host/spa/appuntamenti/route.ts` (1)

- L32: `prisma.appuntamentoSpa.findMany()` — `wait prisma.appuntamentoSpa.findMany({ where, include: { terapista:`

### `app/api/host/spa/cabine/[id]/dotazione/route.ts` (2)

- L24: `prisma.dotazioneCabinaSpa.findMany()` — `wait prisma.dotazioneCabinaSpa.findMany({ where: { cabinaId: id }, orderBy: [`
- L87: `prisma.dotazioneCabinaSpa.delete()` — `wait prisma.dotazioneCabinaSpa.delete({ where: { id: itemId } }) return NextRespons`

### `app/api/host/spa/cabine/[id]/hk/route.ts` (1)

- L36: `prisma.cabinaSpa.update()` — `wait prisma.cabinaSpa.update({ where: { id }, data }) return NextResponse.json({`

### `app/api/host/spa/cabine/[id]/route.ts` (2)

- L15: `prisma.cabinaSpa.update()` — `wait prisma.cabinaSpa.update({ where: { id }, data: { nome: body.nome ?`
- L36: `prisma.cabinaSpa.delete()` — `wait prisma.cabinaSpa.delete({ where: { id } }) return NextResponse.json({ ok: true`

### `app/api/host/spa/check-disponibilita/route.ts` (2)

- L63: `prisma.terapistaSpa.findMany()` — `wait prisma.terapistaSpa.findMany({ where: whereTerap, include: { dispo`
- L94: `prisma.cabinaSpa.findMany()` — `wait prisma.cabinaSpa.findMany({ where: whereCabin, orderBy: { nome: 'asc' } }) con`

### `app/api/host/spa/gift-card/[id]/route.ts` (2)

- L83: `prisma.giftCard.update()` — `wait prisma.giftCard.update({ where: { id }, data: updateData, include: {`
- L121: `prisma.giftCard.update()` — `wait prisma.giftCard.update({ where: { id }, data: { stato: 'ANNULLATA', sald`

### `app/api/host/spa/gift-card/redeem/route.ts` (2)

- L38: `prisma.giftCard.update()` — `wait prisma.giftCard.update({ where: { id: giftCard.id }, data: { stato:`
- L58: `prisma.giftCard.update()` — `prisma.giftCard.update({ where: { id: giftCard.id }, data: { saldoRe`

### `app/api/host/spa/gift-card/route.ts` (2)

- L54: `prisma.giftCard.findMany()` — `wait prisma.giftCard.findMany({ where, include: { _count: { select: { m`
- L79: `prisma.giftCard.findUnique()` — `wait prisma.giftCard.findUnique({ where: { codice: candidate } }) if (!existing)`

### `app/api/host/spa/loyalty/members/route.ts` (4)

- L51: `prisma.membroFedelta.findMany()` — `prisma.membroFedelta.findMany({ where, include: { ospite: {`
- L61: `prisma.membroFedelta.count()` — `prisma.membroFedelta.count({ where }), ]) // Calcola livello corrente per o`
- L65: `prisma.livelloFedelta.findMany()` — `wait prisma.livelloFedelta.findMany({ where: { programmaId: programma.id }, o`
- L110: `prisma.membroFedelta.findUnique()` — `wait prisma.membroFedelta.findUnique({ where: { programmaId_ospiteId: { programma`

### `app/api/host/spa/loyalty/points/route.ts` (1)

- L55: `prisma.membroFedelta.update()` — `prisma.membroFedelta.update({ where: { id: membroId }, data: {`

### `app/api/host/spa/loyalty/premi/[id]/route.ts` (5)

- L21: `prisma.premioFedelta.findFirst()` — `turn prisma.premioFedelta.findFirst({ where: { id, programma: { hostId } }, })`
- L50: `prisma.premioFedelta.update()` — `wait prisma.premioFedelta.update({ where: { id }, data }) await auditFromAuth(auth`
- L74: `prisma.movimentoPunti.count()` — `wait prisma.movimentoPunti.count({ where: { premioId: id } }) if (hasRiscatti > 0)`
- L76: `prisma.premioFedelta.update()` — `wait prisma.premioFedelta.update({ where: { id }, data: { attivo: false } }) retu`
- L80: `prisma.premioFedelta.delete()` — `wait prisma.premioFedelta.delete({ where: { id } }) await auditFromAuth(auth, {`

### `app/api/host/spa/loyalty/premi/route.ts` (1)

- L37: `prisma.premioFedelta.findMany()` — `wait prisma.premioFedelta.findMany({ where: { programmaId: programma.id }, or`

### `app/api/host/spa/loyalty/route.ts` (7)

- L55: `prisma.membroFedelta.count()` — `prisma.membroFedelta.count({ where: { programmaId: programma.id } }), prisma`
- L56: `prisma.movimentoPunti.aggregate()` — `prisma.movimentoPunti.aggregate({ where: { membro: { programmaId: programm`
- L64: `prisma.movimentoPunti.aggregate()` — `prisma.movimentoPunti.aggregate({ where: { membro: { programmaId:`
- L71: `prisma.movimentoPunti.aggregate()` — `prisma.movimentoPunti.aggregate({ where: { membro: { programmaId:`
- L106: `prisma.programmaFedelta.update()` — `wait prisma.programmaFedelta.update({ where: { id: existing.id }, data: p`
- L145: `prisma.livelloFedelta.deleteMany()` — `prisma.livelloFedelta.deleteMany({ where: { programmaId } }), ...livelli.map`
- L162: `prisma.programmaFedelta.findUnique()` — `wait prisma.programmaFedelta.findUnique({ where: { id: programmaId }, include`

### `app/api/host/spa/ospite-preferenze/[ospiteId]/route.ts` (1)

- L88: `prisma.ospiteCRM.update()` — `wait prisma.ospiteCRM.update({ where: { id: ospiteId }, data: { ...(spa`

### `app/api/host/spa/percorsi/[id]/route.ts` (2)

- L22: `prisma.percorsoBenessere.update()` — `wait prisma.percorsoBenessere.update({ where: { id }, data: { nome: res`
- L61: `prisma.percorsoBenessere.delete()` — `wait prisma.percorsoBenessere.delete({ where: { id } }) return NextResponse.json({`

### `app/api/host/spa/report/advanced/route.ts` (5)

- L108: `prisma.giftCard.aggregate()` — `prisma.giftCard.aggregate({ where: { hostId }, _count: { id: true },`
- L115: `prisma.giftCardMovimento.findMany()` — `prisma.giftCardMovimento.findMany({ where: { giftCard: { hostId },`
- L125: `prisma.programmaFedelta.findFirst()` — `prisma.programmaFedelta.findFirst({ where: { hostId }, include: { _c`
- L131: `prisma.movimentoPunti.aggregate()` — `prisma.movimentoPunti.aggregate({ where: { membro: { programma: {`
- L141: `prisma.movimentoPunti.aggregate()` — `prisma.movimentoPunti.aggregate({ where: { membro: { programma: {`

### `app/api/host/spa/terapisti/[id]/disponibilita/[slotId]/route.ts` (2)

- L24: `prisma.disponibilitaTerapista.update()` — `wait prisma.disponibilitaTerapista.update({ where: { id: slotId }, data: {`
- L51: `prisma.disponibilitaTerapista.delete()` — `wait prisma.disponibilitaTerapista.delete({ where: { id: slotId } }) return NextRes`

### `app/api/host/spa/terapisti/[id]/disponibilita/route.ts` (1)

- L19: `prisma.disponibilitaTerapista.findMany()` — `wait prisma.disponibilitaTerapista.findMany({ where: { terapistaId: id }, ord`

### `app/api/host/spa/terapisti/[id]/route.ts` (2)

- L17: `prisma.terapistaSpa.update()` — `wait prisma.terapistaSpa.update({ where: { id }, data: { nome: nome ??`
- L41: `prisma.terapistaSpa.delete()` — `wait prisma.terapistaSpa.delete({ where: { id } }) return NextResponse.json({ ok: t`

### `app/api/host/spa/trattamenti/[id]/route.ts` (2)

- L15: `prisma.trattamentoSpa.update()` — `wait prisma.trattamentoSpa.update({ where: { id }, data: { nome: body.n`
- L39: `prisma.trattamentoSpa.delete()` — `wait prisma.trattamentoSpa.delete({ where: { id } }) return NextResponse.json({ ok:`

### `app/api/host/spa/turnaway/route.ts` (1)

- L42: `prisma.turnawayTracking.findMany()` — `wait prisma.turnawayTracking.findMany({ where, include: { trattamento:`

### `app/api/host/spa/waiting-list/route.ts` (2)

- L43: `prisma.waitingListSpa.findMany()` — `wait prisma.waitingListSpa.findMany({ where, include: { trattamento: {`
- L102: `prisma.waitingListSpa.update()` — `wait prisma.waitingListSpa.update({ where: { id: parsed.data.id }, data: {`

### `app/api/host/staff/[id]/route.ts` (2)

- L31: `prisma.comunicazioneStaff.update()` — `wait prisma.comunicazioneStaff.update({ where: { id: params.id }, data, })`
- L54: `prisma.comunicazioneStaff.delete()` — `wait prisma.comunicazioneStaff.delete({ where: { id: params.id } }) return NextResp`

### `app/api/host/struttura-attiva/route.ts` (1)

- L31: `prisma.struttura.findFirst()` — `wait prisma.struttura.findFirst({ where: { id: strutturaId, hostId }, select:`

### `app/api/host/strutture/[id]/calcola-prezzo/route.ts` (3)

- L123: `prisma.unitaPrenotabile.findFirst()` — `wait prisma.unitaPrenotabile.findFirst({ where: { id: unitaId, strutturaId: param`
- L130: `prisma.tariffaPeriodo.findMany()` — `prisma.tariffaPeriodo.findMany({ where: { unitaId }, select: { unita`
- L134: `prisma.regolaTariffa.findMany()` — `prisma.regolaTariffa.findMany({ where: { strutturaId: params.id, attiva: t`

### `app/api/host/strutture/[id]/disponibilita/route.ts` (3)

- L22: `prisma.unitaPrenotabile.findMany()` — `wait prisma.unitaPrenotabile.findMany({ where: { strutturaId: params.id }, se`
- L39: `prisma.disponibilita.findMany()` — `wait prisma.disponibilita.findMany({ where, include: { unita: { select: { nom`
- L70: `prisma.unitaPrenotabile.findFirst()` — `wait prisma.unitaPrenotabile.findFirst({ where: { id: unitaId, strutturaId: params.id`

### `app/api/host/strutture/[id]/ical/route.ts` (1)

- L42: `prisma.struttura.findUnique()` — `wait prisma.struttura.findUnique({ where: { id: params.id }, select: {`

### `app/api/host/strutture/[id]/impostazioni/route.ts` (1)

- L22: `prisma.struttura.update()` — `wait prisma.struttura.update({ where: { id: params.id }, data: { // All`

### `app/api/host/strutture/[id]/pannello/route.ts` (1)

- L30: `prisma.unitaPrenotabile.findMany()` — `wait prisma.unitaPrenotabile.findMany({ where: { strutturaId: params.id, attiva:`

### `app/api/host/strutture/[id]/pasti/route.ts` (1)

- L24: `prisma.configPastoStruttura.findMany()` — `wait prisma.configPastoStruttura.findMany({ where: { strutturaId: id }, order`

### `app/api/host/strutture/[id]/regole-tariffa/route.ts` (7)

- L15: `prisma.regolaTariffa.findMany()` — `wait prisma.regolaTariffa.findMany({ where: { strutturaId: params.id }, inclu`
- L48: `prisma.unitaPrenotabile.findFirst()` — `wait prisma.unitaPrenotabile.findFirst({ where: { id: unitaId, strutturaId: params.id`
- L94: `prisma.regolaTariffa.findFirst()` — `wait prisma.regolaTariffa.findFirst({ where: { id: regolaId, strutturaId: params.id }`
- L101: `prisma.unitaPrenotabile.findFirst()` — `wait prisma.unitaPrenotabile.findFirst({ where: { id: unitaId, strutturaId: params.id`
- L105: `prisma.regolaTariffa.update()` — `wait prisma.regolaTariffa.update({ where: { id: regolaId }, data: { ...`
- L140: `prisma.regolaTariffa.findFirst()` — `wait prisma.regolaTariffa.findFirst({ where: { id: regolaId, strutturaId: params.id }`
- L143: `prisma.regolaTariffa.delete()` — `wait prisma.regolaTariffa.delete({ where: { id: regolaId } }) return new NextRespon`

### `app/api/host/strutture/[id]/route.ts` (2)

- L43: `prisma.struttura.update()` — `wait prisma.struttura.update({ where: { id: params.id }, data: { nom`
- L72: `prisma.struttura.delete()` — `wait prisma.struttura.delete({ where: { id: params.id } }) return new NextResponse`

### `app/api/host/strutture/[id]/tariffe/route.ts` (8)

- L23: `prisma.unitaPrenotabile.findMany()` — `wait prisma.unitaPrenotabile.findMany({ where: { strutturaId: params.id }, select: {`
- L25: `prisma.tariffaPeriodo.findMany()` — `wait prisma.tariffaPeriodo.findMany({ where: { unitaId: { in: unitaIds } }, i`
- L51: `prisma.unitaPrenotabile.findFirst()` — `wait prisma.unitaPrenotabile.findFirst({ where: { id: unitaId, strutturaId: params.id`
- L82: `prisma.tariffaPeriodo.findFirst()` — `wait prisma.tariffaPeriodo.findFirst({ where: { id: tariffaId }, include: { u`
- L90: `prisma.tariffaPeriodo.delete()` — `wait prisma.tariffaPeriodo.delete({ where: { id: tariffaId } }) return new NextResp`
- L108: `prisma.tariffaPeriodo.findFirst()` — `wait prisma.tariffaPeriodo.findFirst({ where: { id: tariffaId }, include: { u`
- L124: `prisma.unitaPrenotabile.findFirst()` — `wait prisma.unitaPrenotabile.findFirst({ where: { id: unitaId, strutturaId: params.id`
- L127: `prisma.tariffaPeriodo.update()` — `wait prisma.tariffaPeriodo.update({ where: { id: tariffaId }, data: { u`

### `app/api/host/strutture/[id]/unita/[unitaId]/ical/route.ts` (1)

- L41: `prisma.unitaPrenotabile.findFirst()` — `wait prisma.unitaPrenotabile.findFirst({ where: { id: params.unitaId,`

### `app/api/host/strutture/[id]/unita/[unitaId]/route.ts` (4)

- L21: `prisma.unitaPrenotabile.findFirst()` — `wait prisma.unitaPrenotabile.findFirst({ where: { id: params.unitaId, strutturaId`
- L28: `prisma.unitaPrenotabile.update()` — `wait prisma.unitaPrenotabile.update({ where: { id: params.unitaId }, data: {`
- L57: `prisma.unitaPrenotabile.findFirst()` — `wait prisma.unitaPrenotabile.findFirst({ where: { id: params.unitaId, strutturaId`
- L62: `prisma.unitaPrenotabile.delete()` — `wait prisma.unitaPrenotabile.delete({ where: { id: params.unitaId } }) return new N`

### `app/api/host/strutture/[id]/unita/route.ts` (1)

- L18: `prisma.unitaPrenotabile.findMany()` — `wait prisma.unitaPrenotabile.findMany({ where: { strutturaId: params.id },`

### `app/api/host/supporto/route.ts` (1)

- L33: `prisma.ticket.findMany()` — `wait prisma.ticket.findMany({ where, orderBy: [{ updatedAt: 'desc' }], ta`

### `app/api/host/upsell/proponi/route.ts` (2)

- L45: `prisma.unitaPrenotabile.findUnique()` — `wait prisma.unitaPrenotabile.findUnique({ where: { id: regola.aUnitaId }, sel`
- L80: `prisma.prenotazione.update()` — `wait prisma.prenotazione.update({ where: { id: prenotazioneId }, data: {`

### `app/api/host/upselling/suggerimenti/[id]/route.ts` (2)

- L55: `prisma.upsellingSuggerimento.update()` — `wait prisma.upsellingSuggerimento.update({ where: { id }, data, }) await`
- L85: `prisma.upsellingSuggerimento.delete()` — `wait prisma.upsellingSuggerimento.delete({ where: { id } }) await auditFromAuth(au`

### `app/api/host/utenti/[id]/route.ts` (2)

- L61: `prisma.staffMember.update()` — `wait prisma.staffMember.update({ where: { id }, data: { ...(ruolo !== u`
- L106: `prisma.staffMember.delete()` — `wait prisma.staffMember.delete({ where: { id } }) await auditFromAuth(auth, {`

### `app/api/host/utenti/inviti/[id]/route.ts` (2)

- L28: `prisma.staffInvite.update()` — `wait prisma.staffInvite.update({ where: { id }, data: { stato: 'REVOCATO' },`
- L64: `prisma.staffInvite.update()` — `wait prisma.staffInvite.update({ where: { id }, data: { scadenzaAt }, })`

### `app/api/host/webhooks/[id]/route.ts` (2)

- L52: `prisma.webhookSubscription.update()` — `wait prisma.webhookSubscription.update({ where: { id }, data: { ...(par`
- L88: `prisma.webhookSubscription.delete()` — `wait prisma.webhookSubscription.delete({ where: { id } }) await audit({ hostId`

### `app/api/host/wifi/access-codes/[id]/route.ts` (1)

- L28: `prisma.wifiAccessCode.update()` — `wait prisma.wifiAccessCode.update({ where: { id }, data: { revocatoAt: new Da`

### `app/api/host/wifi/devices/[mac]/route.ts` (2)

- L40: `prisma.wifiDevice.update()` — `wait prisma.wifiDevice.update({ where: { id: existing.id }, data: {`
- L67: `prisma.wifiDevice.delete()` — `wait prisma.wifiDevice.delete({ where: { id: existing.id } }) return NextResponse.`

### `app/api/host/wifi/devices/[mac]/splash/route.ts` (1)

- L76: `prisma.wifiDevice.update()` — `prisma.wifiDevice.update({ where: { id: device.id }, data: { splas`

---

## Modelli globali esclusi dall'audit

Questi modelli non hanno `hostId` per design e sono accettati senza filtro:
- `comuniTassaSoggiorno`
- `notificaSuperadmin`
- `piattaformaConfig`
- `platformSettings`
- `session`
- `systemConfig`
- `trace`
- `verificationToken`