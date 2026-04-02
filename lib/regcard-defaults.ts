/**
 * Testi legali standard per la Registration Card.
 *
 * Placeholder sostituiti automaticamente:
 * - {{NOME_HOTEL}} → nomeAzienda dell'host
 * - {{CITTA_FORO}} → città dell'host (per foro competente)
 * - {{PENALE_FUMO}} → importo penale fumo (default €250)
 * - {{COSTO_CHIAVE}} → costo sostituzione chiave (default €25)
 *
 * Permessi:
 * - SuperAdmin: imposta il template master (questo file)
 * - Host: può personalizzare tramite /host/impostazioni-regcard
 * - Le clausole obbligatorie (GDPR, responsabilità) non possono essere rimosse
 */

export const DEFAULT_REGCARD_IT = `Con la sottoscrizione della presente scheda di registrazione, il Cliente autorizza {{NOME_HOTEL}}, in qualità di Titolare del trattamento, ad addebitare sulla carta di credito fornita a garanzia tutti i costi e le spese presenti e future, inclusi i danni fisici arrecati alla proprietà dell'Hotel, relativi al periodo di soggiorno del titolare della prenotazione e dei suoi accompagnatori.

Il titolare della prenotazione dichiara di essere pienamente responsabile per la condotta di tutti i suoi accompagnatori e accetta espressamente che qualsiasi danno causato dagli accompagnatori alla proprietà dell'Hotel, così come eventuali conti o servizi non pagati, siano integralmente addebitati sulla carta di credito fornita in garanzia per la prenotazione.

Il sottoscritto dichiara di essere a conoscenza che, qualora desideri effettuare il pagamento con mezzo diverso dalla carta di credito, dovrà darne preventiva comunicazione all'Ufficio Ricevimento.

Il Cliente è altresì informato che le camere dell'Hotel sono dotate di casseforti a disposizione degli ospiti e si impegna a dichiarare tutti gli oggetti di valore in suo possesso, che dovranno essere custoditi all'interno delle medesime. In caso di mancata dichiarazione e di oggetti lasciati incustoditi nella stanza, il sottoscritto assume integralmente il rischio di furto, perdita o danneggiamento.

Il sottoscritto dichiara di aver preso visione e di accettare integralmente il Regolamento Interno dell'Hotel, esposto nella reception e disponibile in camera, impegnandosi a rispettarne tutte le disposizioni.

Le camere dell'Hotel sono rigorosamente non fumatori. In caso di violazione sarà addebitata una penale di €{{PENALE_FUMO}} per spese di sanificazione straordinaria, oltre a eventuali danni.

L'eventuale consumo del minibar presente in camera sarà automaticamente addebitato sulla carta di credito fornita in garanzia.

In caso di smarrimento della key card o della chiave della camera, il Cliente autorizza {{NOME_HOTEL}} ad addebitare il costo di sostituzione pari a €{{COSTO_CHIAVE}} sulla carta di credito.

L'ospite utilizza a proprio rischio e pericolo tutte le strutture e i servizi dell'Hotel (piscina, palestra, spa, ecc.). {{NOME_HOTEL}} declina ogni responsabilità per infortuni, danni alla persona o agli effetti personali non derivanti da grave negligenza dell'Hotel.

Il parcheggio è incustodito. {{NOME_HOTEL}} non è responsabile per furti, danni o incidenti relativi ai veicoli parcheggiati.

Con la sottoscrizione della presente scheda di registrazione, l'ospite presta il proprio specifico consenso al trattamento dei dati personali per finalità promozionali, commerciali e di marketing, ai sensi del Regolamento UE 2016/679 (GDPR) e dell'art. 58 del D.Lgs. 206/2005 (Codice del Consumo).

I dati raccolti nel presente modulo trovano fondamento giuridico nella partecipazione a un contratto di servizio.

Il presente modulo è regolato dalla legge italiana. Per qualsiasi controversia sarà competente in via esclusiva il Foro di {{CITTA_FORO}}.`

export const DEFAULT_REGCARD_EN = `By signing this registration form, the Guest hereby authorizes {{NOME_HOTEL}}, in its capacity as Data Controller, to charge all present and future costs and expenses — including any physical damage caused to the Hotel property — to the credit card provided as guarantee, for the entire duration of the stay by the booking holder and any accompanying persons.

The booking holder declares that he/she is fully responsible for the conduct of all his/her accompanying persons and expressly accepts that any damage caused by the accompanying persons to the Hotel property, as well as any unpaid bills or services, shall be entirely charged to the credit card provided as guarantee for the booking.

The undersigned acknowledges that, should he/she wish to settle the account by any means other than the credit card, prior notice must be given to the Front Desk.

The Guest is also aware that the Hotel rooms are equipped with in-room safes for the use of guests and undertakes to declare all valuables in his/her possession, which must be stored inside such safes. Should any valuables not be declared and be left unattended in the room, the Guest accepts full responsibility and the risk of theft, loss or damage.

The undersigned declares to have read and fully accepted the Hotel's Internal Regulations, displayed at the reception and available in the room, and undertakes to comply with all its provisions.

All Hotel rooms are strictly non-smoking. In case of violation, a penalty of €{{PENALE_FUMO}} will be charged for extraordinary cleaning costs, in addition to any damages.

Any consumption from the in-room minibar will be automatically charged to the credit card provided as guarantee.

In the event of loss of the key card or room key, the Guest authorizes {{NOME_HOTEL}} to charge the replacement cost of €{{COSTO_CHIAVE}} to the credit card.

The Guest uses all Hotel facilities and services (pool, gym, spa, etc.) at his/her own risk. {{NOME_HOTEL}} declines any liability for personal injury or damage to personal effects not caused by gross negligence of the Hotel.

The parking area is unattended. {{NOME_HOTEL}} is not liable for theft, damage or accidents involving vehicles parked on the premises.

By signing this registration form, the Guest gives his/her explicit consent to the processing of personal data for promotional, commercial and marketing purposes, pursuant to Regulation (EU) 2016/679 (GDPR) and Article 58 of Italian Legislative Decree No. 206/2005 (Consumer Code).

The data collected in this form are processed on the legal basis of the performance of the service agreement.

This form is governed by Italian law. Any dispute shall be subject to the exclusive jurisdiction of the Court of {{CITTA_FORO}}.`

/**
 * Sostituisce i placeholder nel testo con i dati dell'hotel.
 */
export function compileRegCardText(
  template: string,
  data: {
    nomeHotel: string
    cittaForo?: string
    penaleFumo?: string
    costoChiave?: string
  }
): string {
  return template
    .replace(/\{\{NOME_HOTEL\}\}/g, data.nomeHotel)
    .replace(/\{\{CITTA_FORO\}\}/g, data.cittaForo ?? data.nomeHotel)
    .replace(/\{\{PENALE_FUMO\}\}/g, data.penaleFumo ?? '250')
    .replace(/\{\{COSTO_CHIAVE\}\}/g, data.costoChiave ?? '25')
}

/**
 * Clausole obbligatorie che NON possono essere rimosse dall'host.
 * Usate per validare che il testo personalizzato le contenga.
 */
export const CLAUSOLE_OBBLIGATORIE_IT = [
  'Regolamento UE 2016/679',
  'trattamento dei dati personali',
  'contratto di servizio',
]

export const CLAUSOLE_OBBLIGATORIE_EN = [
  'Regulation (EU) 2016/679',
  'processing of personal data',
  'service agreement',
]
