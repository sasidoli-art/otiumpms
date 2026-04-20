/**
 * Backfill new host config models from legacy Host fields.
 *
 * Per ogni host crea/aggiorna HostSmtpConfig, HostConciergeConfig,
 * HostWifiConfig, HostBillingInfo copiando i campi corrispondenti.
 *
 * Idempotente: usa upsert. Se il modello dedicato esiste già lo aggiorna
 * (utile se in seguito ci sono divergenze, ma normalmente non dovrebbero
 * esistere finché non si completa la fase 2).
 *
 * Run: npx tsx scripts/backfill-host-configs.ts
 * Dry: npx tsx scripts/backfill-host-configs.ts --dry
 */

import { prisma } from '../lib/db'

async function main() {
  const dryRun = process.argv.includes('--dry')
  console.log(dryRun ? '🔍 DRY RUN (no writes)' : '⚙️  Backfilling host config sub-models…')

  const hosts = await prisma.host.findMany({
    select: {
      id: true,
      // SMTP
      smtpHost: true, smtpPort: true, smtpUser: true, smtpPass: true, emailMittente: true,
      emailHousekeeping: true, emailManutenzione: true, emailRistorazione: true, emailReception: true,
      // Concierge
      conciergeAttivo: true, conciergeProvider: true, conciergeApiKey: true,
      conciergeModel: true, conciergeBaseUrl: true, conciergeSystemPrompt: true,
      conciergeGdprAcceptedAt: true,
      whatsappNumeroId: true, whatsappAccessToken: true, whatsappVerifyToken: true,
      // Wi-Fi
      wifiAuthPms: true, wifiAuthCode: true, wifiAuthComplimentary: true,
      wifiComplimentaryMins: true, wifiAuthUserForm: true, wifiAuthSocial: true,
      wifiRedirectUrl: true, wifiWelcomeMessage: true,
      // Billing
      fattNomeAzienda: true, fattPartitaIva: true, fattIndirizzo: true, fattCitta: true,
      fattCap: true, fattProvincia: true, fattPaese: true, fattEmail: true, fattPec: true,
      fattCodiceSDI: true, regimeFiscale: true,
      sdiProvider: true, sdiApiKey: true, sdiUsername: true, sdiCompanyId: true,
    },
  })

  let done = 0
  for (const h of hosts) {
    if (dryRun) {
      console.log(`  Host ${h.id}: would backfill smtp+concierge+wifi+billing`)
      done++
      continue
    }

    await prisma.$transaction([
      prisma.hostSmtpConfig.upsert({
        where: { hostId: h.id },
        update: {
          smtpHost: h.smtpHost, smtpPort: h.smtpPort, smtpUser: h.smtpUser, smtpPass: h.smtpPass,
          emailMittente: h.emailMittente,
          emailHousekeeping: h.emailHousekeeping, emailManutenzione: h.emailManutenzione,
          emailRistorazione: h.emailRistorazione, emailReception: h.emailReception,
        },
        create: {
          hostId: h.id,
          smtpHost: h.smtpHost, smtpPort: h.smtpPort, smtpUser: h.smtpUser, smtpPass: h.smtpPass,
          emailMittente: h.emailMittente,
          emailHousekeeping: h.emailHousekeeping, emailManutenzione: h.emailManutenzione,
          emailRistorazione: h.emailRistorazione, emailReception: h.emailReception,
        },
      }),
      prisma.hostConciergeConfig.upsert({
        where: { hostId: h.id },
        update: {
          conciergeAttivo: h.conciergeAttivo, conciergeProvider: h.conciergeProvider,
          conciergeApiKey: h.conciergeApiKey, conciergeModel: h.conciergeModel,
          conciergeBaseUrl: h.conciergeBaseUrl, conciergeSystemPrompt: h.conciergeSystemPrompt,
          conciergeGdprAcceptedAt: h.conciergeGdprAcceptedAt,
          whatsappNumeroId: h.whatsappNumeroId, whatsappAccessToken: h.whatsappAccessToken,
          whatsappVerifyToken: h.whatsappVerifyToken,
        },
        create: {
          hostId: h.id,
          conciergeAttivo: h.conciergeAttivo, conciergeProvider: h.conciergeProvider,
          conciergeApiKey: h.conciergeApiKey, conciergeModel: h.conciergeModel,
          conciergeBaseUrl: h.conciergeBaseUrl, conciergeSystemPrompt: h.conciergeSystemPrompt,
          conciergeGdprAcceptedAt: h.conciergeGdprAcceptedAt,
          whatsappNumeroId: h.whatsappNumeroId, whatsappAccessToken: h.whatsappAccessToken,
          whatsappVerifyToken: h.whatsappVerifyToken,
        },
      }),
      prisma.hostWifiConfig.upsert({
        where: { hostId: h.id },
        update: {
          wifiAuthPms: h.wifiAuthPms, wifiAuthCode: h.wifiAuthCode,
          wifiAuthComplimentary: h.wifiAuthComplimentary, wifiComplimentaryMins: h.wifiComplimentaryMins,
          wifiAuthUserForm: h.wifiAuthUserForm, wifiAuthSocial: h.wifiAuthSocial,
          wifiRedirectUrl: h.wifiRedirectUrl, wifiWelcomeMessage: h.wifiWelcomeMessage,
        },
        create: {
          hostId: h.id,
          wifiAuthPms: h.wifiAuthPms, wifiAuthCode: h.wifiAuthCode,
          wifiAuthComplimentary: h.wifiAuthComplimentary, wifiComplimentaryMins: h.wifiComplimentaryMins,
          wifiAuthUserForm: h.wifiAuthUserForm, wifiAuthSocial: h.wifiAuthSocial,
          wifiRedirectUrl: h.wifiRedirectUrl, wifiWelcomeMessage: h.wifiWelcomeMessage,
        },
      }),
      prisma.hostBillingInfo.upsert({
        where: { hostId: h.id },
        update: {
          fattNomeAzienda: h.fattNomeAzienda, fattPartitaIva: h.fattPartitaIva,
          fattIndirizzo: h.fattIndirizzo, fattCitta: h.fattCitta, fattCap: h.fattCap,
          fattProvincia: h.fattProvincia, fattPaese: h.fattPaese, fattEmail: h.fattEmail,
          fattPec: h.fattPec, fattCodiceSDI: h.fattCodiceSDI, regimeFiscale: h.regimeFiscale,
          sdiProvider: h.sdiProvider, sdiApiKey: h.sdiApiKey, sdiUsername: h.sdiUsername,
          sdiCompanyId: h.sdiCompanyId,
        },
        create: {
          hostId: h.id,
          fattNomeAzienda: h.fattNomeAzienda, fattPartitaIva: h.fattPartitaIva,
          fattIndirizzo: h.fattIndirizzo, fattCitta: h.fattCitta, fattCap: h.fattCap,
          fattProvincia: h.fattProvincia, fattPaese: h.fattPaese, fattEmail: h.fattEmail,
          fattPec: h.fattPec, fattCodiceSDI: h.fattCodiceSDI, regimeFiscale: h.regimeFiscale,
          sdiProvider: h.sdiProvider, sdiApiKey: h.sdiApiKey, sdiUsername: h.sdiUsername,
          sdiCompanyId: h.sdiCompanyId,
        },
      }),
    ])

    done++
    console.log(`  Host ${h.id}: backfilled 4 sub-models`)
  }

  console.log(`\n✨ Done. Backfilled ${done}/${hosts.length} hosts.`)
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
