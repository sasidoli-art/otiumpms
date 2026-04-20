import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const PLAIN_PREFIX = 'plain:';
const LEGACY_V1_PREFIX = 'enc:v1:'; // compatibilità commit c2cc6f3

export class EncryptionError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'EncryptionError';
  }
}

function getKey(): Buffer | null {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) return null;
  const key = Buffer.from(raw, 'hex');
  if (key.length !== 32) {
    throw new EncryptionError(
      `ENCRYPTION_KEY must decode to 32 bytes (64 hex chars), got ${key.length} bytes`,
    );
  }
  return key;
}

/**
 * Valida la presenza e correttezza della ENCRYPTION_KEY all'avvio.
 * Da chiamare in instrumentation.ts. In produzione throw se manca.
 */
export function validateEncryptionKey(): void {
  const raw = process.env.ENCRYPTION_KEY;
  const isProd = process.env.NODE_ENV === 'production';
  if (!raw) {
    if (isProd) {
      throw new EncryptionError(
        'ENCRYPTION_KEY env var is required in production. Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
      );
    }
    console.warn(
      '[crypto] ENCRYPTION_KEY missing — secrets will be stored with "plain:" prefix (dev mode only)',
    );
    return;
  }
  const key = Buffer.from(raw, 'hex');
  if (key.length !== 32) {
    throw new EncryptionError(
      `ENCRYPTION_KEY must be 64 hex chars (32 bytes), got ${key.length} bytes`,
    );
  }
}

export function encrypt(plaintext: string): string {
  if (!plaintext) return plaintext;
  const key = getKey();
  if (!key) {
    return PLAIN_PREFIX + plaintext;
  }
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [iv.toString('base64'), encrypted.toString('base64'), tag.toString('base64')].join(':');
  } catch (e) {
    throw new EncryptionError('Failed to encrypt value', e);
  }
}

export function decrypt(ciphertext: string): string {
  if (!ciphertext) return ciphertext;
  if (ciphertext.startsWith(PLAIN_PREFIX)) {
    return ciphertext.slice(PLAIN_PREFIX.length);
  }
  // Legacy format from earlier commit c2cc6f3: enc:v1:iv:tag:ct (base64 key)
  if (ciphertext.startsWith(LEGACY_V1_PREFIX)) {
    return decryptLegacyV1(ciphertext);
  }
  const key = getKey();
  if (!key) {
    throw new EncryptionError(
      'Cannot decrypt: ENCRYPTION_KEY not set and value is not plain-prefixed',
    );
  }
  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    throw new EncryptionError(`Invalid ciphertext format (expected iv:encrypted:tag)`);
  }
  const [ivB64, encB64, tagB64] = parts;
  try {
    const iv = Buffer.from(ivB64, 'base64');
    const encrypted = Buffer.from(encB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (e) {
    throw new EncryptionError('Failed to decrypt value (key mismatch or corrupted data)', e);
  }
}

function decryptLegacyV1(stored: string): string {
  // Legacy: enc:v1:<iv_b64>:<tag_b64>:<ct_b64>, key was APP_ENCRYPTION_KEY (base64)
  const legacyKeyB64 = process.env.APP_ENCRYPTION_KEY;
  const keyRaw = legacyKeyB64 ? Buffer.from(legacyKeyB64, 'base64') : getKey();
  if (!keyRaw || keyRaw.length !== 32) {
    throw new EncryptionError(
      'Cannot decrypt legacy enc:v1 value: APP_ENCRYPTION_KEY (base64, 32 bytes) missing',
    );
  }
  const parts = stored.split(':');
  if (parts.length !== 5) {
    throw new EncryptionError('Invalid legacy enc:v1 format');
  }
  const [, , ivB64, tagB64, ctB64] = parts;
  try {
    const iv = Buffer.from(ivB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');
    const ct = Buffer.from(ctB64, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', keyRaw, iv);
    decipher.setAuthTag(tag);
    const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
    return pt.toString('utf8');
  } catch (e) {
    throw new EncryptionError('Failed to decrypt legacy enc:v1 value', e);
  }
}

export function isEncrypted(value: string | null | undefined): boolean {
  if (!value) return false;
  if (value.startsWith(PLAIN_PREFIX)) return true;
  if (value.startsWith(LEGACY_V1_PREFIX)) return true;
  // New format: iv:encrypted:tag (3 base64 parts)
  const parts = value.split(':');
  return parts.length === 3 && parts.every((p) => /^[A-Za-z0-9+/=]+$/.test(p));
}

export function encryptNullable(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value === '') return null;
  return encrypt(value);
}

export function decryptNullable(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value === '') return null;
  try {
    return decrypt(value);
  } catch {
    // Se non riusciamo a decifrare, assumiamo sia plaintext legacy (pre-migrazione)
    return value;
  }
}
