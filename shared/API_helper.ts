
import { User } from "./DomainModel";

export async function createUser(user: User) {
	const serverResponse = await fetch("/api/users", {
		method: "POST",
		headers: { "Content-Type": "application/json; charset=UTF-8" },
		body: JSON.stringify(user),
	});

	if (!serverResponse.ok) {
		throw new Error("failed to create new user");
	}

	return serverResponse.json();
}

export async function checkUsernameExists(username: string) {
	const respond = await fetch(`/api/users/by-username/${encodeURIComponent(username.toLowerCase())}`);

	if (respond.status === 404) return false;
	if (!respond.ok) throw new Error("username check failed");

	return true;
}

export async function fetchUsers(): Promise<User[]> {
	const serverResponse = await fetch("/api/users");

	if (!serverResponse.ok) {
		throw new Error("failed to load users");
	}
	return serverResponse.json();
}

export async function updateUserByAdmin(user: User) {
	if (!user.id) {
		throw new Error("missing user id");
	}

	const respond = await fetch(`/api/users/${user.id}`, {
		method: "POST",
		headers: { "Content-Type": "application/json; charset=UTF-8" },
		body: JSON.stringify(user),
	});

	if (!respond.ok) {
		throw new Error("failed to update user");
	}

	return respond.json();
}

//request DTO data transfer object, What the frontend is allowed to tell the backend
export type CreateTimeEventRequest = {
	userId: string
	eventType: "come" | "breakStart" | "breakEnd" | "go"
	source: "terminal" | "admin"
}
export async function createTimeEvent(event: CreateTimeEventRequest) {
	const response = await fetch("/api/time_entry", {
		method: "POST",
		headers: { "Content-Type": "application/json; charset=UTF-8" },
		body: JSON.stringify(event),
	});

	if (!response.ok) {
		const err = await response.json();
		throw new Error(err.message || "Aktion konnte nicht gespeichert werden");
	}

	return response.json();
}

export async function fetchLastAction(userId: string) {

	const res = await fetch(`/api/time_entry/last?userId=${encodeURIComponent(userId)}`);
	if (res.status === 204) return null;
	if (!res.ok) throw new Error("failed to load the last action");
	return res.json();
}

export async function fetchTimeEvents(from: string, to: string) {
	const res = await fetch(
		`/api/time_entry?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
	);

	if (!res.ok) {
		throw new Error("failed to load time events");
	}

	return res.json();
}

//API helper for admin edit
export async function updateMultipleEvents(payload: {
	updates: { eventId: string; newEventTime: number }[];
	notes: string;
}) {
	const res = await fetch("/api/time_entry/edit", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload)
	});

	if (!res.ok) {
		const err = await res.json();
		throw new Error(err.message || "Failed to update events");
	}

	return res.json();
}

// to fetch the edited IDs
export async function fetchEditedEventIds(from: string, to: string) {
	const res = await fetch(`/api/time_entry/edited?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);

	if (!res.ok) {
		throw new Error("failed to load edited events");
	}

	return res.json();
}

// fetch full history to display the edited history
export async function fetchTimeEventHistory(eventIds: string[]) {
	if (!eventIds.length) return [];
	const res = await fetch(`/api/time_entry/history?eventIds=${eventIds.join(",")}`);
	if (!res.ok) throw new Error("Failed to load history");
	return res.json();
}

// fetch aggregated workdays with calculated breakMinutes and workingMinutes
export async function fetchWorkDays(from: string, to: string) {
	const res = await fetch(`/api/time_entry/workdays?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
	if (!res.ok) {
		throw new Error("failed to load workdays");
	}
	return res.json();
}

export async function fetchMonthlyReport(year: number, month: number) {
	const res = await fetch(`/api/time_entry/monthly_report?year=${year}&month=${month}`);
	if (!res.ok) throw new Error("Failed to load monthly report");
	return res.json();
}

