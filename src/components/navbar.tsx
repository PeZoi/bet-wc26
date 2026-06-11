"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
	Trophy,
	Calendar,
	LayoutDashboard,
	FileText,
	Menu,
	X,
	LogIn,
	LogOut,
	Users,
	Table,
	MessageSquare,
	RefreshCw,
} from "lucide-react";
import { User } from "@supabase/supabase-js";
import { useDialog } from "@/components/ui/dialog-custom";

export default function Navbar() {
	const pathname = usePathname();
	const router = useRouter();
	const { showAlert } = useDialog();
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const [syncing, setSyncing] = useState(false);
	const supabase = createClient();

	useEffect(() => {
		async function getUser() {
			const {
				data: { user },
			} = await supabase.auth.getUser();
			setUser(user);
			setLoading(false);
		}
		getUser();

		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, session) => {
			setUser(session?.user ?? null);
		});

		return () => {
			subscription.unsubscribe();
		};
	}, [supabase]);

	const handleLogin = async () => {
		await supabase.auth.signInWithOAuth({
			provider: "google",
			options: {
				redirectTo: `${window.location.origin}/auth/callback`,
			},
		});
	};

	const handleLogout = async () => {
		await supabase.auth.signOut();
		window.location.href = "/";
	};

	const handleSyncScores = async () => {
		if (syncing) return;
		setSyncing(true);
		try {
			const res = await fetch("/api/sync-scores");
			const data = await res.json();
			if (data.success) {
				router.refresh();
				await showAlert("Cập nhật tỉ số thực tế thành công!", { type: "success", title: "Thành công" });
			} else {
				await showAlert("Cập nhật tỉ số thất bại: " + data.message, { type: "error", title: "Thất bại" });
			}
		} catch (error) {
			console.error("Lỗi đồng bộ tỉ số:", error);
			await showAlert("Có lỗi xảy ra khi cập nhật tỉ số.", { type: "error", title: "Lỗi" });
		} finally {
			setSyncing(false);
		}
	};

	const navItems = [
		{ name: "Bảng tin", href: "/dashboard", icon: LayoutDashboard },
		{ name: "Lịch đấu", href: "/matches", icon: Calendar },
		{ name: "Đội bóng", href: "/teams", icon: Users },
		{ name: "BXH Bảng", href: "/group-standings", icon: Table },
		{ name: "Xếp hạng", href: "/leaderboard", icon: Trophy },
		{ name: "Chat", href: "/chat", icon: MessageSquare },
		{ name: "Thể lệ", href: "/rules", icon: FileText },
	];

	// Helper to check if route is active
	const isActive = (path: string) => pathname === path;

	return (
		<nav className='sticky top-0 z-50 w-full border-b border-white/10 bg-background/80 backdrop-blur-md'>
			<div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
				<div className='flex h-16 items-center justify-between'>
					{/* Logo */}
					<div className='flex items-center'>
						<Link href='/' className='flex items-center gap-2.5 group'>
							<img 
								src="/wc26.webp" 
								alt="World Cup 2026 Logo" 
								className="h-9 w-auto object-contain group-hover:scale-105 transition-transform duration-300"
							/>
							<div className="flex flex-col items-start leading-none gap-0.5">
								<span className="text-[10px] font-black tracking-[0.25em] text-muted-foreground/80 uppercase">
									FIFA
								</span>
								<span className="text-sm font-black tracking-wide text-white uppercase bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
									WORLD CUP <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent font-black">2026</span>
								</span>
							</div>
						</Link>
					</div>

					{/* Desktop Navigation */}
					<div className='hidden md:flex items-center gap-1 lg:gap-2.5 xl:gap-4'>
						{navItems.map((item) => {
							const Icon = item.icon;
							const active = isActive(item.href);
							return (
								<Link
									key={item.href}
									href={item.href}
									className={`flex items-center gap-1.5 text-xs font-bold transition-all duration-200 py-1.5 px-2.5 rounded-full whitespace-nowrap ${
										active
											? "bg-primary/10 text-primary border border-primary/20"
											: "text-muted-foreground hover:text-foreground hover:bg-white/5"
									}`}
								>
									<Icon className='h-3.5 w-3.5 flex-shrink-0' />
									{item.name}
								</Link>
							);
						})}
					</div>

					{/* Authentication & User Panel */}
					<div className='hidden md:flex items-center gap-3 flex-shrink-0'>
						<button
							onClick={handleSyncScores}
							disabled={syncing}
							className="flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary py-1.5 px-3.5 text-xs font-bold transition-all duration-200 cursor-pointer disabled:opacity-50"
							title="Đồng bộ tỉ số mới nhất từ API"
						>
							<RefreshCw className={`h-3 w-3 ${syncing ? 'animate-spin' : ''}`} />
							{syncing ? 'Đang cập nhật...' : 'Cập nhật tỉ số'}
						</button>

						{loading ? (
							<div className='h-8 w-24 animate-pulse rounded-full bg-white/5' />
						) : user ? (
							<div className='flex items-center gap-2'>
								<div className='flex items-center gap-2 rounded-full bg-card border border-white/5 py-1 pl-1 pr-2.5'>
									<img
										src={
											user.user_metadata?.avatar_url ||
											"https://api.dicebear.com/7.x/bottts/svg"
										}
										alt={
											user.user_metadata?.full_name || "User avatar"
										}
										className='h-6.5 w-6.5 rounded-full object-cover bg-white/10'
										referrerPolicy='no-referrer'
									/>
									<span className='text-[11px] font-bold max-w-[80px] truncate text-foreground'>
										{user.user_metadata?.full_name || "User"}
									</span>
								</div>
								<button
									onClick={handleLogout}
									className='rounded-full bg-white/5 p-2 text-muted-foreground hover:text-white hover:bg-white/10 transition-colors cursor-pointer'
									title='Đăng xuất'
								>
									<LogOut className='h-3.5 w-3.5' />
								</button>
							</div>
						) : (
							<button
								onClick={handleLogin}
								className='flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer shadow-lg shadow-primary/20'
							>
								<LogIn className='h-3.5 w-3.5' />
								Đăng nhập Google
							</button>
						)}
					</div>

					{/* Mobile Menu Toggle */}
					<div className='flex md:hidden'>
						<button
							onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
							className='inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-white/5 hover:text-foreground focus:outline-none'
						>
							{mobileMenuOpen ? (
								<X className='h-6 w-6' />
							) : (
								<Menu className='h-6 w-6' />
							)}
						</button>
					</div>
				</div>
			</div>

			{/* Mobile Menu Panel */}
			{mobileMenuOpen && (
				<div className='md:hidden border-b border-white/10 bg-background/95 px-4 pt-2 pb-4 space-y-3'>
					{navItems.map((item) => {
						const Icon = item.icon;
						const active = isActive(item.href);
						return (
							<Link
								key={item.href}
								href={item.href}
								onClick={() => setMobileMenuOpen(false)}
								className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors ${
									active
										? "bg-primary/10 text-primary border-l-4 border-primary"
										: "text-muted-foreground hover:bg-white/5 hover:text-foreground"
								}`}
							>
								<Icon className='h-5 w-5' />
								{item.name}
							</Link>
						);
					})}

					<div className='pt-4 border-t border-white/10 space-y-3'>
						<button
							onClick={() => {
								setMobileMenuOpen(false);
								handleSyncScores();
							}}
							disabled={syncing}
							className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary py-2.5 text-sm font-semibold disabled:opacity-50"
						>
							<RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
							{syncing ? 'Đang cập nhật...' : 'Cập nhật tỉ số'}
						</button>

						{loading ? (
							<div className='h-10 w-full animate-pulse rounded-lg bg-white/5' />
						) : user ? (
							<div className='space-y-3 px-4'>
								<div className='flex items-center gap-3'>
									<img
										src={
											user.user_metadata?.avatar_url ||
											"https://api.dicebear.com/7.x/bottts/svg"
										}
										alt={
											user.user_metadata?.full_name || "User avatar"
										}
										className='h-9 w-9 rounded-full object-cover bg-white/10'
										referrerPolicy='no-referrer'
									/>
									<div>
										<div className='text-sm font-semibold text-foreground'>
											{user.user_metadata?.full_name || "User"}
										</div>
										<div className='text-xs text-muted-foreground truncate max-w-[200px]'>
											{user.email}
										</div>
									</div>
								</div>
								<button
									onClick={handleLogout}
									className='flex w-full items-center justify-center gap-2 rounded-lg bg-white/5 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-white/10'
								>
									<LogOut className='h-4 w-4' />
									Đăng xuất
								</button>
							</div>
						) : (
							<button
								onClick={handleLogin}
								className='flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90'
							>
								<LogIn className='h-4 w-4' />
								Đăng nhập Google
							</button>
						)}
					</div>
				</div>
			)}
		</nav>
	);
}
