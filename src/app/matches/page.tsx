import React from "react";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import Navbar from "@/components/navbar";
import MatchesList from "./matches-list";
import { Match, Prediction } from "@/types";
import { User } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export default async function MatchesPage() {
	let matches: Match[] = [];
	let predictions: Prediction[] = [];
	let allPredictions: any[] = [];
	let user: User | null = null;
	let isLoggedIn = false;
	let isAdmin = false;

	try {
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

		// Fetch all predictions for all users to show who has bet (Avatar Stack)
		const adminSupabase = createAdminClient();
		const { data: dbAllPredictions } = await adminSupabase
			.from("predictions")
			.select("match_id, user_id, prediction_choice, profiles:profiles!predictions_user_id_fkey(avatar_url, display_name)");
		allPredictions = dbAllPredictions || [];
	} catch (error) {
		console.error("Database error in MatchesPage:", error);
		matches = [];
		predictions = [];
		allPredictions = [];
	}

	return (
		<div className='flex min-h-[100dvh] flex-col bg-background text-foreground'>
			<Navbar />

			<main className='flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8'>
				<MatchesList
					initialMatches={matches}
					initialPredictions={predictions}
					allPredictions={allPredictions}
					isLoggedIn={isLoggedIn}
					isAdmin={isAdmin}
				/>
			</main>

			<footer className='border-t border-white/5 py-6 text-center text-xs text-muted-foreground mt-8'>
				<p>© 2026 WC Prediction. Vận hành bởi đam mê bóng đá.</p>
			</footer>
		</div>
	);
}
