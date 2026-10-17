import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  ADMIN_COOKIE_NAME,
  ADMIN_GATE_COOKIE,
  generateSessionToken,
  getAdminMasterPassword,
  getAdminAccessKey,
} from '@/lib/auth/admin-auth';
import { isSupabaseConfigured } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, accessKey } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'E-mail e senha são obrigatórios.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    // Se uma chave de acesso opcional foi enviada no formulário de login, pode validar também
    const configuredKey = getAdminAccessKey();
    if (accessKey && accessKey.trim() !== configuredKey.trim()) {
      return NextResponse.json(
        { success: false, message: 'Chave de segurança administrativa incorreta.' },
        { status: 401 }
      );
    }

    let authenticated = false;
    let authError = '';

    // 1. Tenta autenticação via Supabase Auth se configurado
    if (isSupabaseConfigured()) {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPassword,
        });

        if (error || !data?.user) {
          authError = error?.message || 'Credenciais inválidas no Supabase Auth.';
        } else {
          authenticated = true;
        }
      } catch (err: any) {
        authError = 'Falha ao conectar com serviço de autenticação.';
      }
    } else {
      // 2. Fallback de contingência local quando Supabase não estiver configurado
      const masterPassword = getAdminMasterPassword();
      if (cleanPassword === masterPassword || cleanPassword === configuredKey) {
        authenticated = true;
      } else {
        authError = 'Senha mestre administrativa incorreta.';
      }
    }

    if (!authenticated) {
      return NextResponse.json(
        {
          success: false,
          message: authError || 'E-mail ou senha administrativa incorretos.',
        },
        { status: 401 }
      );
    }

    // 3. Sucesso: gerar token e gravar cookies de sessão
    const sessionToken = generateSessionToken(cleanEmail);

    const response = NextResponse.json({
      success: true,
      email: cleanEmail,
      message: 'Autenticado com sucesso.',
    });

    // Cookie de sessão principal (24 horas)
    response.cookies.set(ADMIN_COOKIE_NAME, sessionToken, {
      path: '/',
      httpOnly: false, // Acessível pelo Next.js middleware e pelo client
      sameSite: 'lax',
      maxAge: 86400, // 24 horas
    });

    // Cookie de liberação do portão
    response.cookies.set(ADMIN_GATE_COOKIE, 'authorized', {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 86400,
    });

    return response;
  } catch (error: any) {
    console.error('Erro no login administrativo:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno ao validar credenciais.' },
      { status: 500 }
    );
  }
}
