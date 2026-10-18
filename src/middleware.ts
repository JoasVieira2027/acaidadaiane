import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  ADMIN_COOKIE_NAME,
  ADMIN_GATE_COOKIE,
  getAdminAccessKey,
  isValidSessionTokenAsync,
  timingSafeEqualStr,
} from '@/lib/auth/admin-auth';

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Interceptar apenas rotas /admin e subrotas
  if (pathname.startsWith('/admin')) {
    const sessionCookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
    const gateCookie = request.cookies.get(ADMIN_GATE_COOKIE)?.value;
    const isAuthenticated = await isValidSessionTokenAsync(sessionCookie);

    // Verificar se uma chave secreta foi fornecida na URL (?key=... ou ?acesso=... ou ?secret=...)
    const providedKey =
      searchParams.get('key') ||
      searchParams.get('acesso') ||
      searchParams.get('secret') ||
      '';

    let hasValidKey = false;
    try {
      const secretKey = getAdminAccessKey();
      hasValidKey = Boolean(providedKey && timingSafeEqualStr(providedKey.trim(), secretKey.trim()));
    } catch {
      hasValidKey = false;
    }

    // 1. Se forneceu a chave secreta válida na URL
    if (hasValidKey) {
      const redirectUrl = new URL(
        isAuthenticated ? '/admin' : '/admin/login',
        request.url
      );
      // Remove parâmetros sensíveis da URL para não ficarem no histórico do navegador
      redirectUrl.search = '';

      const response = NextResponse.redirect(redirectUrl);
      // Libera o portão administrativo temporariamente por 1 hora
      response.cookies.set(ADMIN_GATE_COOKIE, 'authorized', {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 3600, // 1 hora
      });
      return response;
    }

    // 2. Se já estiver autenticado com sessão válida
    if (isAuthenticated) {
      // Se já está logado e tentar abrir o login, manda pro dashboard
      if (pathname === '/admin/login') {
        return NextResponse.redirect(new URL('/admin', request.url));
      }
      return NextResponse.next();
    }

    // 3. Usuário NÃO autenticado tentando acessar a página de login
    if (pathname === '/admin/login') {
      // Só permite abrir a tela de login se tiver a permissão do portão (gateCookie)
      if (gateCookie === 'authorized') {
        return NextResponse.next();
      }
      // Se não tem permissão nem chave secreta, mascara a página e joga para o cardápio
      return NextResponse.redirect(new URL('/', request.url));
    }

    // 4. Usuário NÃO autenticado tentando acessar qualquer outra rota /admin
    // Se tiver o gateCookie, encaminha para o login; senão, esconde e joga para o cardápio
    if (gateCookie === 'authorized') {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    // Para qualquer cliente comum, a rota /admin simplesmente "não existe"
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
};
