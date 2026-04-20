/**
 * Wi-Fi bounded context — costanti di dominio.
 */

export const AUTH_METHODS = [
  'pms', // Login con Cognome + Numero Camera (da prenotazione)
  'code', // Login con codice accesso (WifiAccessCode)
  'complimentary', // Accesso gratuito a tempo (senza autenticazione)
  'userForm', // Registrazione nome + email
  'social', // Social login (Google/Facebook)
] as const;

export type WifiAuthMethod = (typeof AUTH_METHODS)[number];

export const DEFAULT_COMPLIMENTARY_MINS = 120; // 2h di default
