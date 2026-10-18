// Configuração e validação criptográfica de segurança para acesso administrativo

export const ADMIN_COOKIE_NAME = 'acai_admin_session';
export const ADMIN_GATE_COOKIE = 'acai_admin_gate';

// Prefixo de versão do token HMAC seguro
const TOKEN_PREFIX = 'admv2.';

/**
 * Comparação em tempo constante para mitigar ataques de timing.
 */
export function timingSafeEqualStr(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Obtém a chave secreta de acesso ao admin.
 * NUNCA tem fallback hardcoded — falha explicitamente se não configurada.
 */
export function getAdminAccessKey(): string {
  const key = process.env.ADMIN_ACCESS_KEY;
  if (!key || key.trim().length === 0) {
    throw new Error('[Auth] ADMIN_ACCESS_KEY não está configurada. Defina esta variável de ambiente.');
  }
  return key.trim();
}

/**
 * Obtém a senha mestre de contingência (usada apenas quando Supabase não está configurado).
 * Não tem fallback hardcoded.
 */
export function getAdminMasterPassword(): string {
  const pw = process.env.ADMIN_MASTER_PASSWORD;
  if (!pw || pw.trim().length === 0) {
    throw new Error('[Auth] ADMIN_MASTER_PASSWORD não está configurada. Defina esta variável de ambiente.');
  }
  return pw.trim();
}

/**
 * Deriva uma CryptoKey HMAC-SHA256 a partir do segredo do ambiente.
 * Compatível com Edge Runtime e Node.js via Web Crypto API.
 */
async function deriveHmacKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

/**
 * Gera uma assinatura HMAC-SHA256 em base64url via Web Crypto API.
 */
async function hmacSignWebCrypto(secret: string, message: string): Promise<string> {
  const key = await deriveHmacKey(secret);
  const enc = new TextEncoder();
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Buffer.from(sig).toString('base64url');
}

/**
 * Cria um token de sessão assinado com HMAC-SHA256.
 * Formato: admv2.<timestamp_base36>.<payload_base64url>.<signature_base64url>
 */
export async function generateSessionToken(email: string): Promise<string> {
  const secret = getAdminAccessKey();
  const timestamp = Date.now().toString(36);
  const cleanEmail = (email || 'admin').trim().toLowerCase();
  const payloadB64 = Buffer.from(cleanEmail).toString('base64url');
  const message = `${timestamp}.${cleanEmail}`;
  const sig = await hmacSignWebCrypto(secret, message);
  return `${TOKEN_PREFIX}${timestamp}.${payloadB64}.${sig}`;
}

/**
 * Validação assíncrona com HMAC-SHA256 completo via Web Crypto API.
 * Recomendada para Middleware e Edge Runtime.
 */
export async function isValidSessionTokenAsync(token: string | null | undefined): Promise<boolean> {
  if (!token || typeof token !== 'string') return false;
  // Rejeita explicitamente tokens legados ('1', 'adm_...') e sem prefixo seguro
  if (token === '1' || token.startsWith('adm_') || !token.startsWith(TOKEN_PREFIX)) {
    return false;
  }

  const parts = token.slice(TOKEN_PREFIX.length).split('.');
  if (parts.length !== 3) return false;

  const [timestamp, payloadB64, providedSig] = parts;
  if (!timestamp || !payloadB64 || !providedSig) return false;

  // Validação temporal: expiração em 24h e tolerância contra relógio futuro (> 5 min)
  const tsMs = parseInt(timestamp, 36);
  if (isNaN(tsMs)) return false;
  const age = Date.now() - tsMs;
  if (age < -5 * 60 * 1000 || age > 24 * 60 * 60 * 1000) return false;

  try {
    const secret = getAdminAccessKey();
    const payload = Buffer.from(payloadB64, 'base64url').toString('utf-8');
    const message = `${timestamp}.${payload}`;
    const expectedSig = await hmacSignWebCrypto(secret, message);
    return timingSafeEqualStr(providedSig, expectedSig);
  } catch {
    return false;
  }
}

/**
 * Validação síncrona com HMAC-SHA256 para Server Components e API Route Handlers (Node.js).
 * REJEITA tokens legados, forjados, adulterados ou expirados.
 */
export function isValidSessionToken(token: string | null | undefined): boolean {
  if (!token || typeof token !== 'string') return false;
  if (token === '1' || token.startsWith('adm_') || !token.startsWith(TOKEN_PREFIX)) {
    return false;
  }

  const parts = token.slice(TOKEN_PREFIX.length).split('.');
  if (parts.length !== 3) return false;

  const [timestamp, payloadB64, providedSig] = parts;
  if (!timestamp || !payloadB64 || !providedSig) return false;

  const tsMs = parseInt(timestamp, 36);
  if (isNaN(tsMs)) return false;
  const age = Date.now() - tsMs;
  if (age < -5 * 60 * 1000 || age > 24 * 60 * 60 * 1000) return false;

  try {
    const secret = getAdminAccessKey();
    const payload = Buffer.from(payloadB64, 'base64url').toString('utf-8');
    const message = `${timestamp}.${payload}`;

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodeCrypto = require('crypto');
    const expectedSig = nodeCrypto.createHmac('sha256', secret).update(message).digest('base64url');
    return timingSafeEqualStr(providedSig, expectedSig);
  } catch {
    return false;
  }
}
