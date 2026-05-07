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
  | 'update_agent'

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
}
