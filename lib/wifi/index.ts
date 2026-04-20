/**
 * Wi-Fi bounded context — public API.
 *
 * Dominio: gestione device Comfast (router captive portal), command queue
 * verso gli agent, sessioni Pisanu, access codes, guest users, access logs.
 *
 * Modelli Prisma coinvolti (6):
 *   WifiDevice, WifiDeviceCommand, WifiGuestUser, WifiAccessLog,
 *   WifiAccessCode, WifiSession
 *
 * API routes: app/api/host/wifi/* + app/api/wifi/agent/* (per i router)
 * Config per-host: HostWifiConfig (vedi lib/host-config.ts)
 */

export * from './constants';
