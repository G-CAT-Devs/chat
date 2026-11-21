import { WEBUI_API_BASE_URL } from '$lib/constants';

export interface PlanLimits {
	five_hour_tokens?: number;
	daily_tokens?: number;
	weekly_tokens?: number;
	monthly_tokens?: number;
	daily_cost_cents?: number;
	weekly_cost_cents?: number;
	monthly_cost_cents?: number;
	rpm?: number;
}

export interface PlanUsageStats {
	five_hour_tokens?: number;
	five_hour_percent?: number;
	daily_tokens?: number;
	weekly_tokens?: number;
	weekly_percent?: number;
	monthly_tokens?: number;
	daily_cost_cents?: number;
	weekly_cost_cents?: number;
	monthly_cost_cents?: number;
	daily?: { used_usd?: number; limit_usd?: number; percent?: number; reset_at?: string };
	weekly?: { used_usd?: number; limit_usd?: number; percent?: number; reset_at?: string };
	monthly?: { used_usd?: number; limit_usd?: number; percent?: number; reset_at?: string };
}

export interface PlanResponse {
	available: boolean;
	reason?: string;
	mode?: 'subscription' | 'payg' | 'free';
	plan?: {
		id?: string;
		name?: string;
		tier?: 'Free' | 'Plus' | 'Pro' | 'Max' | 'Researchers' | string;
		status?: 'active' | 'expired' | 'suspended';
		expires_at?: string;
		models?: string[] | string;
		free_resets_left?: number;
		can_upgrade?: boolean;
	};
	limits?: PlanLimits;
	usage?: PlanUsageStats;
	reset_at?: {
		five_hour?: string;
		daily?: string;
		weekly?: string;
		monthly?: string;
	};
	wallet_cents?: number;
	stale?: boolean;
	links?: {
		upgrade?: string;
	};
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
