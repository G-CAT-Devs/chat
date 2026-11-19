<script lang="ts">
	import { onMount, getContext } from 'svelte';
	import type { Writable } from 'svelte/store';
	import { getPlan, type PlanResponse } from '$lib/apis/plan';
	import Spinner from '$lib/components/common/Spinner.svelte';
	import { formatNumber } from '$lib/utils';
	import UserSettingSection from './UserSettingSection.svelte';
	import UserSettingRow from './UserSettingRow.svelte';

	const i18n: Writable<any> = getContext('i18n');

	let loading = true;
	let planData: PlanResponse | null = null;

	const loadPlan = async () => {
		loading = true;
		const token = localStorage.getItem('token') || '';
		planData = await getPlan(token);
		loading = false;
	};

	onMount(() => {
		loadPlan();
	});

	const getProgressColor = (percent: number) => {
		if (percent >= 90) return 'bg-red-500';
		if (percent >= 70) return 'bg-amber-500';
		return 'bg-emerald-500';
	};

	const calculatePercent = (used: number = 0, total: number = 0) => {
		if (!total || total <= 0) return 0;
		return Math.min(Math.round((used / total) * 100), 100);
	};
</script>

<div class="flex flex-col h-full justify-between space-y-4 text-sm">
	<div class="space-y-6 overflow-y-auto max-h-[28rem] pr-1">
		{#if loading}
			<div class="flex justify-center items-center py-12">
				<Spinner className="size-6" />
			</div>
		{:else if !planData || !planData.available}
			<div class="rounded-xl border border-gray-100 dark:border-gray-800 p-6 text-center space-y-3">
				<div class="text-gray-500 dark:text-gray-400">
					{$i18n.t('Unable to load plan details at this time.')}
				</div>
				<button
					class="px-4 py-1.5 text-xs font-medium rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition"
					on:click={loadPlan}
				>
					{$i18n.t('Retry')}
				</button>
			</div>
		{:else}
			{#if planData.stale}
				<div
					class="bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs px-3 py-2 rounded-lg"
				>
					{$i18n.t('Showing approximate or cached usage data.')}
				</div>
			{/if}

			<!-- Plan Status Card -->
			<UserSettingSection title={$i18n.t('Current Plan')}>
				<div
					class="flex items-center justify-between p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50"
				>
					<div class="space-y-1">
						<div class="flex items-center space-x-2">
							<span class="font-semibold text-base"
								>{planData.plan?.name || $i18n.t('Standard')}</span
							>
							{#if planData.plan?.status === 'active'}
								<span
									class="px-2 py-0.5 text-[0.6875rem] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full"
								>
									{$i18n.t('Active')}
								</span>
							{:else if planData.plan?.status}
								<span
									class="px-2 py-0.5 text-[0.6875rem] font-medium bg-red-500/10 text-red-600 dark:text-red-400 rounded-full"
								>
									{planData.plan.status}
								</span>
							{/if}
						</div>
						{#if planData.plan?.expires_at}
							<div class="text-xs text-gray-500 dark:text-gray-400">
								{$i18n.t('Expires at')}: {new Date(planData.plan.expires_at).toLocaleDateString()}
							</div>
						{/if}
					</div>
					<a
						href="https://ai.gcat.ir/portal/dashboard/subscription"
						target="_blank"
						rel="noopener noreferrer"
						class="px-3 py-1.5 text-xs font-medium rounded-lg bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 transition"
					>
						{$i18n.t('Upgrade / Renew')}
					</a>
				</div>
			</UserSettingSection>

			<!-- Quotas / Progress Bars -->
			<UserSettingSection title={$i18n.t('Quota and Usage')}>
				<div class="space-y-4">
					<!-- Daily -->
					{#if planData.limits?.daily_tokens}
						{@const used = planData.usage?.daily_tokens || 0}
						{@const limit = planData.limits.daily_tokens}
						{@const pct = calculatePercent(used, limit)}
						<div class="space-y-1.5">
							<div class="flex justify-between text-xs">
								<span class="font-medium">{$i18n.t('Daily Quota')}</span>
								<span class="text-gray-500"
									>{formatNumber(used)} / {formatNumber(limit)} ({pct}%)</span
								>
							</div>
							<div class="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
								<div
									class="h-full {getProgressColor(pct)} transition-all duration-300"
									style="width: {pct}%"
								/>
							</div>
							{#if planData.reset_at?.daily}
								<div class="text-[0.6875rem] text-gray-400">
									{$i18n.t('Resets at')}: {new Date(planData.reset_at.daily).toLocaleTimeString()}
								</div>
							{/if}
						</div>
					{/if}

					<!-- Weekly -->
					{#if planData.limits?.weekly_tokens}
						{@const used = planData.usage?.weekly_tokens || 0}
						{@const limit = planData.limits.weekly_tokens}
						{@const pct = calculatePercent(used, limit)}
						<div class="space-y-1.5">
							<div class="flex justify-between text-xs">
								<span class="font-medium">{$i18n.t('Weekly Quota')}</span>
								<span class="text-gray-500"
									>{formatNumber(used)} / {formatNumber(limit)} ({pct}%)</span
								>
							</div>
							<div class="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
								<div
									class="h-full {getProgressColor(pct)} transition-all duration-300"
									style="width: {pct}%"
								/>
							</div>
							{#if planData.reset_at?.weekly}
								<div class="text-[0.6875rem] text-gray-400">
									{$i18n.t('Resets at')}: {new Date(planData.reset_at.weekly).toLocaleDateString()}
								</div>
							{/if}
						</div>
					{/if}

					<!-- Monthly -->
					{#if planData.limits?.monthly_tokens}
						{@const used = planData.usage?.monthly_tokens || 0}
						{@const limit = planData.limits.monthly_tokens}
						{@const pct = calculatePercent(used, limit)}
						<div class="space-y-1.5">
							<div class="flex justify-between text-xs">
								<span class="font-medium">{$i18n.t('Monthly Quota')}</span>
								<span class="text-gray-500"
									>{formatNumber(used)} / {formatNumber(limit)} ({pct}%)</span
								>
							</div>
							<div class="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
								<div
									class="h-full {getProgressColor(pct)} transition-all duration-300"
									style="width: {pct}%"
								/>
							</div>
							{#if planData.reset_at?.monthly}
								<div class="text-[0.6875rem] text-gray-400">
									{$i18n.t('Resets at')}: {new Date(planData.reset_at.monthly).toLocaleDateString()}
								</div>
							{/if}
						</div>
					{/if}
				</div>
			</UserSettingSection>

			<!-- Models in Plan -->
			<UserSettingSection title={$i18n.t('Included Models')}>
				<div
					class="p-3 rounded-xl border border-gray-100 dark:border-gray-800 text-xs text-gray-600 dark:text-gray-300"
				>
					{#if planData.plan?.models === '*'}
						{$i18n.t('All available models are included in your plan.')}
					{:else if Array.isArray(planData.plan?.models)}
						<div class="flex flex-wrap gap-1.5">
							{#each planData.plan.models as m}
								<span
									class="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
								>
									{m}
								</span>
							{/each}
						</div>
					{:else}
						{$i18n.t('Standard catalog access.')}
					{/if}
				</div>
			</UserSettingSection>

			<!-- Wallet / Balance (PAYG mode) -->
			{#if planData.mode === 'payg' || (planData.wallet_cents && planData.wallet_cents > 0)}
				<UserSettingSection title={$i18n.t('Wallet Balance')}>
					<div
						class="flex justify-between items-center p-3 rounded-xl border border-gray-100 dark:border-gray-800"
					>
						<span class="text-xs text-gray-500">{$i18n.t('Available credit')}</span>
						<span class="font-semibold text-sm"
							>${((planData.wallet_cents || 0) / 100).toFixed(2)}</span
						>
					</div>
				</UserSettingSection>
			{/if}
		{/if}
	</div>
</div>
