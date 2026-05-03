/**
 * Tipi condivisi del modulo Wi-Fi.
 * Usati sia dalle API operatore sia dalle API agent-facing.
 */

// ─── Config splash (DB source of truth) ──────────────────────────────────────

export interface WifiSplashConfig {
  titolo?: string
  messaggio?: string
  testoBottone?: string
  linkRedirect?: string
  logoUrl?: string
  slideshowUrls?: string[]
  // Colori ereditati da Struttura.colorePrimario/coloreSecondario se vuoti
  colorePrimario?: string
  coloreSecondario?: string
}

// ─── Azioni agent ────────────────────────────────────────────────────────────

export type WifiAgentAction =
  | 'ping'
  | 'get_status'
  | 'get_ap_list'
  | 'list_guest_users'
  | 'add_guest_user'
  | 'revoke_guest_user'
  | 'get_splash_branding'
  | 'set_splash_branding'
  | 'upload_splash_image'
  // ─── v0.3+: bandwidth, firmware, service mode ───────────────────────────────
  | 'set_qos_limit'           // Imposta tc/htb su un MAC client (rate up/down kbps)
  | 'clear_qos_limit'         // Rimuove tc/htb su un MAC client
  | 'apply_qos_plan'          // Applica un piano predefinito (FREE / PREMIUM / VIP)
  | 'list_ap_managed'         // Elenco AP gestiti via CAPWAP dal controller
  | 'reboot_ap'               // Reboot remoto di un AP specifico
  | 'upgrade_ap_firmware'     // Push firmware su un AP via cluster_upgrade
  | 'upgrade_controller_firmware' // OTA del controller stesso (rischioso)
  | 'service_mode_on'         // Apri reverse SSH tunnel (autossh) verso VPS jump
  | 'service_mode_off'        // Chiudi reverse SSH tunnel
  | 'rotate_ssh_password'     // Cambia password root + Web UI
  | 'set_ssid_password'       // Cambia password Wi-Fi staff (WPA2)
  | 'set_walled_garden'       // Aggiorna trusted_web_list (lista domini pre-auth)

export interface WifiAgentCommand {
  id: string
  action: WifiAgentAction
  params: Record<string, unknown>
  issuedAt: string
}

export interface WifiAgentCommandResult {
  id: string
  success: boolean
  output?: unknown
  error?: string
  executedAt: string
}

// ─── Payload azioni specifiche ───────────────────────────────────────────────

export interface SetSplashBrandingParams {
  titolo?: string
  messaggio?: string
  testoBottone?: string
  linkRedirect?: string
}

export interface UploadSplashImageParams {
  slot: 'logo' | 'slide1' | 'slide2' | 'slide3'
  sourceUrl: string
}

export interface AddGuestUserParams {
  username: string
  password: string
  durationMin?: number
  bandwidthKbps?: number
}

export interface RevokeGuestUserParams {
  username: string
}

// ─── Heartbeat agent ─────────────────────────────────────────────────────────

export interface WifiAgentHeartbeat {
  agentVersion: string
  firmware?: string
  uptimeSec?: number
  apCount?: number
  guestUserCount?: number
  /** v0.2: snapshot dello deadman switch (otium-check-alive.sh) */
  health?: WifiAgentHealthSnapshot | null
}

/**
 * Snapshot dello stato di salute prodotto da otium-check-alive.sh.
 * Vedi router_comfast/otium_agent/otium-check-alive.sh.
 */
export interface WifiAgentHealthSnapshot {
  /** "HEALTHY" | "DEGRADED" | "ISOLATED" | "OFFLINE" — vedi script */
  state: string
  checked_at: string
  consecutive_failures: number
  previous_state?: string
  lan_gateway_reachable?: 0 | 1
  internet_ping_ok?: number
  internet_ping_fail?: number
  backend_https_ok?: 0 | 1
  backend_host?: string
  details?: string
}

// ─── Bandwidth plans (v0.3) ──────────────────────────────────────────────────

/** Piani QoS predefiniti applicabili ai client guest. */
export type WifiBandwidthPlan = 'FREE' | 'PREMIUM' | 'VIP' | 'STAFF'

/** Limiti per piano (kbps). null = illimitato (solo per VIP/STAFF). */
export const WIFI_BANDWIDTH_PROFILES: Record<
  WifiBandwidthPlan,
  { downloadKbps: number | null; uploadKbps: number | null }
> = {
  FREE: { downloadKbps: 5000, uploadKbps: 1000 }, // 5 Mbps / 1 Mbps
  PREMIUM: { downloadKbps: 30000, uploadKbps: 10000 }, // 30 Mbps / 10 Mbps
  VIP: { downloadKbps: null, uploadKbps: null }, // illimitato
  STAFF: { downloadKbps: null, uploadKbps: null }, // illimitato
}

export interface SetQosLimitParams {
  macClient: string
  downloadKbps: number | null
  uploadKbps: number | null
}

export interface ApplyQosPlanParams {
  macClient: string
  plan: WifiBandwidthPlan
}

// ─── AP firmware (v0.3) ──────────────────────────────────────────────────────

export interface UpgradeApFirmwareParams {
  apMac: string // MAC dell'AP target
  firmwareUrl: string // URL HTTPS del firmware (Otium CDN)
  expectedSha256?: string // verifica integrity prima del flash
}

// ─── Service mode (v0.3) ─────────────────────────────────────────────────────

export interface ServiceModeOnParams {
  jumpHost: string // es. "ssh.otium.cloud"
  jumpUser: string // es. "otium-bot"
  jumpPort: number // es. 22000 (porta sul VPS che mappa a SSH router)
  jumpKeyPath?: string // path della key sul router (default /etc/otium/jump.key)
  /** TTL massimo del tunnel in secondi (default 3600 = 1h, auto-close) */
  ttlSec?: number
}
