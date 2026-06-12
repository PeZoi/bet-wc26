import React from 'react';
import Navbar from '@/components/navbar';
import { Award, Clock, Star, Trophy, ShieldAlert } from 'lucide-react';

export default function RulesPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-background text-foreground">
      <Navbar />

      <main className="flex-1 mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center space-y-3">
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-white">
              Thể Lệ Tính Điểm & Quy Định
            </h1>
            <p className="text-muted-foreground text-sm max-w-[60ch] mx-auto">
              Vui lòng đọc kỹ các quy định dưới đây để tham gia dự đoán bóng đá vui vẻ và công bằng trong nhóm.
            </p>
          </div>

          {/* Points Rules */}
          <div className="glass-panel rounded-3xl p-6 md:p-8 space-y-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2 border-b border-white/5 pb-3">
              <Trophy className="h-5 w-5 text-primary" />
              Cách Tính Điểm Dự Đoán
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Win Prediction */}
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-5 space-y-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 -mr-3 -mt-3 text-emerald-400/10">
                  <Star className="h-20 w-20 fill-current" />
                </div>
                <div className="inline-flex p-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-sm font-bold">
                  Thắng Kèo / Đoán Đúng
                </div>
                <h3 className="text-3xl font-extrabold font-mono text-emerald-400">+1 điểm</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Đoán đúng đội thắng kèo sau khi cộng/trừ tỷ lệ chấp Handicap (hoặc đoán đúng đội thắng nếu trận đấu không chấp).
                  <br />
                  <span className="italic text-[10px]">Ví dụ: Bắt đội nhà chấp 0.5, tỷ số là 1-0 &rarr; Thắng kèo (+1đ).</span>
                </p>
              </div>

              {/* Loss / Wrong prediction */}
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5 space-y-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 -mr-3 -mt-3 text-amber-400/10">
                  <Award className="h-20 w-20 fill-current" />
                </div>
                <div className="inline-flex p-2 rounded-xl bg-amber-500/10 text-amber-400 text-sm font-bold">
                  Thua Kèo / Đoán Sai
                </div>
                <h3 className="text-3xl font-extrabold font-mono text-amber-400">+X điểm</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Khi dự đoán sai, bạn vẫn có thể nhận <span className="text-amber-400 font-bold">Điểm Thua</span> do Admin cấu hình cho từng trận hoặc theo vòng đấu.
                  <br />
                  <span className="italic text-[10px]">Ví dụ: Vòng bảng mỗi trận sai +2đ, Vòng 1/8 sai +3đ, Tứ kết +4đ, Bán kết +5đ, Chung kết +7đ...</span>
                  <br />
                  <span className="text-[10px] text-muted-foreground/70">Nếu Điểm Thua = 0, bạn sẽ không nhận được điểm nào khi dự đoán sai.</span>
                </p>
              </div>
            </div>
          </div>

          {/* Time Limit & Privacy */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Time lock */}
            <div className="glass-panel rounded-2xl p-6 border border-white/5 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Thời Gian Khóa Dự Đoán
              </h3>
              <ul className="text-xs text-muted-foreground space-y-2 list-disc list-inside leading-relaxed">
                <li>Hệ thống tự động khóa dự đoán của trận đấu đúng <span className="text-primary font-bold">5 phút</span> trước giờ bóng lăn.</li>
                <li>Sau thời điểm này, bạn không thể tạo mới hoặc chỉnh sửa dự đoán.</li>
                <li>Dự đoán của các người chơi khác sẽ được hiển thị công khai ngay sau khi trận đấu bị khóa để đảm bảo minh bạch, chống gian lận.</li>
              </ul>
            </div>

            {/* Tiebreaker */}
            <div className="glass-panel rounded-2xl p-6 border border-white/5 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Trophy className="h-5 w-5 text-secondary" />
                Tiêu Chí Phụ Xếp Hạng
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Nếu có 2 hoặc nhiều thành viên có cùng tổng số điểm, bảng xếp hạng sẽ tính toán dựa trên các chỉ số phụ theo thứ tự ưu tiên sau:
              </p>
              <ol className="text-xs text-muted-foreground space-y-2 list-decimal list-inside leading-relaxed">
                <li>Tổng số lần đoán <span className="text-emerald-400 font-bold">Thắng kèo / Đoán đúng</span> (+1đ) nhiều hơn.</li>
                <li>Nếu vẫn bằng nhau, người cập nhật dự đoán sớm hơn sẽ xếp trên.</li>
              </ol>
            </div>
          </div>

          {/* Note */}
          <div className="flex items-start gap-3 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-4 text-xs text-yellow-400">
            <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <p className="font-bold">Lưu ý phi thương mại</p>
              <p className="mt-1 text-yellow-500/80">
                Hệ thống được thiết kế hoàn toàn phục vụ mục đích giải trí nội bộ cho nhóm bạn bè xem và thưởng thức bóng đá vui vẻ. Tuyệt đối không sử dụng cho mục đích cá cược bất hợp pháp, thu tiền hay các hoạt động thương mại khác.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-white/5 py-6 text-center text-xs text-muted-foreground">
        <p>© 2026 WC Prediction. Vận hành bởi đam mê bóng đá.</p>
      </footer>
    </div>
  );
}
