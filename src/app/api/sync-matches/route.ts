import { NextResponse } from 'next/server';
import { syncMatchesHelper } from '@/lib/sync';

export async function GET() {
  try {
    const syncedCount = await syncMatchesHelper();

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${syncedCount} matches`,
      source: 'worldcup26.ir (with API-Football fallback)'
    });
  } catch (error: unknown) {
    console.error('Sync matches handler error:', error);
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, message: errMsg }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
