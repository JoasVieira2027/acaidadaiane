import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/require-admin';

export const dynamic = 'force-dynamic';

// POST /api/products/upload-image (REQUER AUTENTICACAO ADMIN)
export async function POST(req: NextRequest) {
  const authError = requireAdmin(req);
  if (authError) return authError;

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, message: 'Nenhum arquivo enviado.' }, { status: 400 });
    }

    // Validar tipo de arquivo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: 'Formato inválido. Use JPG, PNG ou WEBP.' },
        { status: 400 }
      );
    }

    // Validar tamanho (max 3MB)
    const maxSizeBytes = 3 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return NextResponse.json(
        { success: false, message: 'Arquivo muito grande. Máximo permitido: 3MB.' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json(
        { success: false, message: 'Supabase não configurado. Configure as variáveis de ambiente.' },
        { status: 503 }
      );
    }

    // Gerar nome único para o arquivo
    const ext = file.type === 'image/webp' ? 'webp' : file.type === 'image/png' ? 'png' : 'jpg';
    const fileName = `produto-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const filePath = `products/${fileName}`;

    // Converter para ArrayBuffer e enviar ao Supabase Storage
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, uint8Array, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return NextResponse.json(
        { success: false, message: `Erro no upload: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Obter URL pública
    const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(filePath);

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      imageUrl: urlData.publicUrl,
      path: filePath,
    });
  } catch (error: any) {
    console.error('Upload image error:', error);
    return NextResponse.json({ success: false, message: 'Erro interno no upload.' }, { status: 500 });
  }
}

// DELETE /api/products/upload-image?path=products/xxx.jpg (REQUER AUTENTICACAO ADMIN)
export async function DELETE(req: NextRequest) {
  const authError = requireAdmin(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const path = searchParams.get('path');

    if (!path) {
      return NextResponse.json({ success: false, message: 'Path é obrigatório.' }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json({ success: true }); // silently ignore if not configured
    }

    const { error } = await supabase.storage.from('product-images').remove([path]);
    if (error) {
      console.error('Delete image error:', error);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Erro ao remover imagem.' }, { status: 500 });
  }
}
