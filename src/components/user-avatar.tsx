'use client';

import React, { useState, useEffect } from 'react';

interface UserAvatarProps {
  src?: string | null;
  displayName?: string | null;
  className?: string;
}

// Lấy duy nhất 1 chữ cái đầu của tên hiển thị giúp avatar tối giản và sang trọng
const getInitials = (name: string) => {
  if (!name) return '?';
  const cleanName = name.trim();
  return cleanName.charAt(0).toUpperCase();
};

// Sinh dải màu gradient trầm ấm, cao cấp, bão hòa vừa phải phù hợp với dark theme
const getAvatarGradient = (name: string) => {
  if (!name) return 'from-[#1e293b] to-[#0f172a]'; // Slate dark
  const gradients = [
    'from-indigo-600/90 to-blue-700/95',     // Xanh indigo hoàng gia
    'from-emerald-600/90 to-teal-700/95',    // Xanh ngọc lục bảo sang trọng
    'from-amber-600/90 to-rose-700/95',      // Vàng cam trầm ấm
    'from-purple-600/90 to-pink-700/95',     // Tím mận quyến rũ
    'from-sky-500/90 to-indigo-600/95',      // Xanh trời chiều thâm trầm
    'from-violet-600/90 to-fuchsia-700/95',  // Tím violet huyền bí
    'from-teal-500/90 to-cyan-600/95',       // Xanh ngọc lam tươi mát
    'from-slate-600/90 to-slate-800/95',     // Xanh đá phiến hiện đại
  ];
  // Tính hash từ tên để giữ màu cố định cho mỗi user
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
};

// Tự động gán kích thước chữ cân đối theo kích cỡ của avatar để tránh bị lệch, tràn chữ
const getFontSizeClass = (className: string) => {
  if (className.includes('h-20') || className.includes('w-20')) return 'text-3xl font-medium';
  if (className.includes('h-16') || className.includes('w-16')) return 'text-2xl font-medium';
  if (className.includes('h-9') || className.includes('w-9')) return 'text-sm font-semibold';
  if (className.includes('h-8') || className.includes('w-8') || className.includes('h-7.5')) return 'text-xs font-semibold';
  if (className.includes('h-6') || className.includes('w-6')) return 'text-[10px] font-bold';
  if (className.includes('h-5') || className.includes('w-5')) return 'text-[9px] font-black';
  return 'text-xs font-semibold';
};

export default function UserAvatar({ src, displayName, className = "h-8 w-8" }: UserAvatarProps) {
  const [error, setError] = useState(false);
  const [mounted, setMounted] = useState(false);
  const name = displayName || 'User';

  // Chờ component mounted để tránh lỗi hydration Next.js làm mất sự kiện onError của thẻ img
  useEffect(() => {
    setMounted(true);
  }, []);

  const initials = getInitials(name);
  const gradient = getAvatarGradient(name);
  const fontSizeClass = getFontSizeClass(className);

  // Giao diện fallback semi-flat cao cấp: dải màu mịn, căn giữa tuyệt đối, không lòe loẹt
  const renderFallback = () => (
    <div 
      className={`flex items-center justify-center rounded-full text-white select-none bg-gradient-to-br ${gradient} border border-white/10 shadow-sm ${fontSizeClass} ${className}`}
      title={name}
      style={{
        textShadow: '0 1px 1px rgba(0, 0, 0, 0.2)',
      }}
    >
      <span className="font-sans tracking-normal leading-none mb-[0.5px]">{initials}</span>
    </div>
  );

  // Khi chưa mounted (SSR), render fallback trước để tránh mismatch DOM
  if (!mounted) {
    return renderFallback();
  }

  if (!src || error) {
    return renderFallback();
  }

  return (
    <img
      src={src}
      alt={name}
      onError={() => setError(true)}
      className={`rounded-full object-cover border border-white/10 shadow-sm ${className}`}
    />
  );
}
