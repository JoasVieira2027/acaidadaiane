import { NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, ADMIN_GATE_COOKIE } from '@/lib/auth/admin-auth';

export const dynamic = 'force-dynamic';

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Sessão encerrada com sucesso.' });

  // Exclui os cookies administrativos
  response.cookies.set(ADMIN_COOKIE_NAME, '', {
    path: '/',
    maxAge: 0,
  });

  response.cookies.set(ADMIN_GATE_COOKIE, '', {
    path: '/',
    maxAge: 0,
  });

  return response;
}
