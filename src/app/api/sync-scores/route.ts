import { NextResponse, type NextRequest } from 'next/server';
import { syncScoresHelper } from '@/lib/sync';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const secretParam = searchParams.get('secret');
  const authHeader = request.headers.get('authorization');
  
  // Hỗ trợ cả CRON_SECRET của Vercel hoặc SYNC_SECRET tự định nghĩa
  const allowedSecret = process.env.CRON_SECRET || process.env.SYNC_SECRET;

  if (allowedSecret) {
    const isAuthorizedHeader = authHeader === `Bearer ${allowedSecret}`;
    const isAuthorizedQuery = secretParam === allowedSecret;
    
    if (!isAuthorizedHeader && !isAuthorizedQuery) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const result = await syncScoresHelper();
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Sync scores handler error:', error);
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, message: errMsg }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
