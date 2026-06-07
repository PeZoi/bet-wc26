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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Exact Score */}
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-5 space-y-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 -mr-3 -mt-3 text-emerald-400/10">
                  <Star className="h-20 w-20 fill-current" />
                </div>
                <div className="inline-flex p-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-sm font-bold">
                  Chính Xác Tỉ Số
                </div>
                <h3 className="text-3xl font-extrabold font-mono text-emerald-400">+3 điểm</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Đoán đúng chính xác tỉ số của cả hai đội.
                  <br />
                  <span className="italic text-[10px]">Ví dụ: Đoán 2-1 và kết quả thực tế là 2-1.</span>
                </p>
              </div>

              {/* Correct Outcome */}
              <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-2xl p-5 space-y-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 -mr-3 -mt-3 text-cyan-400/10">
                  <Award className="h-20 w-20 fill-current" />
                </div>
                <div className="inline-flex p-2 rounded-xl bg-cyan-500/10 text-cyan-400 text-sm font-bold">
                  Đúng Kết Quả
                </div>
                <h3 className="text-3xl font-extrabold font-mono text-cyan-400">+1 điểm</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Đoán đúng đội thắng/thua hoặc hòa nhưng sai tỉ số cụ thể.
                  <br />
                  <span className="italic text-[10px]">Ví dụ: Đoán 2-1 nhưng kết quả là 1-0 hoặc 3-1.</span>
                </p>
              </div>

              {/* Wrong outcome */}
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-3">
                <div className="inline-flex p-2 rounded-xl bg-white/5 text-muted-foreground text-sm font-bold">
                  Sai Kết Quả
                </div>
                <h3 className="text-3xl font-extrabold font-mono text-muted-foreground">0 điểm</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Đoán sai hoàn toàn kết quả trận đấu.
                  <br />
                  <span className="italic text-[10px]">Ví dụ: Đoán 2-1 nhưng kết quả là 1-2 hoặc 1-1.</span>
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
                <li>Tổng số lần đoán <span className="text-emerald-400 font-bold">đúng chính xác tỉ số</span> (+3đ) nhiều hơn.</li>
                <li>Tổng số lần đoán <span className="text-cyan-400 font-bold">đúng kết quả</span> (+1đ) nhiều hơn.</li>
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
