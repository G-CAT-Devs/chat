<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	import {
		getPaymentsCatalog,
		getPaymentsStatus,
		getPaymentHistory,
		getInvoiceUrl,
		type PaymentsCatalog,
		type PaymentsStatus,
		type SubscriptionPlan,
		type PaymentHistoryItem
	} from '$lib/apis/subscriptions';

	import { getSessionUser } from '$lib/apis/auths';
	import { GCAT_PORTAL_ORIGIN, GCAT_SUPPORT_URL } from '$lib/constants';
	import { showSidebar, user } from '$lib/stores';
	import { copyToClipboard } from '$lib/utils';
	import Spinner from '$lib/components/common/Spinner.svelte';

	import Badge from '$lib/components/common/Badge.svelte';
	import SparklesIcon from '$lib/components/layout/Sidebar/icons/Sparkles.svelte';

	const i18n = getContext('i18n');

	let catalog = $state.raw<PaymentsCatalog | null>(null);
	let status = $state.raw<PaymentsStatus | null>(null);
	let catalogError = $state<string | null>(null);
	let statusError = $state<string | null>(null);
	let loadingCatalog = $state(true);
	let loadingStatus = $state(false);
	let pollTimer: ReturnType<typeof setInterval> | null = null;
	let pollCount = 0;
	const MAX_POLLS = 5;

	let historyItems = $state<PaymentHistoryItem[]>([]);
	let loadingHistory = $state(false);
	let historyError = $state<string | null>(null);
	let copiedOrderId = $state(false);

	const orderId = $derived($page.url.searchParams.get('order'));
	const supportUrl = $derived(catalog?.supportUrl || GCAT_SUPPORT_URL);
	const activationDone = $derived(
		Boolean(status?.activationProcessed) || Boolean(status?.subscription)
	);
	const constrainForSidebar = $derived(
		['user', 'admin'].includes($user?.role ?? '') && $showSidebar
	);

	const formatTomans = (amount: number) => {
		try {
			return new Intl.NumberFormat('fa-IR').format(amount);
		} catch {
			return String(amount);
		}
	};

	const formatDuration = (days: number) => {
		if (days % 30 === 0) {
			const months = days / 30;
			return months === 1 ? '30 روز / 1 month' : `${days} روز / ${months} months`;
		}
		return `${days} روز / ${days} days`;
	};

	const stopPolling = () => {
		if (pollTimer) {
			clearInterval(pollTimer);
			pollTimer = null;
		}
	};

	const shouldKeepPolling = (snapshot: PaymentsStatus | null) => {
		if (!snapshot?.order) return false;
		if (snapshot.activationProcessed || snapshot.subscription) return false;
		const s = snapshot.order.status;
		return s === 'pending' || s === 'creating' || s === 'paid' || s === 'review';
	};

	const startPolling = (id: string) => {
		stopPolling();
		pollCount = 0;
		pollTimer = setInterval(async () => {
			pollCount += 1;
			try {
				const next = await getPaymentsStatus(id);
				status = next;
				statusError = null;
				if (!shouldKeepPolling(next) || pollCount >= MAX_POLLS) {
					stopPolling();
				}
			} catch (err) {
				statusError = err instanceof Error ? err.message : String(err);
				if (pollCount >= MAX_POLLS) {
					stopPolling();
				}
			}
		}, 4000);
	};

	const refreshStatus = async (id: string) => {
		loadingStatus = true;
		statusError = null;
		try {
			const next = await getPaymentsStatus(id);
			status = next;
		} catch (err) {
			statusError = err instanceof Error ? err.message : String(err);
		} finally {
			loadingStatus = false;
		}
	};

	const copyOrderId = async (id: string) => {
		await copyToClipboard(id);
		copiedOrderId = true;
		setTimeout(() => {
			copiedOrderId = false;
		}, 2000);
	};

	const checkoutUrlFor = (plan: SubscriptionPlan) => {
		const base = catalog?.checkoutBaseUrl?.replace(/\/$/, '') || `${GCAT_PORTAL_ORIGIN}/portal/pay`;
		const returnUrl = `${window.location.origin}/subscription`;
		const url = new URL(base);
		url.searchParams.set('plan', plan.id);
		url.searchParams.set('return', returnUrl);
		return url.toString();
	};

	const payWithBank = (plan: SubscriptionPlan) => {
		window.location.href = checkoutUrlFor(plan);
	};

	const orderMessage = (snapshot: PaymentsStatus): string => {
		const order = snapshot.order;
		if (!order) return '';

		if (order.status === 'paid') {
			if (snapshot.activationProcessed || snapshot.subscription) {
				return 'پرداخت موفق و اشتراک با موفقیت فعال شد.';
			}
			return 'پرداخت موفق؛ فعال‌سازی در حال انجام است. لطفاً شکیبا باشید و دوباره پرداخت نکنید.';
		}
		if (order.status === 'pending') {
			return 'در انتظار تأیید بانک؛ اگر مبلغ از حساب شما کسر شده است، وضعیت را با دکمه زیر بررسی کنید.';
		}
		if (order.status === 'review') {
			return 'پرداخت شما در بازبینی است؛ لطفاً با پشتیبانی تماس بگیرید و شناسه سفارش را ارائه دهید.';
		}
		if (order.status === 'cancelled') {
			return 'این سفارش لغو شده است (فقط محلی). لطفاً تب‌های بانکی قبلی را ببندید. در صورت کسر وجه با پشتیبانی تماس بگیرید.';
		}
		if (order.status === 'failed') {
			return 'پرداخت انجام نشد. می‌توانید دوباره برای پرداخت تلاش کنید.';
		}
		if (order.status === 'creating') {
			return 'درگاه بانکی در حال آماده‌سازی است…';
		}
		return 'در انتظار تأیید پرداخت بانکی…';
	};

	onMount(() => {
		let cancelled = false;
		let statusRequest = 0;
		let lastOrderId: string | null | undefined = undefined;

		(async () => {
			loadingCatalog = true;
			catalogError = null;
			try {
				const next = await getPaymentsCatalog();
				if (!cancelled) catalog = next;
			} catch (err) {
				if (!cancelled) {
					catalogError = err instanceof Error ? err.message : String(err);
				}
			} finally {
				if (!cancelled) loadingCatalog = false;
			}
		})();

		(async () => {
			loadingHistory = true;
			historyError = null;
			try {
				const res = await getPaymentHistory();
				if (!cancelled) historyItems = res.items || [];
			} catch (err) {
				if (!cancelled) {
					historyError = err instanceof Error ? err.message : String(err);
				}
			} finally {
				if (!cancelled) loadingHistory = false;
			}
		})();

		const loadStatusFor = async (id: string | null) => {
			const requestId = ++statusRequest;
			stopPolling();

			if (!id) {
				status = null;
				statusError = null;
				loadingStatus = false;
				return;
			}

			loadingStatus = true;
			statusError = null;
			try {
				const next = await getPaymentsStatus(id);
				if (cancelled || requestId !== statusRequest) return;
				status = next;
				if (shouldKeepPolling(next)) {
					startPolling(id);
				}
			} catch (err) {
				if (cancelled || requestId !== statusRequest) return;
				statusError = err instanceof Error ? err.message : String(err);
			} finally {
				if (!cancelled && requestId === statusRequest) {
					loadingStatus = false;
				}
			}
		};

		const unsubscribe = page.subscribe((p) => {
			if (!browser || cancelled) return;
			const id = p.url.searchParams.get('order');
			if (id === lastOrderId) return;
			lastOrderId = id;
			void loadStatusFor(id);
		});

		return () => {
			cancelled = true;
			unsubscribe();
			stopPolling();
		};
	});
</script>

<svelte:head>
	<title>{$i18n.t('Subscription')} | GCAT</title>
</svelte:head>

<div
	class="flex flex-col w-full min-h-screen max-h-[100dvh] overflow-y-auto transition-width duration-200 ease-in-out {constrainForSidebar
		? 'md:max-w-[calc(100%-var(--sidebar-width))]'
		: ''} max-w-full text-gray-700 dark:text-gray-100"
>
	<div class="w-full max-w-3xl mx-auto px-4 py-8 md:px-6 md:py-10">
		<header class="mb-8">
			<div class="flex items-center gap-2 mb-2">
				<div
					class="size-8 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300"
				>
					<SparklesIcon className="size-4" strokeWidth="1.5" />
				</div>
				<h1 class="text-xl md:text-2xl font-medium">
					اشتراک / {$i18n.t('Subscription')}
				</h1>
			</div>
			<p class="text-sm text-gray-500 dark:text-gray-400">
				پلن مورد نظر را انتخاب کنید و از درگاه بانکی پرداخت کنید. Choose a plan and pay securely
				through the bank gateway.
			</p>
		</header>

		{#if orderId}
			<section
				class="mb-6 rounded-2xl border px-4 py-4 text-sm {activationDone
					? 'border-emerald-500/30 bg-emerald-500/5'
					: 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-850/40'}"
				role="status"
				aria-live="polite"
			>
				<div class="flex items-start justify-between gap-3">
					<div class="min-w-0">
						<div class="font-medium mb-1">وضعیت پرداخت / Payment status</div>
						{#if loadingStatus && !status}
							<div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
								<Spinner className="size-4" />
								<span>در حال بررسی… / Checking…</span>
							</div>
						{:else if statusError}
							<p class="text-red-600 dark:text-red-400">{statusError}</p>
						{:else if status?.order}
							<p class="text-gray-600 dark:text-gray-300">{orderMessage(status)}</p>
							<div
								class="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400"
							>
								<span
									>شناسه سفارش: <code
										class="font-mono bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded"
										>{status.order.id}</code
									></span
								>
								<button
									type="button"
									class="px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
									onclick={() => copyOrderId(status.order.id)}
								>
									{copiedOrderId ? 'کپی شد ✓' : 'کپی شناسه'}
								</button>
								{#if status.order.planName}
									<span>· {status.order.planName}</span>
								{/if}
							</div>

							{#if status.order.status === 'pending'}
								<div class="mt-3 flex items-center gap-2">
									<button
										type="button"
										class="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-900 text-white dark:bg-white dark:text-gray-900 hover:opacity-90 transition inline-flex items-center gap-1.5"
										disabled={loadingStatus}
										onclick={() => refreshStatus(status.order.id)}
									>
										{#if loadingStatus}
											<Spinner className="size-3" />
										{/if}
										<span>بررسی مجدد وضعیت پرداخت</span>
									</button>
								</div>
							{:else if status.order.status === 'failed'}
								<div class="mt-3">
									<button
										type="button"
										class="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-900 text-white dark:bg-white dark:text-gray-900 hover:opacity-90 transition"
										onclick={() => {
											const matchedPlan = catalog?.plans.find(
												(p) => p.name === status.order?.planName
											);
											if (matchedPlan) {
												payWithBank(matchedPlan);
											} else {
												status = null;
											}
										}}
									>
										تلاش دوباره برای پرداخت
									</button>
								</div>
							{:else if status.order.status === 'review'}
								<div class="mt-3 text-xs text-amber-700 dark:text-amber-300">
									<a
										href={supportUrl}
										target="_blank"
										rel="noopener noreferrer"
										class="underline font-medium"
									>
										ارتباط فوری با پشتیبانی جهت بازبینی سفارش
									</a>
								</div>
							{/if}

							{#if status.subscription}
								<p class="mt-2 text-xs text-emerald-700 dark:text-emerald-300">
									فعال تا / Active until: {new Date(
										status.subscription.expiresAt
									).toLocaleDateString('fa-IR')}
									({status.subscription.daysRemaining} روز باقی‌مانده / days left)
								</p>
							{/if}
						{:else}
							<p class="text-gray-500 dark:text-gray-400">
								سفارش برای این حساب یافت نشد. / No order found for this account.
							</p>
						{/if}
					</div>
					{#if shouldKeepPolling(status)}
						<Spinner className="size-4 shrink-0 mt-1" />
					{/if}
				</div>

				{#if activationDone}
					<button
						type="button"
						class="mt-4 inline-flex items-center justify-center px-4 py-2 rounded-xl text-sm font-medium bg-gray-900 text-white dark:bg-white dark:text-gray-900 hover:opacity-90 transition"
						onclick={async () => {
							try {
								const session = await getSessionUser(localStorage.token);
								if (session) user.set(session);
							} catch {
								/* continue even if refresh fails; user can tap Check Again */
							}
							await goto('/');
						}}
					>
						ادامه به گفتگو / Continue to chat
					</button>
				{:else}
					<p class="mt-3 text-xs text-gray-500 dark:text-gray-400">
						کمک نیاز دارید؟ با
						<a
							href={supportUrl}
							target="_blank"
							rel="noopener noreferrer"
							class="underline underline-offset-2 hover:text-gray-700 dark:hover:text-gray-200"
							>@gcat_org</a
						>
						در تلگرام تماس بگیرید و شناسه سفارش را بفرستید.
					</p>
				{/if}
			</section>
		{/if}

		{#if loadingCatalog}
			<div class="flex justify-center items-center py-16">
				<Spinner className="size-5" />
			</div>
		{:else if catalogError}
			<div
				class="rounded-2xl border border-red-500/30 bg-red-500/5 px-4 py-4 text-sm text-red-700 dark:text-red-300"
			>
				<p class="font-medium mb-1">بارگذاری پلن‌ها ناموفق بود / Could not load plans</p>
				<p>{catalogError}</p>
				<p class="mt-3 text-xs">
					<a
						href={supportUrl}
						target="_blank"
						rel="noopener noreferrer"
						class="underline underline-offset-2">پشتیبانی تلگرام / Telegram support</a
					>
				</p>
			</div>
		{:else if catalog}
			{#if !catalog.paymentConfigured}
				<div class="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/5 px-4 py-4 text-sm">
					<p class="font-medium">
						پرداخت آنلاین موقتاً در دسترس نیست / Online checkout unavailable
					</p>
					<p class="mt-1 text-gray-600 dark:text-gray-300">
						برای خرید با
						<a
							href={supportUrl}
							target="_blank"
							rel="noopener noreferrer"
							class="underline underline-offset-2 font-medium">@gcat_org</a
						>
						تماس بگیرید.
					</p>
				</div>
			{/if}

			{#if catalog.plans.length === 0}
				<p class="text-sm text-gray-500 dark:text-gray-400">
					پلنی برای نمایش وجود ندارد. / No plans available right now.
				</p>
			{:else}
				<ul class="flex flex-col gap-4">
					{#each catalog.plans as plan (plan.id)}
						<li
							class="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 px-4 py-4 md:px-5 md:py-5"
						>
							<div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
								<div class="min-w-0">
									<div class="flex flex-wrap items-center gap-2 mb-1">
										<h2 class="text-base md:text-lg font-medium">{plan.name}</h2>
										{#if plan.badge}
											<Badge type="info" content={plan.badge} />
										{/if}
									</div>
									{#if plan.description}
										<p class="text-sm text-gray-500 dark:text-gray-400 mb-2">
											{plan.description}
										</p>
									{/if}
									<p class="text-xs text-gray-400 dark:text-gray-500">
										مدت / Duration: {formatDuration(plan.durationDays)}
									</p>
								</div>
								<div class="shrink-0 text-left sm:text-right">
									<div class="text-lg md:text-xl font-medium tabular-nums">
										{formatTomans(plan.priceTomans)}
										<span class="text-sm font-normal text-gray-500 dark:text-gray-400">تومان</span>
									</div>
									<div class="text-[0.6875rem] text-gray-400 dark:text-gray-500">Tomans</div>
								</div>
							</div>

							{#if plan.features?.length}
								<ul class="mt-3 space-y-1.5">
									{#each plan.features as feature, featureIdx (featureIdx)}
										<li class="flex gap-2 text-sm text-gray-600 dark:text-gray-300">
											<span
												class="mt-1.5 size-1.5 rounded-full bg-gray-400 dark:bg-gray-500 shrink-0"
												aria-hidden="true"
											></span>
											<span>{feature}</span>
										</li>
									{/each}
								</ul>
							{/if}

							<div class="mt-4 flex flex-wrap items-center gap-3">
								<button
									type="button"
									class="inline-flex items-center justify-center px-4 py-2 rounded-xl text-sm font-medium bg-gray-900 text-white dark:bg-white dark:text-gray-900 hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
									disabled={!catalog.paymentConfigured}
									onclick={() => payWithBank(plan)}
								>
									پرداخت با درگاه بانکی / Pay with bank gateway
								</button>
							</div>
						</li>
					{/each}
				</ul>
			{/if}

			<!-- Payment History & Invoices -->
			<section class="mt-12 pt-8 border-t border-gray-100 dark:border-gray-800">
				<h2 class="text-lg font-medium mb-4">تاریخچه پرداخت و فاکتورها / Payment History</h2>

				{#if loadingHistory}
					<div class="flex items-center gap-2 text-sm text-gray-500 py-4">
						<Spinner className="size-4" />
						<span>در حال بارگذاری سوابق پرداخت…</span>
					</div>
				{:else if historyError}
					<div
						class="rounded-xl border border-gray-200 dark:border-gray-800 p-4 text-sm text-gray-500"
					>
						سوابق پرداخت موقتاً در دسترس نیست.
					</div>
				{:else if historyItems.length === 0}
					<div
						class="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/40 p-6 text-center text-sm text-gray-500"
					>
						هنوز هیچ پرداختی برای این حساب ثبت نشده است.
					</div>
				{:else}
					<div class="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800">
						<table class="w-full text-xs text-right">
							<thead
								class="bg-gray-50 dark:bg-gray-850/50 text-gray-500 border-b border-gray-200 dark:border-gray-800"
							>
								<tr>
									<th class="p-3 font-medium">تاریخ</th>
									<th class="p-3 font-medium">پلن</th>
									<th class="p-3 font-medium">مبلغ</th>
									<th class="p-3 font-medium">وضعیت</th>
									<th class="p-3 font-medium">فاکتور</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-gray-100 dark:divide-gray-800">
								{#each historyItems as item (item.id)}
									<tr class="hover:bg-gray-50/50 dark:hover:bg-gray-850/30 transition">
										<td class="p-3 text-gray-500">
											{new Date(item.createdAt).toLocaleDateString('fa-IR')}
										</td>
										<td class="p-3 font-medium text-gray-800 dark:text-gray-200">
											{item.planName}
										</td>
										<td class="p-3 tabular-nums">
											{formatTomans(item.amountTomans)} تومان
										</td>
										<td class="p-3">
											{#if item.status === 'paid'}
												<span class="text-emerald-600 dark:text-emerald-400 font-medium">موفق</span>
											{:else if item.status === 'pending'}
												<span class="text-amber-600 dark:text-amber-400">در انتظار</span>
											{:else if item.status === 'review'}
												<span class="text-blue-600 dark:text-blue-400">در بازبینی</span>
											{:else}
												<span class="text-red-500 dark:text-red-400">ناموفق / لغو</span>
											{/if}
										</td>
										<td class="p-3">
											{#if item.status === 'paid' && item.invoiceNumber}
												<a
													href={getInvoiceUrl(item.invoiceNumber)}
													target="_blank"
													rel="noopener noreferrer"
													class="underline text-blue-600 dark:text-blue-400 hover:opacity-80"
												>
													دانلود فاکتور
												</a>
											{:else}
												<span class="text-gray-400">-</span>
											{/if}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</section>

			<footer
				class="mt-10 pt-6 border-t border-gray-100 dark:border-gray-800 text-sm text-gray-500 dark:text-gray-400"
			>
				<p>
					سوال یا مشکل در پرداخت؟ / Need help with payment?
					<a
						href={supportUrl}
						target="_blank"
						rel="noopener noreferrer"
						class="ms-1 underline underline-offset-2 text-gray-700 dark:text-gray-200 hover:opacity-80"
						>تلگرام @gcat_org</a
					>
				</p>
			</footer>
		{/if}
	</div>
</div>
