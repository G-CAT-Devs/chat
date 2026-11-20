<script lang="ts">
	import { getContext } from 'svelte';
	import type { Writable } from 'svelte/store';
	import { toast } from 'svelte-sonner';
	import { broadcastNotification } from '$lib/apis/notifications/broadcast';
	import Spinner from '$lib/components/common/Spinner.svelte';

	const i18n: Writable<any> = getContext('i18n');

	let title = 'اعلان سیستم';
	let content = '';
	let url = '';
	let playSound = true;
	let sending = false;

	const handleSend = async () => {
		if (!content.trim()) {
			toast.error($i18n.t('Content is required'));
			return;
		}

		sending = true;
		try {
			await broadcastNotification(localStorage.token, {
				title: title.trim() || 'اعلان',
				content: content.trim(),
				url: url.trim() || undefined,
				playSound
			});
			toast.success($i18n.t('Notification broadcasted successfully'));
			content = '';
			url = '';
		} catch (err) {
			toast.error(err instanceof Error ? err.message : String(err));
		} finally {
			sending = false;
		}
	};
</script>

<div
	class="rounded-2xl border border-gray-100 dark:border-gray-850 p-4 space-y-3 bg-gray-50/50 dark:bg-gray-900/40"
>
	<div class="space-y-1">
		<div class="font-medium text-xs text-gray-800 dark:text-gray-200">
			{$i18n.t('Broadcast Live Notification')}
		</div>
		<div class="text-[0.6875rem] text-gray-400 dark:text-gray-500">
			{$i18n.t('Send an instant toast notification to all currently online users via websocket.')}
		</div>
	</div>

	<div class="space-y-2 text-xs">
		<div>
			<label for="broadcast-title" class="block mb-1 text-gray-500 dark:text-gray-400"
				>{$i18n.t('Title')}</label
			>
			<input
				id="broadcast-title"
				type="text"
				bind:value={title}
				placeholder="عنوان اعلان"
				class="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-850 text-gray-800 dark:text-gray-200 outline-none"
			/>
		</div>

		<div>
			<label for="broadcast-content" class="block mb-1 text-gray-500 dark:text-gray-400"
				>{$i18n.t('Message')}</label
			>
			<textarea
				id="broadcast-content"
				bind:value={content}
				placeholder="متن اعلان را بنویسید..."
				rows="2"
				class="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-850 text-gray-800 dark:text-gray-200 outline-none resize-none"
			></textarea>
		</div>

		<div>
			<label for="broadcast-url" class="block mb-1 text-gray-500 dark:text-gray-400"
				>{$i18n.t('Action URL (Optional)')}</label
			>
			<input
				id="broadcast-url"
				type="text"
				bind:value={url}
				placeholder="/subscription یا https://..."
				class="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-850 text-gray-800 dark:text-gray-200 outline-none"
			/>
		</div>

		<div class="flex items-center gap-2 pt-1">
			<input type="checkbox" id="broadcast-sound" bind:checked={playSound} class="rounded" />
			<label for="broadcast-sound" class="text-gray-600 dark:text-gray-300 cursor-pointer">
				{$i18n.t('Play notification sound on user device')}
			</label>
		</div>
	</div>

	<div class="flex justify-end pt-2">
		<button
			type="button"
			disabled={sending}
			on:click={handleSend}
			class="px-3 py-1.5 rounded-lg text-xs font-medium bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 transition disabled:opacity-50 inline-flex items-center gap-1.5"
		>
			{#if sending}
				<Spinner className="size-3.5" />
			{/if}
			<span>{$i18n.t('Send Instant Notification')}</span>
		</button>
	</div>
</div>
