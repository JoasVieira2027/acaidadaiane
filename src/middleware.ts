import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  ADMIN_COOKIE_NAME,
  isValidSessionTokenAsync,
} from '@/lib/auth/admin-auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Interceptar apenas rotas /admin e subrotas
  if (pathname.startsWith('/admin')) {
    const sessionCookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
    const isAuthenticated = await isValidSessionTokenAsync(sessionCookie);

    // 1. Se já estiver autenticado com sessão válida
    if (isAuthenticated) {
      // Se já está logado e tentar abrir o login, manda pro dashboard
      if (pathname === '/admin/login') {
        return NextResponse.redirect(new URL('/admin', request.url));
      }
      return NextResponse.next();
    }

    // 2. Se NÃO estiver autenticado tentando acessar a tela de login: permite
    if (pathname === '/admin/login') {
      return NextResponse.next();
    }

    // 3. Qualquer outra rota /admin sem sessão válida: redireciona para login administrativo
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
};
