import { getPlan, type PlanResponse } from '$lib/apis/plan';

export interface QuotaStatus {
	isHighUsage: boolean; // >= 80%
	isExceeded: boolean; // >= 100%
	highestPercent: number;
	period?: 'daily' | 'weekly' | 'monthly';
	resetAt?: string;
	actionUrl?: string;
}

export const ERROR_CODE_TRANSLATIONS: Record<string, string> = {
	daily_budget_exceeded: 'سقف سهمیهٔ روزانه شما تمام شده است.',
	weekly_budget_exceeded: 'سقف سهمیهٔ هفتگی شما تمام شده است.',
	monthly_budget_exceeded: 'سقف سهمیهٔ ماهانه شما تمام شده است.',
	rate_limited: 'تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً کمی صبر کنید.',
	token_limit_exceeded: 'تعداد توکن‌های این درخواست از حد مجاز پلن شما بیشتر است.',
	model_not_in_plan: 'این مدل در پلن فعلی شما فعال نیست.',
	no_active_plan: 'شما در حال حاضر پلن فعالی ندارید.',
	insufficient_quota: 'سهمیه کافی برای انجام این عملیات وجود ندارد.'
};

export const checkQuotaStatus = async (token: string): Promise<QuotaStatus> => {
	try {
		const planData: PlanResponse = await getPlan(token);
		if (!planData || !planData.available || !planData.limits || !planData.usage) {
			return { isHighUsage: false, isExceeded: false, highestPercent: 0 };
		}

		const periods: Array<'daily' | 'weekly' | 'monthly'> = ['daily', 'weekly', 'monthly'];
		let maxPct = 0;
		let maxPeriod: 'daily' | 'weekly' | 'monthly' | undefined = undefined;
		let resetAt: string | undefined = undefined;

		for (const p of periods) {
			const limit = planData.limits[`${p}_tokens` as keyof typeof planData.limits];
			const used = planData.usage[`${p}_tokens` as keyof typeof planData.usage];

			if (limit && limit > 0 && typeof used === 'number') {
				const pct = Math.round((used / limit) * 100);
				if (pct > maxPct) {
					maxPct = pct;
					maxPeriod = p;
					resetAt = planData.reset_at?.[p];
				}
			}
		}

		return {
			isHighUsage: maxPct >= 80 && maxPct < 100,
			isExceeded: maxPct >= 100,
			highestPercent: maxPct,
			period: maxPeriod,
			resetAt,
			actionUrl: 'https://ai.gcat.ir/portal/dashboard/subscription'
		};
	} catch (err) {
		console.error('Failed to check quota status:', err);
		return { isHighUsage: false, isExceeded: false, highestPercent: 0 };
	}
};
