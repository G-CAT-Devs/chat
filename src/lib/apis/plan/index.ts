import { WEBUI_API_BASE_URL } from '$lib/constants';

export interface PlanLimits {
	daily_tokens?: number;
	weekly_tokens?: number;
	monthly_tokens?: number;
	daily_cost_cents?: number;
	weekly_cost_cents?: number;
	monthly_cost_cents?: number;
}

export interface PlanUsageStats {
	daily_tokens?: number;
	weekly_tokens?: number;
	monthly_tokens?: number;
	daily_cost_cents?: number;
	weekly_cost_cents?: number;
	monthly_cost_cents?: number;
}

export interface PlanResponse {
	available: boolean;
	reason?: string;
	mode?: 'subscription' | 'payg' | 'free';
	plan?: {
		id?: string;
		name?: string;
		status?: 'active' | 'expired' | 'suspended';
		expires_at?: string;
		models?: string[] | string;
	};
	limits?: PlanLimits;
	usage?: PlanUsageStats;
	reset_at?: {
		daily?: string;
		weekly?: string;
		monthly?: string;
	};
	wallet_cents?: number;
	stale?: boolean;
}

export const getPlan = async (token: string): Promise<PlanResponse> => {
	try {
		const res = await fetch(`${WEBUI_API_BASE_URL}/plan`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			}
		});
		if (!res.ok) {
			return { available: false, reason: 'error' };
		}
		return await res.json();
	} catch (err) {
		console.error('Failed to fetch plan:', err);
		return { available: false, reason: 'network' };
	}
};
