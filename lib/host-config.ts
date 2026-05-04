/**
 * Host config access layer (Fase 1 God Object split).
 *
 * Durante la migrazione, i campi vivono su due posti:
 *  - Host.{smtp*, concierge*, wifi*, fatt*, sdi*} (legacy)
 *  - HostSmtpConfig / HostConciergeConfig / HostWifiConfig / HostBillingInfo (new)
 *
 * Strategia:
 *  - READ: preferisci il nuovo modello; fallback a Host se non presente.
 *  - WRITE: dual-write — aggiorna ENTRAMBI per mantenere sincronia.
 *
 * In Fase 2, i consumer vengono migrati uno-a-uno a queste API.
 * In Fase 3, i campi legacy su Host verranno rimossi e questa lib leggerà
 * solo dai modelli dedicati.
 */

import { prisma } from '@/lib/db';
import { applySecretUpdate, revealSecret } from '@/lib/secrets';

// ─── SMTP ────────────────────────────────────────────────────────────────────

export type SmtpConfig = {
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUser: string | null;
  smtpPass: string | null; // encrypted at rest, decrypted on read
  emailMittente: string | null;
  emailHousekeeping: string | null;
  emailManutenzione: string | null;
  emailRistorazione: string | null;
  emailReception: string | null;
};

export async function getSmtpConfig(hostId: string): Promise<SmtpConfig | null> {
  const cfg = await prisma.hostSmtpConfig.findUnique({ where: { hostId } });
  if (cfg) {
    return {
      smtpHost: cfg.smtpHost,
      smtpPort: cfg.smtpPort,
      smtpUser: cfg.smtpUser,
      smtpPass: revealSecret(cfg.smtpPass),
      emailMittente: cfg.emailMittente,
      emailHousekeeping: cfg.emailHousekeeping,
      emailManutenzione: cfg.emailManutenzione,
      emailRistorazione: cfg.emailRistorazione,
      emailReception: cfg.emailReception,
    };
  }
  // Fallback legacy
  const host = await prisma.host.findUnique({
    where: { id: hostId },
    select: {
      smtpHost: true, smtpPort: true, smtpUser: true, smtpPass: true, emailMittente: true,
      emailHousekeeping: true, emailManutenzione: true, emailRistorazione: true, emailReception: true,
    },
  });
  if (!host) return null;
  return {
    ...host,
    smtpPass: revealSecret(host.smtpPass),
  };
}

export type SmtpConfigPatch = Partial<Omit<SmtpConfig, 'smtpPass'>> & {
  smtpPass?: string | null; // plaintext; viene cifrato internamente
};

export async function setSmtpConfig(hostId: string, patch: SmtpConfigPatch): Promise<void> {
  const existing = await prisma.hostSmtpConfig.findUnique({ where: { hostId } });
  const data: Record<string, unknown> = { ...patch };
  if (patch.smtpPass !== undefined) {
    data.smtpPass = applySecretUpdate(patch.smtpPass, existing?.smtpPass ?? null);
  }
  await prisma.hostSmtpConfig.upsert({
    where: { hostId },
    update: data,
    create: { hostId, ...data },
  });
  // Dual-write legacy su Host
  const hostData: Record<string, unknown> = { ...patch };
  if (patch.smtpPass !== undefined) {
    const hostExisting = await prisma.host.findUnique({ where: { id: hostId }, select: { smtpPass: true } });
    hostData.smtpPass = applySecretUpdate(patch.smtpPass, hostExisting?.smtpPass ?? null);
  }
  await prisma.host.update({ where: { id: hostId }, data: hostData });
}

// ─── Concierge (AI + WhatsApp) ───────────────────────────────────────────────

export type ConciergeConfig = {
  conciergeAttivo: boolean;
  conciergeProvider: string | null;
  conciergeApiKey: string | null; // decrypted
  conciergeModel: string | null;
  conciergeBaseUrl: string | null;
  conciergeSystemPrompt: string | null;
  conciergeGdprAcceptedAt: Date | null;
  // Tuning AI (nuovi campi su HostConciergeConfig — non su Host legacy)
  conciergeTemperatura: number | null;
  conciergeMaxToken: number | null;
  conciergeKnowledgeBase: string | null;
  // Comportamento
  conciergeLinguaDefault: string | null;
  conciergeAutoEscalation: number | null;
  conciergeOrariAttiviDa: string | null;
  conciergeOrariAttiviA: string | null;
  conciergeMessaggioFuoriOrario: string | null;
  // WhatsApp
  whatsappNumeroId: string | null;
  whatsappAccessToken: string | null; // decrypted
  whatsappVerifyToken: string | null;
};

export async function getConciergeConfig(hostId: string): Promise<ConciergeConfig | null> {
  const cfg = await prisma.hostConciergeConfig.findUnique({ where: { hostId } });
  if (cfg) {
    return {
      conciergeAttivo: cfg.conciergeAttivo,
      conciergeProvider: cfg.conciergeProvider,
      conciergeApiKey: revealSecret(cfg.conciergeApiKey),
      conciergeModel: cfg.conciergeModel,
      conciergeBaseUrl: cfg.conciergeBaseUrl,
      conciergeSystemPrompt: cfg.conciergeSystemPrompt,
      conciergeGdprAcceptedAt: cfg.conciergeGdprAcceptedAt,
      conciergeTemperatura: cfg.conciergeTemperatura,
      conciergeMaxToken: cfg.conciergeMaxToken,
      conciergeKnowledgeBase: cfg.conciergeKnowledgeBase,
      conciergeLinguaDefault: cfg.conciergeLinguaDefault,
      conciergeAutoEscalation: cfg.conciergeAutoEscalation,
      conciergeOrariAttiviDa: cfg.conciergeOrariAttiviDa,
      conciergeOrariAttiviA: cfg.conciergeOrariAttiviA,
      conciergeMessaggioFuoriOrario: cfg.conciergeMessaggioFuoriOrario,
      whatsappNumeroId: cfg.whatsappNumeroId,
      whatsappAccessToken: revealSecret(cfg.whatsappAccessToken),
      whatsappVerifyToken: cfg.whatsappVerifyToken,
    };
  }
  // Fallback legacy Host — solo per i campi che esistono su Host.
  // I nuovi campi (temperatura, maxToken, knowledgeBase, lingua default, orari attivi,
  // auto-escalation, messaggio fuori orario) NON sono su Host — ritornano null
  // finché l'host non salva la config (upsert su HostConciergeConfig).
  const host = await prisma.host.findUnique({
    where: { id: hostId },
    select: {
      conciergeAttivo: true, conciergeProvider: true, conciergeApiKey: true,
      conciergeModel: true, conciergeBaseUrl: true, conciergeSystemPrompt: true,
      conciergeGdprAcceptedAt: true,
      whatsappNumeroId: true, whatsappAccessToken: true, whatsappVerifyToken: true,
    },
  });
  if (!host) return null;
  return {
    ...host,
    conciergeApiKey: revealSecret(host.conciergeApiKey),
    whatsappAccessToken: revealSecret(host.whatsappAccessToken),
    conciergeTemperatura: null,
    conciergeMaxToken: null,
    conciergeKnowledgeBase: null,
    conciergeLinguaDefault: null,
    conciergeAutoEscalation: null,
    conciergeOrariAttiviDa: null,
    conciergeOrariAttiviA: null,
    conciergeMessaggioFuoriOrario: null,
  };
}

export type ConciergeConfigPatch = Partial<Omit<ConciergeConfig, 'conciergeApiKey' | 'whatsappAccessToken'>> & {
  conciergeApiKey?: string | null;
  whatsappAccessToken?: string | null;
};

export async function setConciergeConfig(hostId: string, patch: ConciergeConfigPatch): Promise<void> {
  const existing = await prisma.hostConciergeConfig.findUnique({ where: { hostId } });
  const data: Record<string, unknown> = { ...patch };
  if (patch.conciergeApiKey !== undefined) {
    data.conciergeApiKey = applySecretUpdate(patch.conciergeApiKey, existing?.conciergeApiKey ?? null);
  }
  if (patch.whatsappAccessToken !== undefined) {
    data.whatsappAccessToken = applySecretUpdate(patch.whatsappAccessToken, existing?.whatsappAccessToken ?? null);
  }
  await prisma.hostConciergeConfig.upsert({
    where: { hostId },
    update: data,
    create: { hostId, ...data },
  });
  // Dual-write verso Host legacy — ma solo per i campi che esistono su Host.
  // I nuovi campi (tuning AI + comportamento) vivono SOLO su HostConciergeConfig.
  const hostExisting = await prisma.host.findUnique({
    where: { id: hostId }, select: { conciergeApiKey: true, whatsappAccessToken: true },
  });
  const hostLegacyFields = new Set([
    'conciergeAttivo', 'conciergeProvider', 'conciergeApiKey', 'conciergeModel',
    'conciergeBaseUrl', 'conciergeSystemPrompt', 'conciergeGdprAcceptedAt',
    'whatsappNumeroId', 'whatsappAccessToken', 'whatsappVerifyToken',
  ]);
  const hostData: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (hostLegacyFields.has(k)) hostData[k] = v;
  }
  if (patch.conciergeApiKey !== undefined) {
    hostData.conciergeApiKey = applySecretUpdate(patch.conciergeApiKey, hostExisting?.conciergeApiKey ?? null);
  }
  if (patch.whatsappAccessToken !== undefined) {
    hostData.whatsappAccessToken = applySecretUpdate(patch.whatsappAccessToken, hostExisting?.whatsappAccessToken ?? null);
  }
  if (Object.keys(hostData).length > 0) {
    await prisma.host.update({ where: { id: hostId }, data: hostData });
  }
}

// ─── Wi-Fi ───────────────────────────────────────────────────────────────────

export type WifiConfig = {
  wifiAuthPms: boolean;
  wifiAuthCode: boolean;
  wifiAuthComplimentary: boolean;
  wifiComplimentaryMins: number;
  wifiAuthUserForm: boolean;
  wifiAuthEmailOnly: boolean;
  wifiAuthSocial: boolean;
  wifiRedirectUrl: string | null;
  wifiWelcomeMessage: string | null;
};

export async function getWifiConfig(hostId: string): Promise<WifiConfig | null> {
  const cfg = await prisma.hostWifiConfig.findUnique({ where: { hostId } });
  if (cfg) return cfg;
  const host = await prisma.host.findUnique({
    where: { id: hostId },
    select: {
      wifiAuthPms: true, wifiAuthCode: true, wifiAuthComplimentary: true,
      wifiComplimentaryMins: true, wifiAuthUserForm: true,
      wifiAuthEmailOnly: true, wifiAuthSocial: true,
      wifiRedirectUrl: true, wifiWelcomeMessage: true,
    },
  });
  return host;
}

export async function setWifiConfig(hostId: string, patch: Partial<WifiConfig>): Promise<void> {
  await prisma.hostWifiConfig.upsert({
    where: { hostId },
    update: patch,
    create: { hostId, ...patch },
  });
  await prisma.host.update({ where: { id: hostId }, data: patch });
}

// ─── Billing Info ────────────────────────────────────────────────────────────

export type BillingInfo = {
  fattNomeAzienda: string | null;
  fattPartitaIva: string | null;
  fattIndirizzo: string | null;
  fattCitta: string | null;
  fattCap: string | null;
  fattProvincia: string | null;
  fattPaese: string | null;
  fattEmail: string | null;
  fattPec: string | null;
  fattCodiceSDI: string | null;
  regimeFiscale: string | null;
  sdiProvider: string | null;
  sdiApiKey: string | null; // decrypted
  sdiUsername: string | null;
  sdiCompanyId: string | null;
};

export async function getBillingInfo(hostId: string): Promise<BillingInfo | null> {
  const info = await prisma.hostBillingInfo.findUnique({ where: { hostId } });
  if (info) {
    return { ...info, sdiApiKey: revealSecret(info.sdiApiKey) };
  }
  const host = await prisma.host.findUnique({
    where: { id: hostId },
    select: {
      fattNomeAzienda: true, fattPartitaIva: true, fattIndirizzo: true, fattCitta: true,
      fattCap: true, fattProvincia: true, fattPaese: true, fattEmail: true, fattPec: true,
      fattCodiceSDI: true, regimeFiscale: true,
      sdiProvider: true, sdiApiKey: true, sdiUsername: true, sdiCompanyId: true,
    },
  });
  if (!host) return null;
  return { ...host, sdiApiKey: revealSecret(host.sdiApiKey) };
}

export type BillingInfoPatch = Partial<Omit<BillingInfo, 'sdiApiKey'>> & {
  sdiApiKey?: string | null;
};

export async function setBillingInfo(hostId: string, patch: BillingInfoPatch): Promise<void> {
  const existing = await prisma.hostBillingInfo.findUnique({ where: { hostId } });
  const data: Record<string, unknown> = { ...patch };
  if (patch.sdiApiKey !== undefined) {
    data.sdiApiKey = applySecretUpdate(patch.sdiApiKey, existing?.sdiApiKey ?? null);
  }
  await prisma.hostBillingInfo.upsert({
    where: { hostId },
    update: data,
    create: { hostId, ...data },
  });
  const hostExisting = await prisma.host.findUnique({ where: { id: hostId }, select: { sdiApiKey: true } });
  const hostData: Record<string, unknown> = { ...patch };
  if (patch.sdiApiKey !== undefined) {
    hostData.sdiApiKey = applySecretUpdate(patch.sdiApiKey, hostExisting?.sdiApiKey ?? null);
  }
  await prisma.host.update({ where: { id: hostId }, data: hostData });
}

// ─── WhatsApp ────────────────────────────────────────────────────────────────
// HostWhatsAppConfig estrae i 4 campi WhatsApp da HostConciergeConfig come
// modello satellite dedicato (Fase 1 god object split, batch 2 — 2026-05-04).
// I campi `whatsapp*` su HostConciergeConfig restano per dual-write durante
// la migrazione. Read-through: prefer HostWhatsAppConfig → fallback Concierge.

export type WhatsAppConfig = {
  accessToken: string | null;   // decrypted on read
  phoneNumberId: string | null;
  verifyToken: string | null;
  webhookSecret: string | null; // decrypted on read
  configurato: boolean;
};

export async function getWhatsAppConfig(hostId: string): Promise<WhatsAppConfig | null> {
  const cfg = await prisma.hostWhatsAppConfig.findUnique({ where: { hostId } });
  if (cfg) {
    return {
      accessToken: revealSecret(cfg.accessToken),
      phoneNumberId: cfg.phoneNumberId,
      verifyToken: cfg.verifyToken,
      webhookSecret: revealSecret(cfg.webhookSecret),
      configurato: cfg.configurato,
    };
  }
  // Fallback legacy: campi WhatsApp dentro HostConciergeConfig
  const concierge = await prisma.hostConciergeConfig.findUnique({
    where: { hostId },
    select: { whatsappAccessToken: true, whatsappNumeroId: true, whatsappVerifyToken: true },
  });
  if (!concierge) return null;
  return {
    accessToken: revealSecret(concierge.whatsappAccessToken),
    phoneNumberId: concierge.whatsappNumeroId,
    verifyToken: concierge.whatsappVerifyToken,
    webhookSecret: null, // legacy non aveva webhookSecret separato
    configurato: !!(concierge.whatsappAccessToken && concierge.whatsappNumeroId),
  };
}

export type WhatsAppConfigPatch = Partial<Omit<WhatsAppConfig, 'accessToken' | 'webhookSecret'>> & {
  accessToken?: string | null | undefined;
  webhookSecret?: string | null | undefined;
};

export async function setWhatsAppConfig(hostId: string, patch: WhatsAppConfigPatch): Promise<void> {
  const existing = await prisma.hostWhatsAppConfig.findUnique({ where: { hostId } });
  const data: Record<string, unknown> = { ...patch };
  if (patch.accessToken !== undefined) {
    data.accessToken = applySecretUpdate(patch.accessToken, existing?.accessToken ?? null);
  }
  if (patch.webhookSecret !== undefined) {
    data.webhookSecret = applySecretUpdate(patch.webhookSecret, existing?.webhookSecret ?? null);
  }
  await prisma.hostWhatsAppConfig.upsert({
    where: { hostId },
    update: data,
    create: { hostId, ...data },
  });
  // Dual-write su HostConciergeConfig (campi legacy)
  const conciergeExisting = await prisma.hostConciergeConfig.findUnique({
    where: { hostId },
    select: { whatsappAccessToken: true },
  });
  const conciergeData: Record<string, unknown> = {};
  if (patch.accessToken !== undefined) {
    conciergeData.whatsappAccessToken = applySecretUpdate(
      patch.accessToken,
      conciergeExisting?.whatsappAccessToken ?? null,
    );
  }
  if (patch.phoneNumberId !== undefined) conciergeData.whatsappNumeroId = patch.phoneNumberId;
  if (patch.verifyToken !== undefined) conciergeData.whatsappVerifyToken = patch.verifyToken;
  if (Object.keys(conciergeData).length > 0) {
    await prisma.hostConciergeConfig.upsert({
      where: { hostId },
      update: conciergeData,
      create: { hostId, ...conciergeData },
    });
  }
}

// ─── Branding ────────────────────────────────────────────────────────────────
// HostBrandingConfig centralizza branding/testi/regCard*. I campi regCard*
// vivono storicamente su Host; durante la migrazione si fa dual-write.

export type BrandingConfig = {
  logo: string | null;
  favicon: string | null;
  colorePrimario: string | null;
  coloreSecondario: string | null;
  coloreSfondo: string | null;
  coloreTesto: string | null;
  fontFamily: string | null;
  borderRadius: string | null;
  fotoHero: string | null;
  messaggioBenvenuto: string | null;
  messaggioChiusura: string | null;
  regCardTerminiHtml: string | null;
  regCardPrivacyHtml: string | null;
  regCardSpaTerminiHtml: string | null;
  regCardCampiExtra: unknown; // JSON
};

export async function getBrandingConfig(hostId: string): Promise<BrandingConfig | null> {
  const cfg = await prisma.hostBrandingConfig.findUnique({ where: { hostId } });
  if (cfg) {
    return {
      logo: cfg.logo,
      favicon: cfg.favicon,
      colorePrimario: cfg.colorePrimario,
      coloreSecondario: cfg.coloreSecondario,
      coloreSfondo: cfg.coloreSfondo,
      coloreTesto: cfg.coloreTesto,
      fontFamily: cfg.fontFamily,
      borderRadius: cfg.borderRadius,
      fotoHero: cfg.fotoHero,
      messaggioBenvenuto: cfg.messaggioBenvenuto,
      messaggioChiusura: cfg.messaggioChiusura,
      regCardTerminiHtml: cfg.regCardTerminiHtml,
      regCardPrivacyHtml: cfg.regCardPrivacyHtml,
      regCardSpaTerminiHtml: cfg.regCardSpaTerminiHtml,
      regCardCampiExtra: cfg.regCardCampiExtra,
    };
  }
  // Fallback legacy: i campi regCard* + logo vivono su Host
  const host = await prisma.host.findUnique({
    where: { id: hostId },
    select: {
      logo: true, regCardTerminiHtml: true, regCardPrivacyHtml: true,
      regCardSpaTerminiHtml: true, regCardCampiExtra: true,
    },
  });
  if (!host) return null;
  return {
    logo: host.logo,
    favicon: null,
    colorePrimario: null,
    coloreSecondario: null,
    coloreSfondo: null,
    coloreTesto: null,
    fontFamily: null,
    borderRadius: null,
    fotoHero: null,
    messaggioBenvenuto: null,
    messaggioChiusura: null,
    regCardTerminiHtml: host.regCardTerminiHtml,
    regCardPrivacyHtml: host.regCardPrivacyHtml,
    regCardSpaTerminiHtml: host.regCardSpaTerminiHtml,
    regCardCampiExtra: host.regCardCampiExtra,
  };
}

export type BrandingConfigPatch = Partial<BrandingConfig>;

export async function setBrandingConfig(hostId: string, patch: BrandingConfigPatch): Promise<void> {
  await prisma.hostBrandingConfig.upsert({
    where: { hostId },
    update: patch as Record<string, unknown>,
    create: { hostId, ...(patch as Record<string, unknown>) },
  });
  // Dual-write su Host per i campi che lì esistono ancora
  const hostData: Record<string, unknown> = {};
  if (patch.logo !== undefined) hostData.logo = patch.logo;
  if (patch.regCardTerminiHtml !== undefined) hostData.regCardTerminiHtml = patch.regCardTerminiHtml;
  if (patch.regCardPrivacyHtml !== undefined) hostData.regCardPrivacyHtml = patch.regCardPrivacyHtml;
  if (patch.regCardSpaTerminiHtml !== undefined) hostData.regCardSpaTerminiHtml = patch.regCardSpaTerminiHtml;
  if (patch.regCardCampiExtra !== undefined) hostData.regCardCampiExtra = patch.regCardCampiExtra;
  if (Object.keys(hostData).length > 0) {
    await prisma.host.update({ where: { id: hostId }, data: hostData });
  }
}

// ─── Stripe SaaS billing ─────────────────────────────────────────────────────
// Helper per leggere stripeCustomerId / stripeSubscriptionId su Host
// (campi non spostati in tabella satellite — vivono direttamente su Host
// per essere @unique a livello DB con index).

export async function getStripeIds(hostId: string): Promise<{
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
} | null> {
  const host = await prisma.host.findUnique({
    where: { id: hostId },
    select: { stripeCustomerId: true, stripeSubscriptionId: true },
  });
  if (!host) return null;
  return host;
}
