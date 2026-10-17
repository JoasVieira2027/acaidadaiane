// Configuração e validação de segurança para acesso administrativo

export const ADMIN_COOKIE_NAME = 'acai_admin_session';
export const ADMIN_GATE_COOKIE = 'acai_admin_gate';

// Chave padrão caso não configurada no .env
export const DEFAULT_ADMIN_KEY = 'daiane2024';

/**
 * Obtém a chave secreta de acesso ao admin configurada no ambiente
 */
export function getAdminAccessKey(): string {
  return process.env.ADMIN_ACCESS_KEY || process.env.NEXT_PUBLIC_ADMIN_ACCESS_KEY || DEFAULT_ADMIN_KEY;
}

/**
 * Obtém a senha mestre de fallback caso Supabase não esteja conectado
 */
export function getAdminMasterPassword(): string {
  return process.env.ADMIN_MASTER_PASSWORD || 'Daiane@Admin2024!';
}

/**
 * Cria um token de sessão simples e seguro baseado na chave secreta
 */
export function generateSessionToken(email: string): string {
  const secret = getAdminAccessKey();
  const timestamp = Date.now().toString(36);
  const data = `${email}:${timestamp}:${secret}`;
  
  // Hash simples determinístico para Edge Runtime sem dependências externas pesadas
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const signature = Math.abs(hash).toString(36);
  return `adm_${timestamp}_${signature}`;
}

/**
 * Valida se um token de sessão possui formato válido
 */
export function isValidSessionToken(token: string | null | undefined): boolean {
  if (!token || typeof token !== 'string') return false;
  // Aceita tokens gerados pelo sistema ou flag legado '1' durante migração
  if (token === '1') return true;
  return token.startsWith('adm_') && token.length >= 10;
}
