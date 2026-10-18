import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, ADMIN_GATE_COOKIE } from '@/lib/auth/admin-auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const response = NextResponse.json({ success: true, message: 'Sessão encerrada com sucesso.' });

  const isHttps =
    req.headers.get('x-forwarded-proto') === 'https' ||
    req.url.startsWith('https://');

  // Invalidação completa dos cookies administrativos com flags de segurança idênticas
  response.cookies.set(ADMIN_COOKIE_NAME, '', {
    path: '/',
    httpOnly: true,
    secure: isHttps,
    sameSite: 'lax',
    expires: new Date(0),
    maxAge: 0,
  });

  response.cookies.set(ADMIN_GATE_COOKIE, '', {
    path: '/',
    httpOnly: true,
    secure: isHttps,
    sameSite: 'lax',
    expires: new Date(0),
    maxAge: 0,
  });

  return response;
}
