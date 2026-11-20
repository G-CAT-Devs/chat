import { WEBUI_API_BASE_URL } from '$lib/constants';

export interface BroadcastNotificationPayload {
	title: string;
	content: string;
	url?: string;
	playSound?: boolean;
	durationMs?: number;
	userId?: string;
}

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
