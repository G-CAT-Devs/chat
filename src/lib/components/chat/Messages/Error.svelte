<script lang="ts">
	import { getContext } from 'svelte';
	import type { Writable } from 'svelte/store';
	import Info from '$lib/components/icons/Info.svelte';
	import { showSettings } from '$lib/stores';
	import { ERROR_CODE_TRANSLATIONS } from '$lib/utils/quota';

	const i18n: Writable<any> = getContext('i18n');

	export let content: unknown = '';

	interface ParsedError {
		message: string;
		code?: string;
		reset_at?: string;
		retry_after?: number;
		action?: string;
		action_url?: string;
		isQuotaRelated: boolean;
	}

	const parseError = (value: unknown): ParsedError => {
		let raw: any = value;

		if (typeof raw === 'string') {
			const trimmed = raw.trim();
			if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
				try {
					raw = JSON.parse(trimmed);
				} catch {
					// keep as string
				}
			}
		}

		if (typeof raw === 'object' && raw !== null) {
			const errObj = raw.error || raw.detail?.error || raw.detail || raw;

			const code = typeof errObj === 'object' && errObj !== null ? errObj.code : undefined;
			const type = typeof errObj === 'object' && errObj !== null ? errObj.type : undefined;
			const reset_at = typeof errObj === 'object' && errObj !== null ? errObj.reset_at : undefined;
			const retry_after =
				typeof errObj === 'object' && errObj !== null ? errObj.retry_after : undefined;
			const action = typeof errObj === 'object' && errObj !== null ? errObj.action : undefined;
			const action_url =
				typeof errObj === 'object' && errObj !== null
					? errObj.action_url || 'https://ai.gcat.ir/portal/dashboard/subscription'
					: 'https://ai.gcat.ir/portal/dashboard/subscription';

			const codeStr = String(code || '').toLowerCase();
			const isQuotaRelated =
				codeStr.includes('budget') ||
				codeStr.includes('quota') ||
				codeStr.includes('plan') ||
				codeStr.includes('rate_limit') ||
				String(type || '').toLowerCase() === 'quota_exceeded' ||
				action === 'upgrade';

			let mainMsg = '';
			if (code && ERROR_CODE_TRANSLATIONS[code]) {
				mainMsg = ERROR_CODE_TRANSLATIONS[code];
			} else if (
				typeof errObj === 'object' &&
				errObj !== null &&
				typeof errObj.message === 'string'
			) {
				mainMsg = errObj.message;
			} else if (typeof raw.message === 'string') {
				mainMsg = raw.message;
			} else if (typeof raw.detail === 'string') {
				mainMsg = raw.detail;
			} else {
				mainMsg = typeof raw === 'string' ? raw : JSON.stringify(raw);
			}

			if (reset_at) {
				try {
					const dateStr = new Date(reset_at).toLocaleString();
					mainMsg += ` (${$i18n.t('Resets at')}: ${dateStr})`;
				} catch {
					mainMsg += ` (${$i18n.t('Resets at')}: ${reset_at})`;
				}
			} else if (retry_after) {
				mainMsg += ` (${$i18n.t('Retry after')}: ${retry_after}s)`;
			}

			return {
				message: mainMsg || $i18n.t('Error submitting message'),
				code,
				reset_at,
				retry_after,
				action,
				action_url,
				isQuotaRelated
			};
		}

		return {
			message:
				typeof value === 'string'
					? value
					: JSON.stringify(value) || $i18n.t('Error submitting message'),
			isQuotaRelated: false
		};
	};

	$: parsed = parseError(content);
</script>

<div
	class="my-1.5 flex w-full flex-col items-start gap-2 rounded-2xl bg-black/[0.03] p-3 text-gray-700 dark:bg-white/[0.04] dark:text-gray-300"
>
	<div class="flex w-full items-start gap-2">
		<Info className="mt-0.5 size-4 shrink-0 text-red-500 dark:text-red-400" strokeWidth="1.8" />
		<div class="min-w-0 flex-1 break-words text-[0.8125rem] leading-5 font-normal">
			{parsed.message}
		</div>
	</div>

	{#if parsed.isQuotaRelated}
		<div class="mt-1 flex flex-wrap items-center gap-2 pl-6">
			{#if parsed.action_url}
				<a
					href={parsed.action_url}
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center gap-1.5 rounded-lg bg-black px-3 py-1.5 text-xs font-medium text-white transition hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
				>
					<span>{$i18n.t('Upgrade / View Plan')}</span>
				</a>
			{/if}
			<button
				type="button"
				class="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
				on:click={() => showSettings.set('plan')}
			>
				<span>{$i18n.t('View Usage')}</span>
			</button>
		</div>
	{/if}
</div>
