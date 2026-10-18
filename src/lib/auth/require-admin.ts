import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, isValidSessionToken } from './admin-auth';

/**
 * Verifica se a requisição possui sessão administrativa válida.
 * Retorna null se autenticado, ou uma NextResponse 401 se não autenticado.
 * 
 * USO: const authError = requireAdmin(req); if (authError) return authError;
 */
export function requireAdmin(req: NextRequest): NextResponse | null {
  const sessionCookie = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!isValidSessionToken(sessionCookie)) {
    return NextResponse.json(
      { success: false, message: 'Acesso restrito. Autenticação administrativa necessária.' },
      { status: 401 }
    );
  }
  return null;
}
