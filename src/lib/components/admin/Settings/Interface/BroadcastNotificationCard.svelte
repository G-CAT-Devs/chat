<script lang="ts">
	import { onMount, getContext } from 'svelte';
	import type { Writable } from 'svelte/store';
	import { toast } from 'svelte-sonner';
	import {
		broadcastNotification,
		getScheduledNotification,
		saveScheduledNotification,
		type ScheduledNotificationConfig
	} from '$lib/apis/notifications/broadcast';
	import Spinner from '$lib/components/common/Spinner.svelte';

	const i18n: Writable<any> = getContext('i18n');

	let activeTab: 'instant' | 'scheduled' = 'instant';

	// Instant Broadcast
	let title = 'اعلان سیستم';
	let content = '';
	let url = '';
	let playSound = true;
	let sending = false;

	// Scheduled Login Toast
	let scheduledEnabled = false;
	let scheduledTitle = 'اعلان سیستم';
	let scheduledContent = '';
	let scheduledUrl = '';
	let scheduledStartTime = '08:00';
	let scheduledEndTime = '12:00';
	let scheduledPlaySound = true;
	let savingScheduled = false;

	onMount(async () => {
		try {
			const config = await getScheduledNotification(localStorage.token);
			if (config) {
				scheduledEnabled = config.enabled ?? false;
				scheduledTitle = config.title || 'اعلان سیستم';
				scheduledContent = config.content || '';
				scheduledUrl = config.url || '';
				scheduledStartTime = config.startTime || '08:00';
				scheduledEndTime = config.endTime || '12:00';
				scheduledPlaySound = config.playSound ?? true;
			}
		} catch (err) {
			console.error('Failed to load scheduled notification config:', err);
		}
	});

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

	const handleSaveScheduled = async () => {
		if (scheduledEnabled && !scheduledContent.trim()) {
			toast.error($i18n.t('Content is required when scheduling is enabled'));
			return;
		}

		savingScheduled = true;
		try {
			await saveScheduledNotification(localStorage.token, {
				enabled: scheduledEnabled,
				title: scheduledTitle.trim() || 'اعلان',
				content: scheduledContent.trim(),
				url: scheduledUrl.trim() || undefined,
				startTime: scheduledStartTime,
				endTime: scheduledEndTime,
				playSound: scheduledPlaySound
			});
			toast.success($i18n.t('Scheduled notification settings saved'));
		} catch (err) {
			toast.error(err instanceof Error ? err.message : String(err));
		} finally {
			savingScheduled = false;
		}
	};
</script>

<div
	class="rounded-2xl border border-gray-100 dark:border-gray-850 p-4 space-y-3 bg-gray-50/50 dark:bg-gray-900/40"
>
	<!-- Sub-header & Tabs -->
	<div class="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-3">
		<div class="space-y-0.5">
			<div class="font-medium text-xs text-gray-800 dark:text-gray-200">
				{$i18n.t('User Notifications')}
			</div>
			<div class="text-[0.6875rem] text-gray-400 dark:text-gray-500">
				{$i18n.t('Send instant live toasts or configure scheduled login greetings.')}
			</div>
		</div>

		<div class="flex items-center gap-1 bg-gray-200/60 dark:bg-gray-800 p-0.5 rounded-lg text-xs">
			<button
				type="button"
				class="px-2.5 py-1 rounded-md transition font-medium {activeTab === 'instant'
					? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
					: 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'}"
				on:click={() => (activeTab = 'instant')}
			>
				{$i18n.t('Instant Broadcast')}
			</button>
			<button
				type="button"
				class="px-2.5 py-1 rounded-md transition font-medium {activeTab === 'scheduled'
					? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
					: 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'}"
				on:click={() => (activeTab = 'scheduled')}
			>
				{$i18n.t('Scheduled Login Toast')}
			</button>
		</div>
	</div>

	{#if activeTab === 'instant'}
		<!-- Instant Broadcast View -->
		<div class="space-y-2 text-xs pt-1">
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
	{:else}
		<!-- Scheduled Login Toast View -->
		<div class="space-y-3 text-xs pt-1">
			<div
				class="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-gray-850 border border-gray-200 dark:border-gray-800"
			>
				<div>
					<div class="font-medium text-gray-800 dark:text-gray-200">
						{$i18n.t('Enable Scheduled Login Toast')}
					</div>
					<div class="text-[0.6875rem] text-gray-400">
						{$i18n.t('Show automatically when users open chat during specified hours.')}
					</div>
				</div>
				<input
					type="checkbox"
					bind:checked={scheduledEnabled}
					class="size-4 rounded accent-primary cursor-pointer"
				/>
			</div>

			<div class="grid grid-cols-2 gap-3">
				<div>
					<label for="sched-start" class="block mb-1 text-gray-500 dark:text-gray-400"
						>{$i18n.t('Start Time')}</label
					>
					<input
						id="sched-start"
						type="time"
						bind:value={scheduledStartTime}
						class="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-850 text-gray-800 dark:text-gray-200 outline-none"
					/>
				</div>
				<div>
					<label for="sched-end" class="block mb-1 text-gray-500 dark:text-gray-400"
						>{$i18n.t('End Time')}</label
					>
					<input
						id="sched-end"
						type="time"
						bind:value={scheduledEndTime}
						class="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-850 text-gray-800 dark:text-gray-200 outline-none"
					/>
				</div>
			</div>

			<div>
				<label for="sched-title" class="block mb-1 text-gray-500 dark:text-gray-400"
					>{$i18n.t('Title')}</label
				>
				<input
					id="sched-title"
					type="text"
					bind:value={scheduledTitle}
					placeholder="مثلاً: صبح بخیر!"
					class="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-850 text-gray-800 dark:text-gray-200 outline-none"
				/>
			</div>

			<div>
				<label for="sched-content" class="block mb-1 text-gray-500 dark:text-gray-400"
					>{$i18n.t('Message')}</label
				>
				<textarea
					id="sched-content"
					bind:value={scheduledContent}
					placeholder="پیام خوش‌آمدگویی یا اطلاعیه زمان‌بندی‌شده..."
					rows="2"
					class="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-850 text-gray-800 dark:text-gray-200 outline-none resize-none"
				></textarea>
			</div>

			<div>
				<label for="sched-url" class="block mb-1 text-gray-500 dark:text-gray-400"
					>{$i18n.t('Action URL (Optional)')}</label
				>
				<input
					id="sched-url"
					type="text"
					bind:value={scheduledUrl}
					placeholder="/subscription یا https://..."
					class="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-850 text-gray-800 dark:text-gray-200 outline-none"
				/>
			</div>

			<div class="flex items-center gap-2 pt-1">
				<input type="checkbox" id="sched-sound" bind:checked={scheduledPlaySound} class="rounded" />
				<label for="sched-sound" class="text-gray-600 dark:text-gray-300 cursor-pointer">
					{$i18n.t('Play notification sound on user device')}
				</label>
			</div>

			<div class="flex justify-end pt-2">
				<button
					type="button"
					disabled={savingScheduled}
					on:click={handleSaveScheduled}
					class="px-3 py-1.5 rounded-lg text-xs font-medium bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 transition disabled:opacity-50 inline-flex items-center gap-1.5"
				>
					{#if savingScheduled}
						<Spinner className="size-3.5" />
					{/if}
					<span>{$i18n.t('Save Scheduled Notification')}</span>
				</button>
			</div>
		</div>
	{/if}
</div>
