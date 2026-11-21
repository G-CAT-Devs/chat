import { WEBUI_API_BASE_URL } from '$lib/constants';

export interface BroadcastNotificationPayload {
	title: string;
	content: string;
	url?: string;
	playSound?: boolean;
	durationMs?: number;
	userId?: string;
}

export interface ScheduledNotificationConfig {
	enabled: boolean;
	title: string;
	content: string;
	url?: string;
	startTime: string;
	endTime: string;
	playSound?: boolean;
	durationMs?: number;
}

export const getScheduledNotification = async (
	token: string
): Promise<ScheduledNotificationConfig> => {
	const res = await fetch(`${WEBUI_API_BASE_URL}/notifications/scheduled`, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		}
	});

	if (!res.ok) {
		return {
			enabled: false,
			title: 'اعلان سیستم',
			content: '',
			startTime: '08:00',
			endTime: '12:00',
			playSound: true,
			durationMs: 15000
		};
	}

	return await res.json();
};

export const saveScheduledNotification = async (
	token: string,
	payload: ScheduledNotificationConfig
) => {
	const res = await fetch(`${WEBUI_API_BASE_URL}/notifications/scheduled`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify(payload)
	});

	if (!res.ok) {
		const err = await res.json().catch(() => ({ detail: 'Failed to save scheduled notification' }));
		throw new Error(err.detail || 'Failed to save scheduled notification');
	}

	return await res.json();
};

export const broadcastNotification = async (
	token: string,
	payload: BroadcastNotificationPayload
) => {
	const res = await fetch(`${WEBUI_API_BASE_URL}/notifications/broadcast`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify(payload)
	});

	if (!res.ok) {
		const err = await res.json().catch(() => ({ detail: 'Failed to broadcast notification' }));
		throw new Error(err.detail || 'Failed to broadcast notification');
	}

	return await res.json();
};
