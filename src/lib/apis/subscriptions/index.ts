import { GCAT_PAYMENTS_CATALOG_URL, GCAT_PAYMENTS_STATUS_URL } from '$lib/constants';

export type SubscriptionPlan = {
	id: string;
	name: string;
	description: string | null;
	badge: string | null;
	durationDays: number;
	priceTomans: number;
	features: string[];
	tierName: string | null;
};

export type PaymentsCatalog = {
	paymentConfigured: boolean;
	checkoutBaseUrl: string;
	supportUrl: string;
	plans: SubscriptionPlan[];
};

export type PaymentOrderStatus = {
	id: string;
	planName: string;
	status: string;
	tierSyncStatus: string | null;
	paidAt: string | null;
};

export type ActiveSubscriptionStatus = {
	planName: string;
	tierName: string | null;
	expiresAt: string;
	daysRemaining: number;
};

export type PaymentHistoryItem = {
	id: string;
	orderId: string;
	amountTomans: number;
	planName: string;
	method: string;
	status: 'paid' | 'failed' | 'pending' | 'review' | 'cancelled';
	invoiceNumber?: string | null;
	createdAt: string;
};

export type PaymentHistoryResponse = {
	items: PaymentHistoryItem[];
	total: number;
};

export type PaymentsStatus = {
	paymentConfigured: boolean;
	syncChatTiers: boolean;
	activationProcessed: boolean;
	subscription: ActiveSubscriptionStatus | null;
	order: PaymentOrderStatus | null;
	error?: string;
};

const jsonHeaders = {
	Accept: 'application/json'
};

async function parseError(res: Response): Promise<string> {
	try {
		const body = await res.json();
		if (typeof body?.error === 'string') return body.error;
		if (typeof body?.detail === 'string') return body.detail;
	} catch {
		/* ignore */
	}
	return res.statusText || 'Request failed';
}

/** Public plan catalog from ai.gcat.ir (CORS + credentials). */
export const getPaymentsCatalog = async (): Promise<PaymentsCatalog> => {
	const res = await fetch(GCAT_PAYMENTS_CATALOG_URL, {
		method: 'GET',
		headers: jsonHeaders,
		credentials: 'include'
	});

	if (!res.ok) {
		throw new Error(await parseError(res));
	}

	return res.json();
};

/** Owner-scoped payment + subscription status (session cookie on .gcat.ir). */
export const getPaymentsStatus = async (orderId?: string | null): Promise<PaymentsStatus> => {
	const url = new URL(GCAT_PAYMENTS_STATUS_URL);
	if (orderId) {
		url.searchParams.set('order', orderId);
	}

	const res = await fetch(url.toString(), {
		method: 'GET',
		headers: jsonHeaders,
		credentials: 'include'
	});

	if (!res.ok) {
		throw new Error(await parseError(res));
	}

	return res.json();
};

/** Owner-scoped payment history from panel. */
export const getPaymentHistory = async (): Promise<PaymentHistoryResponse> => {
	const url = new URL('/api/payments/history', GCAT_PAYMENTS_STATUS_URL);
	const res = await fetch(url.toString(), {
		method: 'GET',
		headers: jsonHeaders,
		credentials: 'include'
	});

	if (!res.ok) {
		throw new Error(await parseError(res));
	}

	return res.json();
};

export const getInvoiceUrl = (invoiceNumber: string): string => {
	const url = new URL(
		`/api/payments/invoices/${encodeURIComponent(invoiceNumber)}`,
		GCAT_PAYMENTS_STATUS_URL
	);
	return url.toString();
};
