<script lang="ts">
	import { onMount, getContext } from 'svelte';
	import type { Writable } from 'svelte/store';
	import { toast } from 'svelte-sonner';
	import { WEBUI_API_BASE_URL } from '$lib/constants';
	import Spinner from '$lib/components/common/Spinner.svelte';
	import Switch from '$lib/components/common/Switch.svelte';
	import AdminSettingSection from './AdminSettingSection.svelte';
	import AdminSettingRow from './AdminSettingRow.svelte';
	import AdminSettingField from './AdminSettingField.svelte';
	import { formatNumber } from '$lib/utils';

	const i18n: Writable<any> = getContext('i18n');

	interface PlanItem {
		id: string;
		name: string;
		tier_name: string;
		price_tomans: number;
		duration_days: number;
		description: string;
		badge: string;
		features: string[] | string;
		allowed_models: string;
		daily_limit: number;
		is_active: number | boolean;
		sort_order: number;
	}

	let loading = true;
	let saving = false;
	let plans: PlanItem[] = [];
	let editingPlan: PlanItem | null = null;
	let isNewPlan = false;

	const loadPlans = async () => {
		loading = true;
		try {
			const res = await fetch(`${WEBUI_API_BASE_URL}/plan/admin/plans`, {
				headers: {
					Authorization: `Bearer ${localStorage.token}`
				}
			});
			if (res.ok) {
				const data = await res.json();
				plans = data.plans || [];
			} else {
				toast.error($i18n.t('Failed to load subscription plans'));
			}
		} catch (err) {
			console.error(err);
			toast.error(err instanceof Error ? err.message : String(err));
		} finally {
			loading = false;
		}
	};

	onMount(() => {
		loadPlans();
	});

	const startEdit = (p: PlanItem) => {
		isNewPlan = false;
		editingPlan = {
			...p,
			features: Array.isArray(p.features) ? p.features.join('\n') : p.features || ''
		};
	};

	const startNewPlan = () => {
		isNewPlan = true;
		editingPlan = {
			id: `plan_${Date.now()}`,
			name: 'New Plan',
			tier_name: 'Plus',
			price_tomans: 199000,
			duration_days: 30,
			description: '',
			badge: '',
			features: 'دسترسی کامل\nسهمیه استاندارد',
			allowed_models: '*',
			daily_limit: 60,
			is_active: 1,
			sort_order: plans.length + 1
		};
	};

	const savePlan = async () => {
		if (!editingPlan) return;
		saving = true;
		try {
			const featuresArray =
				typeof editingPlan.features === 'string'
					? editingPlan.features
							.split('\n')
							.map((s) => s.trim())
							.filter(Boolean)
					: editingPlan.features;

			const payload = {
				...editingPlan,
				features: featuresArray,
				is_active: editingPlan.is_active ? 1 : 0
			};

			const res = await fetch(`${WEBUI_API_BASE_URL}/plan/admin/plans`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${localStorage.token}`
				},
				body: JSON.stringify(payload)
			});

			if (res.ok) {
				toast.success($i18n.t('Plan saved successfully!'));
				editingPlan = null;
				await loadPlans();
			} else {
				toast.error($i18n.t('Failed to save plan'));
			}
		} catch (err) {
			toast.error(err instanceof Error ? err.message : String(err));
		} finally {
			saving = false;
		}
	};

	const deletePlan = async (id: string) => {
		if (!confirm($i18n.t('Are you sure you want to delete this plan?'))) return;
		try {
			const res = await fetch(`${WEBUI_API_BASE_URL}/plan/admin/plans/${id}`, {
				method: 'DELETE',
				headers: {
					Authorization: `Bearer ${localStorage.token}`
				}
			});
			if (res.ok) {
				toast.success($i18n.t('Plan deleted successfully'));
				await loadPlans();
			} else {
				toast.error($i18n.t('Failed to delete plan'));
			}
		} catch (err) {
			toast.error(err instanceof Error ? err.message : String(err));
		}
	};
</script>

<div class="flex flex-col h-full justify-between space-y-4 text-sm">
	<div class="space-y-6 overflow-y-auto max-h-[36rem] pr-1">
		{#if loading}
			<div class="flex justify-center items-center py-12">
				<Spinner className="size-6" />
			</div>
		{:else if editingPlan}
			<!-- Plan Edit Form -->
			<AdminSettingSection title={isNewPlan ? $i18n.t('Create New Plan') : $i18n.t('Edit Plan')}>
				<div
					class="space-y-4 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/40"
				>
					<div class="grid grid-cols-2 gap-4">
						<AdminSettingField label={$i18n.t('Plan Identifier (ID)')}>
							<input
								type="text"
								bind:value={editingPlan.id}
								disabled={!isNewPlan}
								class="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-850 text-gray-800 dark:text-gray-200 text-xs outline-none disabled:opacity-50"
							/>
						</AdminSettingField>

						<AdminSettingField label={$i18n.t('Plan Display Name')}>
							<input
								type="text"
								bind:value={editingPlan.name}
								class="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-850 text-gray-800 dark:text-gray-200 text-xs outline-none"
							/>
						</AdminSettingField>

						<AdminSettingField label={$i18n.t('Official Tier')}>
							<select
								bind:value={editingPlan.tier_name}
								class="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-850 text-gray-800 dark:text-gray-200 text-xs outline-none"
							>
								<option value="Free">Free</option>
								<option value="Plus">Plus</option>
								<option value="Pro">Pro</option>
								<option value="Max">Max</option>
								<option value="Researchers">Researchers</option>
							</select>
						</AdminSettingField>

						<AdminSettingField label={$i18n.t('Price (Tomans)')}>
							<input
								type="number"
								bind:value={editingPlan.price_tomans}
								class="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-850 text-gray-800 dark:text-gray-200 text-xs outline-none"
							/>
						</AdminSettingField>

						<AdminSettingField label={$i18n.t('Duration (Days)')}>
							<input
								type="number"
								bind:value={editingPlan.duration_days}
								class="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-850 text-gray-800 dark:text-gray-200 text-xs outline-none"
							/>
						</AdminSettingField>

						<AdminSettingField label={$i18n.t('Badge Label')}>
							<input
								type="text"
								bind:value={editingPlan.badge}
								placeholder="مثلاً: پرطرفدار"
								class="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-850 text-gray-800 dark:text-gray-200 text-xs outline-none"
							/>
						</AdminSettingField>
					</div>

					<AdminSettingField label={$i18n.t('Description')}>
						<input
							type="text"
							bind:value={editingPlan.description}
							placeholder="توضیحات کوتاه پلن..."
							class="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-850 text-gray-800 dark:text-gray-200 text-xs outline-none"
						/>
					</AdminSettingField>

					<AdminSettingField label={$i18n.t('Features (one per line)')}>
						<textarea
							bind:value={editingPlan.features}
							rows="4"
							class="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-850 text-gray-800 dark:text-gray-200 text-xs outline-none resize-none"
						></textarea>
					</AdminSettingField>

					<div class="flex items-center justify-between pt-2">
						<label
							class="flex items-center gap-2 cursor-pointer text-xs text-gray-700 dark:text-gray-300"
						>
							<input type="checkbox" bind:checked={editingPlan.is_active} class="rounded" />
							<span>{$i18n.t('Plan is Active')}</span>
						</label>

						<div class="flex items-center gap-2">
							<button
								type="button"
								on:click={() => (editingPlan = null)}
								class="px-3 py-1.5 text-xs rounded-lg bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700 transition"
							>
								{$i18n.t('Cancel')}
							</button>
							<button
								type="button"
								disabled={saving}
								on:click={savePlan}
								class="px-3 py-1.5 text-xs rounded-lg bg-black text-white dark:bg-white dark:text-black font-medium hover:opacity-90 transition disabled:opacity-50 inline-flex items-center gap-1.5"
							>
								{#if saving}
									<Spinner className="size-3" />
								{/if}
								<span>{$i18n.t('Save Plan')}</span>
							</button>
						</div>
					</div>
				</div>
			</AdminSettingSection>
		{:else}
			<!-- Plans List -->
			<AdminSettingSection title={$i18n.t('Subscription Plans')}>
				<div class="flex justify-between items-center mb-3">
					<p class="text-xs text-gray-500">
						{$i18n.t(
							'Manage subscription tiers, prices, and rate limits. All updates sync instantly to checkout.'
						)}
					</p>
					<button
						type="button"
						on:click={startNewPlan}
						class="px-3 py-1.5 text-xs rounded-lg bg-black text-white dark:bg-white dark:text-black font-medium hover:opacity-90 transition flex items-center gap-1.5 shadow-xs"
					>
						+ {$i18n.t('Add New Plan')}
					</button>
				</div>

				<div class="space-y-3">
					{#each plans as plan (plan.id)}
						<div
							class="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/60 dark:bg-gray-850/40 flex items-center justify-between gap-4 transition hover:border-gray-300 dark:hover:border-gray-700"
						>
							<div class="space-y-1">
								<div class="flex items-center gap-2">
									<span class="font-semibold text-sm text-gray-900 dark:text-gray-100"
										>{plan.name}</span
									>
									<span
										class="px-2 py-0.5 rounded-full text-[0.625rem] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
									>
										{plan.tier_name || 'Tier'}
									</span>
									{#if plan.badge}
										<span
											class="px-2 py-0.5 rounded-full text-[0.625rem] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
										>
											{plan.badge}
										</span>
									{/if}
								</div>
								<div class="text-xs text-gray-500 dark:text-gray-400">
									{plan.duration_days} روز · {plan.price_tomans > 0
										? `${formatNumber(plan.price_tomans)} تومان`
										: 'رایگان'}
								</div>
								{#if plan.description}
									<p class="text-xs text-gray-400 dark:text-gray-500 line-clamp-1">
										{plan.description}
									</p>
								{/if}
							</div>

							<div class="flex items-center gap-2">
								<button
									type="button"
									on:click={() => startEdit(plan)}
									class="px-2.5 py-1 text-xs rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium transition"
								>
									{$i18n.t('Edit')}
								</button>
								<button
									type="button"
									on:click={() => deletePlan(plan.id)}
									class="px-2.5 py-1 text-xs rounded-lg text-red-600 dark:text-red-400 hover:bg-red-500/10 transition"
								>
									{$i18n.t('Delete')}
								</button>
							</div>
						</div>
					{/each}
				</div>
			</AdminSettingSection>
		{/if}
	</div>
</div>
