import { NextResponse } from 'next/server';
import { syncScoresHelper } from '@/lib/sync';

export async function GET() {
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
