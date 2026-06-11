import React from "react";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/navbar";
import { autoSyncThrottled } from "@/lib/sync";
import MatchesList from "./matches-list";
import { Match, Prediction } from "@/types";
import { User } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export default async function MatchesPage() {
	let matches: Match[] = [];
	let predictions: Prediction[] = [];
	let user: User | null = null;
	let isLoggedIn = false;
	let isAdmin = false;

	try {
		// Automatically trigger throttled sync (max once per 10 minutes)
		await autoSyncThrottled();

		const supabase = await createClient();
		const {
			data: { user: currentUser },
		} = await supabase.auth.getUser();
		user = currentUser;
		isLoggedIn = !!user;

		const adminEmailsEnv = process.env.ADMIN_EMAILS || '';
		const adminEmails = adminEmailsEnv.split(',').map((email) => email.trim().toLowerCase());
		isAdmin = user?.email ? adminEmails.includes(user.email.toLowerCase()) : false;

		// Fetch all matches
		const { data: dbMatches, error: matchesError } = await supabase
			.from("matches")
			.select("*")
			.order("match_time", { ascending: true });

		if (matchesError) {
			console.error("Matches query failed:", matchesError);
			matches = [];
		} else {
			matches = dbMatches || [];
		}

		// Fetch user predictions if logged in
		if (user) {
			const { data: dbPredictions } = await supabase
				.from("predictions")
				.select("*")
				.eq("user_id", user.id);
			predictions = dbPredictions || [];
		}
	} catch (error) {
		console.error("Database error in MatchesPage:", error);
		matches = [];
		predictions = [];
	}

	return (
		<div className='flex min-h-[100dvh] flex-col bg-background text-foreground'>
			<Navbar />

			<main className='flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8'>
				<div className='space-y-6'>
					<div>
						<h1 className='text-2xl font-bold tracking-tight text-white sm:text-3xl'>
							Lịch Thi Đấu & Kết Quả
						</h1>
						<p className='text-sm text-muted-foreground mt-1'>
							Theo dõi lịch thi đấu, kết quả cập nhật trực tiếp và dự
							đoán tỉ số để tích điểm.
						</p>
					</div>

					<MatchesList
						initialMatches={matches}
						initialPredictions={predictions}
						isLoggedIn={isLoggedIn}
						isAdmin={isAdmin}
					/>
				</div>
			</main>

			<footer className='border-t border-white/5 py-6 text-center text-xs text-muted-foreground mt-8'>
				<p>© 2026 WC Prediction. Vận hành bởi đam mê bóng đá.</p>
			</footer>
		</div>
	);
}
