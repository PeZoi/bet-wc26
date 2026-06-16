'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, AlertCircle, Calendar } from 'lucide-react';
import { createCustomBet, getUpcomingMatches } from '@/app/actions/chat';
import { useDialog } from '@/components/ui/dialog-custom';

interface CreateBetModalProps {
  isOpen: boolean;
  onClose: () => void;
  friendId: string;
  friendName: string;
  onSuccess?: () => void;
}

export default function CreateBetModal({
  isOpen,
  onClose,
  friendId,
  friendName,
  onSuccess
}: CreateBetModalProps) {
  const { showAlert } = useDialog();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [matches, setMatches] = useState<any[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);
  const [prediction, setPrediction] = useState<'HOME_WIN' | 'AWAY_WIN' | 'DRAW'>('HOME_WIN');
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOpen) {
      const loadMatches = async () => {
        setIsLoadingMatches(true);
        try {
          const res = await getUpcomingMatches();
          if (res.success && res.matches) {
            setMatches(res.matches);
          }
        } catch (e) {
          console.error('Không thể tải danh sách trận đấu:', e);
        } finally {
          setIsLoadingMatches(false);
        }
      };
      loadMatches();
    } else {
      // Reset form khi đóng modal
      timer = setTimeout(() => {
        setTitle('');
        setDescription('');
        setSelectedMatchId(null);
        setPrediction('HOME_WIN');
      }, 0);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      await showAlert('Vui lòng nhập nội dung kèo thách đấu.', { type: 'warning' });
      return;
    }

    const finalTitle = selectedMatchId
      ? `[Prediction: ${prediction}] ${title.trim()}`
      : title.trim();

    setIsSubmitting(true);
    try {
      const res = await createCustomBet(friendId, finalTitle, description, 0, selectedMatchId || undefined);
      if (res.success) {
        await showAlert('Đã tạo kèo thách đấu và gửi lời mời đến bạn của bạn!', {
          type: 'success',
          title: 'Thành công'
        });
        setTitle('');
        setDescription('');
        setSelectedMatchId(null);
        setPrediction('HOME_WIN');
        onSuccess?.();
        onClose();
      } else {
        await showAlert(res.message || 'Không thể tạo kèo.', { type: 'error' });
      }
    } catch (error: any) {
      await showAlert(error.message || 'Lỗi hệ thống.', { type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md cursor-pointer"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-md bg-[#12141c]/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden text-white z-10"
          >
            {/* Top line decoration */}
            <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-yellow-500 to-primary" />

            {/* Header */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Trophy className="h-4 w-4 text-yellow-400" />
                Tạo kèo thách đấu với {friendName}
              </h3>
              <button
                onClick={onClose}
                className="text-muted-foreground hover:text-white p-1 rounded hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Chọn trận đấu */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Calendar size={12} className="text-primary" />
                  Gắn với trận đấu sắp diễn ra (Không bắt buộc)
                </label>
                {isLoadingMatches ? (
                  <div className="text-[10px] text-muted-foreground animate-pulse py-4 text-center bg-white/5 rounded-xl border border-white/5">
                    Đang tải danh sách trận đấu...
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Danh sách trận đấu dạng Card Mini */}
                    <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                      {/* Card đặc biệt: Không gắn trận đấu */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMatchId(null);
                          if (title.startsWith('Kèo trận')) {
                            setTitle('');
                          }
                        }}
                        className={`w-full flex items-center justify-center py-2 px-4 rounded-xl border text-[10px] font-bold transition-all cursor-pointer ${
                          selectedMatchId === null
                            ? 'border-primary bg-primary/10 text-white'
                            : 'border-white/5 bg-white/5 text-muted-foreground hover:bg-white/10 hover:border-white/10 hover:text-white'
                        }`}
                      >
                        -- Không gắn với trận đấu nào --
                      </button>

                      {matches.map((m) => {
                        const isSelected = selectedMatchId === m.id;
                        const timeStr = new Date(m.match_time).toLocaleString('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        });

                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              setSelectedMatchId(m.id);
                              // Tự động điền tiêu đề gợi ý nếu chưa nhập gì hoặc tiêu đề cũ trống/đang là gợi ý trận trước
                              if (!title || title.startsWith('Kèo trận')) {
                                setTitle(`Kèo trận ${m.home_team} vs ${m.away_team}: `);
                              }
                            }}
                            className={`w-full flex items-center justify-between p-2 rounded-xl border text-left transition-all cursor-pointer gap-2 ${
                              isSelected
                                ? 'border-primary bg-primary/10 text-white scale-[1.01] shadow-md shadow-primary/5'
                                : 'border-white/5 bg-white/5 text-muted-foreground hover:bg-white/10 hover:border-white/10 hover:text-white'
                            }`}
                          >
                            {/* Đội nhà */}
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                              {m.home_logo && (
                                <img src={m.home_logo} alt={m.home_team} className="w-4 h-4 object-contain flex-shrink-0" />
                              )}
                              <span className={`text-[11px] truncate font-bold ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                                {m.home_team}
                              </span>
                            </div>

                            {/* VS & Thời gian */}
                            <div className="flex flex-col items-center flex-shrink-0 px-2 text-center">
                              <span className="text-[8px] font-black text-yellow-500 bg-yellow-500/10 px-1 py-0.5 rounded scale-90">
                                VS
                              </span>
                              <span className="text-[8px] text-muted-foreground mt-0.5 font-semibold">
                                {timeStr}
                              </span>
                            </div>

                            {/* Đội khách */}
                            <div className="flex items-center justify-end gap-1.5 min-w-0 flex-1 text-right">
                              <span className={`text-[11px] truncate font-bold ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                                {m.away_team}
                              </span>
                              {m.away_logo && (
                                <img src={m.away_logo} alt={m.away_team} className="w-4 h-4 object-contain flex-shrink-0" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Chọn cửa cược (Chỉ khi có gắn trận đấu) */}
              {selectedMatchId && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Dự đoán của bạn (Người thách đấu) *
                  </label>
                  {(() => {
                    const selectedMatch = matches.find(m => m.id === selectedMatchId);
                    if (!selectedMatch) return null;
                    return (
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setPrediction('HOME_WIN')}
                          className={`py-2 px-1 rounded-xl border text-[10px] font-bold text-center transition-all cursor-pointer truncate ${
                            prediction === 'HOME_WIN'
                              ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400 font-extrabold'
                              : 'border-white/5 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          {selectedMatch.home_team} thắng
                        </button>
                        <button
                          type="button"
                          onClick={() => setPrediction('DRAW')}
                          className={`py-2 px-1 rounded-xl border text-[10px] font-bold text-center transition-all cursor-pointer truncate ${
                            prediction === 'DRAW'
                              ? 'border-yellow-500 bg-yellow-500/20 text-yellow-400 font-extrabold'
                              : 'border-white/5 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          Hòa
                        </button>
                        <button
                          type="button"
                          onClick={() => setPrediction('AWAY_WIN')}
                          className={`py-2 px-1 rounded-xl border text-[10px] font-bold text-center transition-all cursor-pointer truncate ${
                            prediction === 'AWAY_WIN'
                              ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400 font-extrabold'
                              : 'border-white/5 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          {selectedMatch.away_team} thắng
                        </button>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Tiêu đề kèo */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Nội dung kèo thách đấu *
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Kèo Argentina thắng tối thiểu 2 bàn"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-background/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-primary/50 transition-colors"
                  maxLength={100}
                  required
                />
              </div>

              {/* Mô tả hình phạt */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Phần thưởng / Hình phạt
                </label>
                <textarea
                  placeholder="Ví dụ: Ai thua mời đi ăn buffet / Trả 1 cốc trà sữa"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-background/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-primary/50 transition-colors h-16 resize-none"
                  maxLength={200}
                />
              </div>

              {/* Cảnh báo nhỏ */}
              <div className="flex gap-2 p-3 bg-white/5 border border-white/5 rounded-xl text-[10px] text-muted-foreground leading-normal">
                <AlertCircle className="h-4 w-4 text-blue-400 flex-shrink-0" />
                <span>
                  Kèo thách đấu cá nhân sẽ được gửi trực tiếp vào khung chat. Kết quả trận đấu sẽ tự động cập nhật và phân định thắng thua khi kết thúc.
                </span>
              </div>

              {/* Submit */}
              <div className="flex items-center justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold text-muted-foreground hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-primary hover:bg-primary/95 rounded-xl shadow-lg shadow-primary/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Đang gửi...' : 'Gửi lời mời'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
