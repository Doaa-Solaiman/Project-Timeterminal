import React from "react";
import "./css/AdminTable.css";
import { fetchUsers, fetchEditedEventIds, fetchWorkDays } from "../../shared/API_helper";
import EditAction from "./EditAction";
import HistoryChanges from "./HistoryChanges";

import WorkReports from "./WorkReports";
import UserManagement from "./UserManagement";

type Event = {
	id: string;
	eventType: "come" | "breakStart" | "breakEnd" | "go";
	eventTime: string;
};

type Row = {
	id: string; // userId + date for the react key
	userId: string;
	Vorname: string;
	Nachname: string;
	events: Event[];
	pauseMinutes?: number;
	arbeitszeit?: number;
	statusAbgeschlossen: boolean;
};

export default function AdminTable() {
	const [view, setView] = React.useState<"day" | "reports" | "userManagement">("day");
	const [rows, setRows] = React.useState<Row[]>([]);
	const [editingRow, setEditingRow] = React.useState<Row | null>(null);
	const [historyEventId, setHistoryEventId] = React.useState<string | null>(null);
	const [editedIds, setEditedIds] = React.useState<string[]>([]);

	const today = new Date().toISOString().slice(0, 10);
	const [fromDate, setFromDate] = React.useState(today);
	const [toDate, setToDate] = React.useState(today);
	const [appliedFrom, setAppliedFrom] = React.useState(today);
	const [appliedTo, setAppliedTo] = React.useState(today);

	const ROWS_PER_PAGE = 13;
	const [currentPage, setCurrentPage] = React.useState(1);
	const totalPages = Math.ceil(rows.length / ROWS_PER_PAGE);
	const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
	const endIndex = startIndex + ROWS_PER_PAGE;
	const paginatedRows = rows.slice(startIndex, endIndex);

	React.useEffect(() => {
		loadData(today, today);
	}, []);

	const formatDateTime = (value?: string) => {
		if (!value) return "-";
		const d = new Date(value);
		return d.toLocaleString("de-DE", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const formatMinutes = (minutes?: number | string) => {
		if (minutes == null) return "-";
		if (typeof minutes !== "number") return minutes;
		const h = Math.floor(minutes / 60);
		const m = minutes % 60;
		return `${h}:${m.toString().padStart(2, "0")}`;
	};

	//map backend workdays
	const mapWorkdaysToRows = (workdays: any[], users: any[]): Row[] => {
		return workdays.map(day => {
			const user = users.find(u => u.id === day.userId);
			return {
				id: `${day.userId}-${day.date}`, userId:day.userId,
				Vorname: user?.firstName ?? "",
				Nachname: user?.lastName ?? "",
				events: day.events ?? [],
				pauseMinutes: day.breakMinutes ?? "-",
				arbeitszeit: day.workingMinutes ?? "-",
				statusAbgeschlossen: day.statusComplete ?? false,
			};
		});
	};

	const loadData = async (from: string, to: string) => {
		try {
			const [users, workdays, edited] = await Promise.all([
				fetchUsers(),
				fetchWorkDays(from, to),
				fetchEditedEventIds(from, to),
			]);

			setEditedIds(edited.map((event: any) => event.eventId));
			const mapped = mapWorkdaysToRows(workdays, users);
			setRows(mapped);
		} catch (err) {
			console.error(err);
		}
	};

	const applyDateFilter = () => {
		setCurrentPage(1);
		loadData(fromDate, toDate);
		setAppliedFrom(fromDate);
		setAppliedTo(toDate);
	};

	const resetFilter = () => {
		setFromDate(today);
		setToDate(today);
		setAppliedFrom(today);
		setAppliedTo(today);
		setCurrentPage(1);
		loadData(today, today);
	};
	
	function formatEventType(eventType: string) {
		switch (eventType) {
			case "come":
				return "Kommen";
			case "breakStart":
				return "Pause Start";
			case "breakEnd":
				return "Pause Ende";
			case "go":
				return "Gehen";
			default:
				return eventType;
		}
	}

	return (
		<div className="adminContainer">
			<div className="adminHeader">
				<div className="headerTitle">
					<img src="img/real-time.png" alt="Clock logo" className="headerLogo" />
					<h1>Zeiterfassungsterminal</h1>
				</div>
				<h2>Hallo! Admin-Übersicht</h2>

				<div className="tabsBar">
					<button className={`tab ${view === "day" ? "active" : ""}`} onClick={() => setView("day")}>Einträge Übersicht</button>
					<button className={`tab ${view === "reports" ? "active" : ""}`} onClick={() => setView("reports")}>Arbeitsbericht</button>
					<button className={`tab ${view === "userManagement" ? "active" : ""}`} onClick={() => setView("userManagement")}>Mitarbeitermanagement</button>
				</div>
			</div>

			<div className="adminBox">
				{view === "day" && (
					<>
						<div className="dateFilter">
							<div className="dateInputs">
								<label>
									Von
									<input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
								</label>
								<label>
									Bis
									<input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
								</label>
							</div>
							<div className="dateActions">
								<button className="applyBtn" onClick={applyDateFilter}>Anwenden</button>
								<button className="resetBtn" onClick={resetFilter}>Heute</button>
							</div>
						</div>

						<h3 className="tableTitle">
							{appliedFrom === appliedTo ? "Tagesübersicht" : `Zeitraum: ${appliedFrom} - ${appliedTo}`}
						</h3>

						<table className="adminTable">
							<thead>
								<tr>
									<th>Mitarbeiter</th>
									<th>Einträge</th>
									<th>Pause(min)</th>
									<th>Arbeitszeit(h)</th>
									<th>Status</th>
									<th>Aktionen</th>
								</tr>
							</thead>

							<tbody>
								{paginatedRows.map(row => (
									<tr key={row.id}>
										<td>{row.Vorname} {row.Nachname}</td>
										<td>
											{row.events.map(ev => (
												<div key={ev.id} className={`eventTag ${ev.eventType}`}>
													{formatDateTime(ev.eventTime)} / {formatEventType(ev.eventType)}
												
													{editedIds.includes(ev.id) && (
														<span className="editedIcon tooltip"
															onClick={() => setHistoryEventId(ev.id)}>✏️
														</span>
													)}
												</div>
											))}
										</td>
										<td>{formatMinutes(row.pauseMinutes)}</td>
										<td>{formatMinutes(row.arbeitszeit)}</td>
										<td>
											<span className="status">
												<span className={`statusClose ${row.statusAbgeschlossen ? "success" : "pending"}`} />
												{row.statusAbgeschlossen ? "abgeschlossen" : "offen (kein Gehen)"}
											</span>
										</td>
										<td>
											<button onClick={() => setEditingRow(row)}>Bearbeiten</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>

						<div className="pagination">
							<button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Vor</button>
							{Array.from({ length: totalPages }, (_, index) => (
								<button key={index} className={currentPage === index + 1 ? "active" : ""} onClick={() => setCurrentPage(index + 1)}>
									{index + 1}
								</button>
							))}
							<button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Weiter</button>
						</div>
					</>
				)}

				{editingRow && <EditAction data={editingRow} onClose={() => setEditingRow(null)} onSave={() => { loadData(fromDate, toDate); setEditingRow(null); }} />}
				{historyEventId && <HistoryChanges eventId={historyEventId} onClose={() => setHistoryEventId(null)} />}
				{view === "reports" && <WorkReports />}
				{view === "userManagement" && <UserManagement />}
			</div>
		</div>
	);
}
