<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	import {
		getPaymentsCatalog,
		getPaymentsStatus,
		type PaymentsCatalog,
		type PaymentsStatus,
		type SubscriptionPlan
	} from '$lib/apis/subscriptions';
	import { getSessionUser } from '$lib/apis/auths';
	import { GCAT_PORTAL_ORIGIN, GCAT_SUPPORT_URL } from '$lib/constants';
	import { showSidebar, user } from '$lib/stores';
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
		pollTimer = setInterval(async () => {
			try {
				const next = await getPaymentsStatus(id);
				status = next;
				statusError = null;
				if (!shouldKeepPolling(next)) {
					stopPolling();
				}
			} catch (err) {
				statusError = err instanceof Error ? err.message : String(err);
			}
		}, 4000);
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
				return 'پرداخت تأیید شد و اشتراک فعال است. / Payment verified — your subscription is active.';
			}
			return 'پرداخت ثبت شد؛ فعال‌سازی در حال انجام است. دوباره پرداخت نکنید. / Payment recorded; activation is still processing. Do not pay again.';
		}
		if (order.status === 'review') {
			return 'این پرداخت نیاز به بررسی دستی دارد. دوباره پرداخت نکنید. / This payment needs manual review. Do not pay again.';
		}
		if (order.status === 'cancelled') {
			return 'این سفارش لغو شده است. اگر مبلغی کسر شده، با پشتیبانی تماس بگیرید. / This order was cancelled. If money was deducted, contact support.';
		}
		if (order.status === 'failed') {
			return 'شروع پرداخت ناموفق بود. می‌توانید دوباره تلاش کنید. / Checkout failed to start. You can try again.';
		}
		if (order.status === 'creating') {
			return 'درگاه در حال آماده‌سازی است… / Checkout is being prepared…';
		}
		return 'در انتظار تأیید پرداخت بانکی… / Waiting for bank payment verification…';
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
							<p class="mt-2 text-xs text-gray-400 dark:text-gray-500 break-all">
								سفارش / Order: {status.order.id}
								{#if status.order.planName}
									· {status.order.planName}
								{/if}
							</p>
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
