import React from "react";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/navbar";
import { ShieldAlert } from "lucide-react";
import { User } from "@supabase/supabase-js";
import { Match } from "@/types";
import AdminClient from "./admin-client";

export const revalidate = 0; // Fresh admin controls

export default async function AdminPage() {
	let user: User | null = null;
	let matches: Match[] = [];
	let isAdmin = false;

	try {
		const supabase = await createClient();
		const {
			data: { user: currentUser },
		} = await supabase.auth.getUser();
		user = currentUser;

		const adminEmailsEnv = process.env.ADMIN_EMAILS || "";
		const adminEmails = adminEmailsEnv
			.split(",")
			.map((email) => email.trim().toLowerCase());

		if (
			user &&
			user.email &&
			adminEmails.includes(user.email.toLowerCase())
		) {
			isAdmin = true;

			// Fetch all matches for the admin panel
			const { data: dbMatches } = await supabase
				.from("matches")
				.select("*")
				.order("match_time", { ascending: true });

			matches = dbMatches || [];
		}
	} catch (e) {
		console.error("Admin page server initialization error:", e);
	}

	return (
		<div className='flex min-h-[100dvh] flex-col bg-background text-foreground'>
			<Navbar />

			<main className='flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8'>
				{!isAdmin ? (
					<div className='flex flex-col items-center justify-center py-20 text-center space-y-6'>
						<div className='h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 text-red-400'>
							<ShieldAlert className='h-8 w-8' />
						</div>
						<div className='space-y-2'>
							<h2 className='text-2xl font-bold text-white'>
								Bạn không có quyền truy cập
							</h2>
							<p className='text-sm text-muted-foreground max-w-[45ch]'>
								{user
									? `Tài khoản ${user.email} không nằm trong danh sách Admin được cấu hình trong hệ thống.`
									: "Vui lòng đăng nhập bằng tài khoản Google có quyền Admin để tiếp tục."}
							</p>
						</div>
					</div>
				) : (
					<div className='space-y-6'>
						<div>
							<h1 className='text-2xl font-bold tracking-tight text-white sm:text-3xl flex items-center gap-2'>
								<ShieldAlert className='h-7 w-7 text-yellow-500' />
								Admin Panel
							</h1>
							<p className='text-sm text-muted-foreground mt-1'>
								Quản lý các trận đấu, cập nhật tỉ số thực tế và đồng bộ
								dữ liệu từ API.
							</p>
						</div>

						<AdminClient initialMatches={matches} />
					</div>
				)}
			</main>

			<footer className='border-t border-white/5 py-6 text-center text-xs text-muted-foreground mt-8'>
				<p>© 2026 WC Prediction. Vận hành bởi đam mê bóng đá.</p>
			</footer>
		</div>
	);
}
