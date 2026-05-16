import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

async function main() {
  // Configurazione brand Mastroberardino — stile "Hotel Chic" caldo
  const splashConfig = {
    v: 1,
    // Branding
    titolo: 'Masseria MastroBerardino',
    sottotitolo: 'Wi-Fi gratuito per i nostri ospiti',
    logoHeight: 60,
    // logoUrl: '', // lasciamo vuoto per ora, l'host può caricarlo da UI
    // Colori — palette terra/oro caldo
    colorePrimario: '#92400e',     // marrone bronzo
    coloreSfondo: '#fef3c7',        // crema chiaro
    coloreTesto: '#451a03',         // marrone scuro
    // sfondoImmagineUrl: '', // foto masseria da caricare poi
    // Testi form
    messaggioWelcome: 'Benvenuto nella nostra masseria. Inserisci il codice ricevuto al check-in oppure i tuoi dati di prenotazione.',
    testoBottone: 'Connetti al Wi-Fi',
    labelTabCodice: 'Ho un codice',
    labelTabPrenotazione: 'Sono ospite',
    mostraTabCodice: true,
    mostraTabPrenotazione: true,
    // Footer + legale
    testoFooter: '© 2026 Masseria MastroBerardino · Connettività offerta agli ospiti',
    urlTermsConditions: 'https://www.masseriamastroberardino.it/termini',
    urlPrivacyPolicy: 'https://www.masseriamastroberardino.it/privacy',
    // Success page
    successTitolo: 'Connesso!',
    successMessaggio: 'Buona navigazione. Per qualsiasi necessità, contatta la reception.',
    // Template tag (per UI)
    template: 'hotel-chic',
    lingue: ['it'],
  }

  const host = await p.host.update({
    where: { id: 'cmnzwtsbg0003rbwfne2ees20' },
    data: { splashConfig },
    select: { nomeAzienda: true, splashConfig: true },
  })
  console.log('Updated:', host.nomeAzienda)
  console.log('Config:', JSON.stringify(host.splashConfig, null, 2))
}
main().catch(console.error).finally(() => p.$disconnect())
