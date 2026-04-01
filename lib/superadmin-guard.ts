/**
 * IP whitelist guard for SuperAdmin routes.
 *
 * If the env var SUPERADMIN_ALLOWED_IPS is set (comma-separated list),
 * only those IPs are permitted. If unset, all IPs are allowed (dev mode).
 */

export function isSuperAdminAllowed(ip: string): boolean {
  const allowedRaw = process.env.SUPERADMIN_ALLOWED_IPS
  if (!allowedRaw || allowedRaw.trim() === '') {
    // Env var not configured — allow all (development)
    return true
  }

  const allowedIps = allowedRaw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  if (allowedIps.length === 0) {
    return true
  }

  return allowedIps.includes(ip)
}
