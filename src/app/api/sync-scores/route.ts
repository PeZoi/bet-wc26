import { NextResponse, type NextRequest } from 'next/server';
import { syncScoresHelper } from '@/lib/sync';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const secretParam = searchParams.get('secret');
  const waitParam = searchParams.get('wait') === 'true';
  const authHeader = request.headers.get('authorization');
  
  // Hỗ trợ cả CRON_SECRET của Vercel hoặc SYNC_SECRET tự định nghĩa
  const allowedSecret = process.env.CRON_SECRET || process.env.SYNC_SECRET;

  let isAuthorized = false;

  // 1. Kiểm tra bằng mã bí mật (dành cho Cron Job gọi)
  if (allowedSecret) {
    const isAuthorizedHeader = authHeader === `Bearer ${allowedSecret}`;
    const isAuthorizedQuery = secretParam === allowedSecret;
    if (isAuthorizedHeader || isAuthorizedQuery) {
      isAuthorized = true;
    }
  } else {
    // Nếu không cấu hình secret trong env, cho phép chạy tự do ở local
    isAuthorized = true;
  }

  // 2. Nếu không có mã bí mật, kiểm tra xem có phải là Admin đăng nhập click nút trên UI không
  if (!isAuthorized) {
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user && user.email) {
        const adminEmailsEnv = process.env.ADMIN_EMAILS || '';
        const adminEmails = adminEmailsEnv.split(',').map(email => email.trim().toLowerCase());
        if (adminEmails.includes(user.email.toLowerCase())) {
          isAuthorized = true;
        }
      }
    } catch (err) {
      console.error('Error checking admin session in sync route:', err);
    }
  }

  if (!isAuthorized) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  if (waitParam) {
    try {
      const result = await syncScoresHelper();
      return NextResponse.json(result);
    } catch (error: unknown) {
      console.error('Sync scores handler error:', error);
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json({ success: false, message: errMsg }, { status: 500 });
    }
  } else {
    // Chạy ngầm dưới background để trả về kết quả ngay lập tức cho cron-job.org (tránh timeout)
    syncScoresHelper()
      .then((result) => {
        console.log('Background sync completed:', result);
      })
      .catch((error) => {
        console.error('Background sync failed:', error);
      });

    return NextResponse.json({
      success: true,
      message: 'Sync process triggered successfully in background'
    });
  }
}
export const dynamic = 'force-dynamic';
