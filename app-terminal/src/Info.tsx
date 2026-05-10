import React from "react";
import "./css/Info.css";

type Props = {
	user: any;
	onBack: () => void;
};

export default function Info({ user, onBack }: Props) {

	const [today, setToday] = React.useState<any>(null);
	const [lastAction, setLastAction] = React.useState<string | null>(null);
	const [history, setHistory] = React.useState<any[]>([]);

	React.useEffect(() => {
		async function loadData() {
			try {
				const todayDate = new Date();
				/*const from3DaysAgo = new Date();
				from3DaysAgo.setDate(todayDate.getDate() - 3);*/

				const fromDate = new Date();
				fromDate.setDate(todayDate.getDate() - 10);

				const fromStr = fromDate.toISOString().split("T")[0];
				const toStr = todayDate.toISOString().split("T")[0];

				const res = await fetch(
					`/api/time_entry/workdays?from=${fromStr}&to=${toStr}`
				);
				const data = await res.json();

				// to filter only this user
				const userDays = data.filter((d: any) => d.userId === user.id);

				function toLocalDateString(date: string | Date) {
					const d = new Date(date);
					return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
				}

				const todayStr = toLocalDateString(todayDate);

				const todayRow = userDays.find(
					(d: any) => toLocalDateString(d.date) === todayStr
				);

				setToday(todayRow || null);

				// a brief report of last 3 days
				// exclude today first
				const historyDays = userDays.filter((d: any) => {
					const dStr = toLocalDateString(d.date);
					return dStr !== todayStr;
				});

				// remove Saturday + Sunday
				const workingDaysOnly = historyDays.filter((d: any) => {
					const day = new Date(d.date).getDay();
					return day !== 0 && day !== 6; // 0=Sunday, 6=Saturday
				});

				// sort descending
				const sorted = workingDaysOnly.sort(
					(a: any, b: any) =>
						new Date(b.date).getTime() - new Date(a.date).getTime()
				);

				// take last 3
				setHistory(sorted.slice(0, 3));
				// load last action
				const lastRes = await fetch(
					`/api/time_entry/last?userId=${user.id}`
				);

				if (lastRes.status !== 204) {
					const lastJson = await lastRes.json();
					setLastAction(lastJson.eventType);
				} else {
					setLastAction(null);
				}
			} catch (e) {
				console.error("Failed loading Info", e);
			}
		}
		loadData();
	}, [user.id]);

	function formatTime(value?: string) {
		if (!value) return "-";
		return new Date(value).toLocaleTimeString("de-DE", {
			hour: "2-digit",
			minute: "2-digit",
		});
	}

	function formatMinutes(minutes?: number) {
		if (!minutes && minutes !== 0) return "-";
		const h = Math.floor(minutes / 60);
		const m = minutes % 60;
		return `${h}h ${m}m`;
	}

	function translateAction(action?: string | null) {
		switch (action) {
			case "come": return "Kommen";
			case "breakStart": return "Pause begonnen";
			case "breakEnd": return "Pause beendet";
			case "go": return "Gehen";
			default: return "-";
		}
	}

	return (
		<div className="infoContainer">
			<div className="infoBox">

				<div className="infoHeader">
					<h2>Info</h2>
				</div>

				<div className="infoRow spaceBetween">
					<span className="userName">
						{user.firstName} {user.lastName}
					</span>
					<span className="userId">
						ID: {user.id}
					</span>
				</div>

				<hr />

				<h3 className="sectionTitle">Aktueller Tagesstatus</h3>

				<p>
					Letzte Aktion: <strong>{translateAction(lastAction)}</strong>
				</p>

				<p>
					Status: {today?.statusComplete
						? "Arbeitstag abgeschlossen"
						: "Sie sind aktuell angemeldet"}
				</p>

				<h3 className="sectionTitle">Heutige Arbeitszeiten</h3>

				<div className="timeRow">
					<span>Kommen</span>
					<span>{formatTime(today?.come)}</span>
				</div>

				<div className="timeRow">
					<span>Pause beginnen</span>
					<span>{formatTime(today?.breakStart)}</span>
				</div>

				<div className="timeRow">
					<span>Pause beenden</span>
					<span>{formatTime(today?.breakEnd)}</span>
				</div>

				<div className="timeRow">
					<span>Gehen</span>
					<span>{formatTime(today?.go)}</span>
				</div>

				<h3 className="sectionTitle">
					Die Aktionen der letzten 3 Tage
				</h3>

				<table className="historyTable">
					<thead>
						<tr>
							<th>Datum</th>
							<th>Kommen</th>
							<th>Gehen</th>
							<th>Arbeitszeit</th>
						</tr>
					</thead>
					<tbody>
						{history.map((d, i) => (
							<tr key={i}>
								<td>
									{new Date(d.date).toLocaleDateString(
										"de-DE"
									)}
								</td>
								<td>{formatTime(d.come)}</td>
								<td>{formatTime(d.go)}</td>
								<td>
									{formatMinutes(d.workingMinutes)}
								</td>
							</tr>
						))}
					</tbody>
				</table>

				<div className="infoFooter">
					<button className="backBtn gray" onClick={onBack}>
						Zurück
					</button>
				</div>
			</div>
		</div>
	);
}
