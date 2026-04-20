import crypto from 'crypto';

const ALGO = 'aes-256-gcm';
const PREFIX = 'enc:v1:';

function getKey(): Buffer {
  const raw = process.env.APP_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      'APP_ENCRYPTION_KEY env var missing. Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"',
    );
  }
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new Error(`APP_ENCRYPTION_KEY must decode to 32 bytes, got ${key.length}`);
  }
  return key;
}

export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(PREFIX);
}

export function encrypt(plaintext: string): string {
  if (!plaintext) return plaintext;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + [iv.toString('base64'), tag.toString('base64'), ct.toString('base64')].join(':');
}

export function decrypt(stored: string): string {
  if (!isEncrypted(stored)) return stored;
  const [, , ivB64, tagB64, ctB64] = stored.split(':');
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const ct = Buffer.from(ctB64, 'base64');
  const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString('utf8');
}

export function maybeDecrypt(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return decrypt(value);
  } catch {
    return value;
  }
}

export function maybeEncrypt(value: string | null | undefined): string | null {
  if (!value) return null;
  return isEncrypted(value) ? value : encrypt(value);
}
