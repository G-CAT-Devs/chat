<script lang="ts">
	import { onMount, getContext } from 'svelte';
	import type { Writable } from 'svelte/store';
	import { userPlan, user } from '$lib/stores';
	import { getPlan, type PlanResponse } from '$lib/apis/plan';
	import Sparkles from '$lib/components/layout/Sidebar/icons/Sparkles.svelte';
	import { formatNumber } from '$lib/utils';
	import { goto } from '$app/navigation';

	const i18n: Writable<any> = getContext('i18n');

	let loading = true;

	const refreshPlan = async () => {
		if (!localStorage.token) return;
		try {
			const res = await getPlan(localStorage.token);
			if (res && res.available) {
				userPlan.set(res);
			}
		} catch (err) {
			console.error('Failed to load user plan for sidebar:', err);
		} finally {
			loading = false;
		}
	};

	onMount(() => {
		refreshPlan();
		// Refresh every 60 seconds
		const interval = setInterval(refreshPlan, 60000);
		return () => clearInterval(interval);
	});

	const getProgressColor = (percent: number) => {
		if (percent >= 90) return 'bg-red-500';
		if (percent >= 70) return 'bg-amber-500';
		return 'bg-emerald-500';
	};

	const calculatePct = (used: number = 0, total: number = 0) => {
		if (!total || total <= 0) return 0;
		return Math.min(Math.round((used / total) * 100), 100);
	};

	$: tier = $userPlan?.plan?.tier || 'Free';
	$: isProOrHigher = tier === 'Pro' || tier === 'Max' || tier === 'Researchers';
	$: isMax = tier === 'Max' || tier === 'Researchers';

	// 5-hour limit
	$: fiveHourLimit = $userPlan?.limits?.five_hour_tokens || 15000;
	$: fiveHourUsed = $userPlan?.usage?.five_hour_tokens || 0;
	$: fiveHourPct = $userPlan?.usage?.five_hour_percent ?? calculatePct(fiveHourUsed, fiveHourLimit);

	// Weekly limit
	$: weeklyLimit = $userPlan?.limits?.weekly_tokens || 100000;
	$: weeklyUsed = $userPlan?.usage?.weekly_tokens || 0;
	$: weeklyPct = $userPlan?.usage?.weekly_percent ?? calculatePct(weeklyUsed, weeklyLimit);

	const tierBadges: Record<string, { bg: string; text: string; label: string }> = {
		Free: { bg: 'bg-gray-500/10 dark:bg-gray-400/10 border-gray-500/20', text: 'text-gray-600 dark:text-gray-300', label: 'Free' },
		Plus: { bg: 'bg-blue-500/15 border-blue-500/30', text: 'text-blue-600 dark:text-blue-400', label: 'Plus' },
		Pro: { bg: 'bg-emerald-500/15 border-emerald-500/30', text: 'text-emerald-600 dark:text-emerald-400', label: 'Pro' },
		Max: { bg: 'bg-purple-500/15 border-purple-500/30', text: 'text-purple-600 dark:text-purple-400', label: 'Max' },
		Researchers: { bg: 'bg-amber-500/15 border-amber-500/30', text: 'text-amber-600 dark:text-amber-400', label: 'Research' }
	};
</script>

{#if $user}
	<div
		class="mx-1 mb-2 p-2.5 rounded-2xl border border-gray-200/80 dark:border-gray-800/80 bg-white/70 dark:bg-gray-900/60 backdrop-blur-xs shadow-xs text-xs space-y-2.5 transition-all hover:border-gray-300 dark:hover:border-gray-750"
	>
		<!-- Header: Plan Name & Badge -->
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-1.5 min-w-0">
				<span class="font-semibold text-gray-850 dark:text-gray-100 truncate">
					{$userPlan?.plan?.name || `${tier} Plan`}
				</span>
			</div>

			<span
				class="px-2 py-0.5 rounded-full text-[0.625rem] font-medium border {(tierBadges[tier] || tierBadges.Free).bg} {(tierBadges[tier] || tierBadges.Free).text}"
			>
				{(tierBadges[tier] || tierBadges.Free).label}
			</span>
		</div>

		<!-- Progress Bars: 5-Hour and Weekly -->
		<div class="space-y-1.5 pt-0.5">
			<!-- 5-Hour Limit -->
			<div>
				<div class="flex justify-between items-center text-[0.6875rem] mb-1">
					<span class="text-gray-500 dark:text-gray-400 font-medium">
						{$i18n.t('5-Hour Limit')}
					</span>
					<span class="text-[0.625rem] tabular-nums text-gray-400 dark:text-gray-500">
						{100 - fiveHourPct}% {$i18n.t('left')}
					</span>
				</div>
				<div class="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
					<div
						class="h-full {getProgressColor(fiveHourPct)} transition-all duration-500 rounded-full"
						style="width: {fiveHourPct}%"
					></div>
				</div>
			</div>

			<!-- Weekly Limit -->
			<div>
				<div class="flex justify-between items-center text-[0.6875rem] mb-1">
					<span class="text-gray-500 dark:text-gray-400 font-medium">
						{$i18n.t('Weekly Limit')}
					</span>
					<span class="text-[0.625rem] tabular-nums text-gray-400 dark:text-gray-500">
						{100 - weeklyPct}% {$i18n.t('left')}
					</span>
				</div>
				<div class="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
					<div
						class="h-full {getProgressColor(weeklyPct)} transition-all duration-500 rounded-full"
						style="width: {weeklyPct}%"
					></div>
				</div>
			</div>
		</div>

		<!-- Action Button -->
		<div class="pt-1">
			{#if tier === 'Researchers'}
				<a
					href="https://t.me/gcat_org"
					target="_blank"
					rel="noopener noreferrer"
					class="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-800 dark:text-gray-200 font-medium text-[0.6875rem] transition"
				>
					<span>{$i18n.t('Contact Support')}</span>
				</a>
			{:else}
				<button
					type="button"
					on:click={() => goto('/subscription')}
					class="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-linear-to-r from-gray-900 to-gray-800 hover:from-black hover:to-gray-900 dark:from-white dark:to-gray-100 dark:hover:from-gray-100 dark:hover:to-gray-200 text-white dark:text-gray-900 font-medium text-[0.6875rem] shadow-xs hover:shadow-sm transition active:scale-[0.98]"
				>
					<Sparkles className="size-3.5" />
					<span>
						{tier === 'Free' ? $i18n.t('Upgrade to Plus') : $i18n.t('Manage / Upgrade Plan')}
					</span>
				</button>
			{/if}
		</div>
	</div>
{/if}
