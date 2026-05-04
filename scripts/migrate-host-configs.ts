/**
 * scripts/migrate-host-configs.ts
 *
 * Migrazione idempotente dei dati Host → tabelle satellite (god object split).
 * Lancia: `npx ts-node --project tsconfig.scripts.json scripts/migrate-host-configs.ts`
 *
 * Per ogni host nel DB:
 *   1. HostSmtpConfig    ← campi smtp_ + email_ di Host (se non esiste già)
 *   2. HostConciergeConfig ← campi concierge_ + whatsapp_ di Host (se non esiste)
 *   3. HostWifiConfig    ← campi wifi_ di Host (se non esiste)
 *   4. HostBillingInfo   ← campi fatt_, sdi_, regimeFiscale di Host (se non esiste)
 *   5. HostWhatsAppConfig ← campi whatsapp_ da HostConciergeConfig (NEW 2026-05-04)
 *   6. HostBrandingConfig ← campi regCard_, logo da Host (NEW 2026-05-04)
 *
 * Idempotenza: se la tabella satellite esiste già per un host, SKIP.
 * Nessun campo viene rimosso da Host (Fase 3 farà il drop).
 */
import { prisma } from '@/lib/db'

interface MigrationStats {
  hosts: number
  smtpCreated: number
  conciergeCreated: number
  wifiCreated: number
  billingCreated: number
  whatsappCreated: number
  brandingCreated: number
  smtpSkipped: number
  conciergeSkipped: number
  wifiSkipped: number
  billingSkipped: number
  whatsappSkipped: number
  brandingSkipped: number
}

async function main() {
  const stats: MigrationStats = {
    hosts: 0,
    smtpCreated: 0, conciergeCreated: 0, wifiCreated: 0,
    billingCreated: 0, whatsappCreated: 0, brandingCreated: 0,
    smtpSkipped: 0, conciergeSkipped: 0, wifiSkipped: 0,
    billingSkipped: 0, whatsappSkipped: 0, brandingSkipped: 0,
  }

  const hosts = await prisma.host.findMany({
    select: {
      id: true, nomeAzienda: true,
      smtpHost: true, smtpPort: true, smtpUser: true, smtpPass: true,
      emailMittente: true,
      emailHousekeeping: true, emailManutenzione: true,
      emailRistorazione: true, emailReception: true,
      conciergeAttivo: true, conciergeProvider: true, conciergeApiKey: true,
      conciergeModel: true, conciergeBaseUrl: true, conciergeSystemPrompt: true,
      conciergeGdprAcceptedAt: true,
      whatsappNumeroId: true, whatsappAccessToken: true, whatsappVerifyToken: true,
      wifiAuthPms: true, wifiAuthCode: true, wifiAuthComplimentary: true,
      wifiComplimentaryMins: true, wifiAuthUserForm: true,
      wifiAuthEmailOnly: true, wifiAuthSocial: true,
      wifiRedirectUrl: true, wifiWelcomeMessage: true,
      fattNomeAzienda: true, fattPartitaIva: true,
      fattIndirizzo: true, fattCitta: true, fattCap: true,
      fattProvincia: true, fattPaese: true, fattEmail: true,
      fattPec: true, fattCodiceSDI: true, regimeFiscale: true,
      sdiProvider: true, sdiApiKey: true, sdiUsername: true, sdiCompanyId: true,
      logo: true,
      regCardTerminiHtml: true, regCardPrivacyHtml: true,
      regCardSpaTerminiHtml: true, regCardCampiExtra: true,
    },
  })

  stats.hosts = hosts.length
  console.log(`\n=== MIGRATE HOST CONFIGS ===\nHost trovati: ${hosts.length}\n`)

  for (const host of hosts) {
    const tag = `[${host.id.slice(0, 8)}/${host.nomeAzienda?.slice(0, 30) ?? '?'}]`

    // ── 1. SMTP ──
    const smtpExists = await prisma.hostSmtpConfig.findUnique({ where: { hostId: host.id } })
    if (!smtpExists) {
      const hasSmtp = host.smtpHost || host.smtpUser || host.smtpPass
      if (hasSmtp) {
        await prisma.hostSmtpConfig.create({
          data: {
            hostId: host.id,
            smtpHost: host.smtpHost, smtpPort: host.smtpPort,
            smtpUser: host.smtpUser, smtpPass: host.smtpPass,
            emailMittente: host.emailMittente,
            emailHousekeeping: host.emailHousekeeping,
            emailManutenzione: host.emailManutenzione,
            emailRistorazione: host.emailRistorazione,
            emailReception: host.emailReception,
          },
        })
        stats.smtpCreated++
        console.log(`${tag} ✓ SmtpConfig creato`)
      }
    } else {
      stats.smtpSkipped++
    }

    // ── 2. Concierge ──
    const conciergeExists = await prisma.hostConciergeConfig.findUnique({ where: { hostId: host.id } })
    if (!conciergeExists) {
      const hasConcierge = host.conciergeAttivo || host.conciergeApiKey || host.whatsappAccessToken
      if (hasConcierge) {
        await prisma.hostConciergeConfig.create({
          data: {
            hostId: host.id,
            conciergeAttivo: host.conciergeAttivo,
            conciergeProvider: host.conciergeProvider,
            conciergeApiKey: host.conciergeApiKey,
            conciergeModel: host.conciergeModel,
            conciergeBaseUrl: host.conciergeBaseUrl,
            conciergeSystemPrompt: host.conciergeSystemPrompt,
            conciergeGdprAcceptedAt: host.conciergeGdprAcceptedAt,
            whatsappNumeroId: host.whatsappNumeroId,
            whatsappAccessToken: host.whatsappAccessToken,
            whatsappVerifyToken: host.whatsappVerifyToken,
          },
        })
        stats.conciergeCreated++
        console.log(`${tag} ✓ ConciergeConfig creato`)
      }
    } else {
      stats.conciergeSkipped++
    }

    // ── 3. Wifi ──
    const wifiExists = await prisma.hostWifiConfig.findUnique({ where: { hostId: host.id } })
    if (!wifiExists) {
      await prisma.hostWifiConfig.create({
        data: {
          hostId: host.id,
          wifiAuthPms: host.wifiAuthPms,
          wifiAuthCode: host.wifiAuthCode,
          wifiAuthComplimentary: host.wifiAuthComplimentary,
          wifiComplimentaryMins: host.wifiComplimentaryMins,
          wifiAuthUserForm: host.wifiAuthUserForm,
          wifiAuthEmailOnly: host.wifiAuthEmailOnly,
          wifiAuthSocial: host.wifiAuthSocial,
          wifiRedirectUrl: host.wifiRedirectUrl,
          wifiWelcomeMessage: host.wifiWelcomeMessage,
        },
      })
      stats.wifiCreated++
      console.log(`${tag} ✓ WifiConfig creato`)
    } else {
      stats.wifiSkipped++
    }

    // ── 4. Billing ──
    const billingExists = await prisma.hostBillingInfo.findUnique({ where: { hostId: host.id } })
    if (!billingExists) {
      const hasBilling = host.fattNomeAzienda || host.fattPartitaIva || host.sdiProvider
      if (hasBilling) {
        await prisma.hostBillingInfo.create({
          data: {
            hostId: host.id,
            fattNomeAzienda: host.fattNomeAzienda,
            fattPartitaIva: host.fattPartitaIva,
            fattIndirizzo: host.fattIndirizzo,
            fattCitta: host.fattCitta,
            fattCap: host.fattCap,
            fattProvincia: host.fattProvincia,
            fattPaese: host.fattPaese,
            fattEmail: host.fattEmail,
            fattPec: host.fattPec,
            fattCodiceSDI: host.fattCodiceSDI,
            regimeFiscale: host.regimeFiscale,
            sdiProvider: host.sdiProvider,
            sdiApiKey: host.sdiApiKey,
            sdiUsername: host.sdiUsername,
            sdiCompanyId: host.sdiCompanyId,
          },
        })
        stats.billingCreated++
        console.log(`${tag} ✓ BillingInfo creato`)
      }
    } else {
      stats.billingSkipped++
    }

    // ── 5. WhatsApp (NEW: copia da HostConciergeConfig se presente) ──
    const whatsappExists = await prisma.hostWhatsAppConfig.findUnique({ where: { hostId: host.id } })
    if (!whatsappExists) {
      // Source: prima HostConciergeConfig (post-migrazione), poi Host (legacy)
      const conciergeData = await prisma.hostConciergeConfig.findUnique({
        where: { hostId: host.id },
        select: { whatsappAccessToken: true, whatsappNumeroId: true, whatsappVerifyToken: true },
      })
      const accessToken = conciergeData?.whatsappAccessToken ?? host.whatsappAccessToken
      const phoneNumberId = conciergeData?.whatsappNumeroId ?? host.whatsappNumeroId
      const verifyToken = conciergeData?.whatsappVerifyToken ?? host.whatsappVerifyToken

      if (accessToken || phoneNumberId || verifyToken) {
        await prisma.hostWhatsAppConfig.create({
          data: {
            hostId: host.id,
            accessToken,
            phoneNumberId,
            verifyToken,
            webhookSecret: null, // legacy non aveva — l'host lo configurerà via UI
            configurato: !!(accessToken && phoneNumberId),
          },
        })
        stats.whatsappCreated++
        console.log(`${tag} ✓ WhatsAppConfig creato`)
      }
    } else {
      stats.whatsappSkipped++
    }

    // ── 6. Branding (NEW: copia da Host) ──
    const brandingExists = await prisma.hostBrandingConfig.findUnique({ where: { hostId: host.id } })
    if (!brandingExists) {
      const hasBranding = host.logo || host.regCardTerminiHtml || host.regCardPrivacyHtml || host.regCardSpaTerminiHtml
      if (hasBranding) {
        await prisma.hostBrandingConfig.create({
          data: {
            hostId: host.id,
            logo: host.logo,
            regCardTerminiHtml: host.regCardTerminiHtml,
            regCardPrivacyHtml: host.regCardPrivacyHtml,
            regCardSpaTerminiHtml: host.regCardSpaTerminiHtml,
            regCardCampiExtra: host.regCardCampiExtra ?? undefined,
          },
        })
        stats.brandingCreated++
        console.log(`${tag} ✓ BrandingConfig creato`)
      }
    } else {
      stats.brandingSkipped++
    }
  }

  console.log(`\n=== RIEPILOGO ===`)
  console.log(`Host scansionati:       ${stats.hosts}`)
  console.log(`SmtpConfig:    creati ${stats.smtpCreated}, skip ${stats.smtpSkipped}`)
  console.log(`ConciergeConfig: creati ${stats.conciergeCreated}, skip ${stats.conciergeSkipped}`)
  console.log(`WifiConfig:    creati ${stats.wifiCreated}, skip ${stats.wifiSkipped}`)
  console.log(`BillingInfo:   creati ${stats.billingCreated}, skip ${stats.billingSkipped}`)
  console.log(`WhatsAppConfig (NEW): creati ${stats.whatsappCreated}, skip ${stats.whatsappSkipped}`)
  console.log(`BrandingConfig (NEW): creati ${stats.brandingCreated}, skip ${stats.brandingSkipped}`)
  console.log(`\n✅ Migrazione completata`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error('❌ Migrazione fallita:', err)
    await prisma.$disconnect()
    process.exit(1)
  })
