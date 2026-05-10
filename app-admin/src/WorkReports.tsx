import React from "react";
import { fetchMonthlyReport } from "../../shared/API_helper";
//import { User } from "../../shared/DomainModel";
import "./css/AdminTable.css";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

type MonthlyReportRow = {
	userId: string;
	firstName: string;
	lastName: string;
	sollHours: number;
	istHours: number;
	overtime: number;
	minusHours: number;
};

export default function WorkReports() {

	const [rows, setRows] = React.useState<MonthlyReportRow[]>([]);

	//UI month fields state
	const today = new Date();

	const [selectedMonth, setSelectedMonth] = React.useState<Date | null>(today);
	const [appliedYear, setAppliedYear] = React.useState(today.getFullYear());
	const [appliedMonth, setAppliedMonth] = React.useState(today.getMonth() + 1);

	//pagination state
	const ROWS_PER_PAGE = 13;
	const [currentPage, setCurrentPage] = React.useState(1);

	//calculate paginated rows
	const totalPages = Math.ceil(rows.length / ROWS_PER_PAGE);

	const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
	const endIndex = startIndex + ROWS_PER_PAGE;

	const paginatedRows = rows.slice(startIndex, endIndex);

	React.useEffect(() => {
		const loadReport = async () => {
			try {
				const data = await fetchMonthlyReport(appliedYear, appliedMonth);
				setRows(data);
			} catch (err) {
				console.error("Failed to load monthly report", err);
			}
		};

		loadReport();
	}, [appliedYear, appliedMonth]);

	const formatHours = (value: number) => {
		if (Number.isInteger(value)) return value.toString();
		return value.toFixed(2);
	};



	return (
		<div className="">
			<div className="dateFilter">
				<div className="dateInputs">
					<label>
						Monat auswählen
						<DatePicker
							selected={selectedMonth}
							onChange={(date: Date | null) => setSelectedMonth(date)}
							showMonthYearPicker
							dateFormat="MM/yyyy"
							placeholderText="Monat auswählen"
							className="weekPicker"
						/>
					</label>
				</div>

				<div className="dateActions">

					<button
						className="applyBtn"
						onClick={() => {
							if (!selectedMonth) return;

							setAppliedYear(selectedMonth.getFullYear());
							setAppliedMonth(selectedMonth.getMonth() + 1);
							setCurrentPage(1);
						}}
					>
						Anwenden
					</button>

					<button
						className="resetBtn"
						onClick={() => {
							const now = new Date();
							setSelectedMonth(now);
							setAppliedYear(now.getFullYear());
							setAppliedMonth(now.getMonth() + 1);
							setCurrentPage(1);
						}}
					>
						Zurücksetzen
					</button>
				</div>

			</div>

			<h3>
				Monatsbericht für {appliedMonth.toString().padStart(2, "0")}/{appliedYear}
			</h3>

			<table className="adminTable">
				<thead>
					<tr>
						<th>Mitarbeiter</th>
						<th>Soll-Stunden pro Monat</th>
						<th>Ist-Stunden</th>
						<th>Überstunden</th>
						<th>Minusstunden</th>

					</tr>
				</thead>

				<tbody>
					{paginatedRows.length === 0 ? (
						<tr>
							<td colSpan={6} style={{ textAlign: "center" }}>
								Keine passenden Ergebnisse gefunden
							</td>
						</tr>

					) : (
						paginatedRows.map(emp => (
							<tr key={emp.userId}>
								<td>{emp.firstName} {emp.lastName}</td>
								<td>{formatHours(emp.sollHours)}</td>
								<td>{formatHours(emp.istHours)}</td>
								<td>{formatHours(emp.overtime)}</td>
								<td>{formatHours(emp.minusHours)}</td>
							</tr>
						))
					)}

				</tbody>
			</table>

			{/*the pagination UI*/}
			<div className="pagination">
				<button
					disabled={currentPage === 1}
					onClick={() => setCurrentPage(prev => prev - 1)}
				>
					Vor
				</button>

				{Array.from({ length: totalPages }, (_, index) => (
					<button
						key={index}
						className={currentPage === index + 1 ? "active" : ""}
						onClick={() => setCurrentPage(index + 1)}
					>
						{index + 1}
					</button>
				))}

				<button
					disabled={currentPage === totalPages}
					onClick={() => setCurrentPage(prev => prev + 1)}
				>
					Weiter
				</button>
			</div>


		</div>
	);
}
