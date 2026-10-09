import { NextRequest, NextResponse } from 'next/server';
import { POST as webhookPost, GET as webhookGet } from '@/app/api/webhook/route';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  return webhookPost(req);
}

export async function GET(req: NextRequest) {
  return webhookGet();
}
