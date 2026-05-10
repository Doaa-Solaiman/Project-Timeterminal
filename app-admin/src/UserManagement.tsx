import React from "react";
import { fetchUsers } from "../../shared/API_helper";
import { User } from "../../shared/DomainModel";
import UserModal from "./UserModal";
import "./css/UserManagement.css";


export default function UserManagement() {
	const [employees, setEmployees] = React.useState<User[]>([]);

	const [userManagement, setUserManagement] = React.useState<User | null>(null);
	// successful message after created a new emplyee
	const [globalSuccess, setGlobalSuccess] = React.useState<string | null>(null);
	const [fadeOut, setFadeOut] = React.useState(false);
	/*const [globalSuccess, setGlobalSuccess] = React.useState<string>(
		"Mitarbeiter wurde erfolgreich erstellt"
	);*/

	const [search, setSearch] = React.useState("");

	const searchedEmployees = employees.filter(emp => {
		const searchTerm = search.toLowerCase();

		return (
			emp.username.toLowerCase().includes(searchTerm) ||
			emp.firstName.toLowerCase().includes(searchTerm) ||
			emp.lastName.toLowerCase().includes(searchTerm)
		);
	});

	//pagination state
	const ROWS_PER_PAGE = 13;
	const [currentPage, setCurrentPage] = React.useState(1);

	//calculate paginated rows
	const totalPages = Math.ceil(searchedEmployees.length / ROWS_PER_PAGE);

	const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
	const endIndex = startIndex + ROWS_PER_PAGE;

	const paginatedEmployees = searchedEmployees.slice(startIndex, endIndex);

	//to reset page when data changes
	React.useEffect(() => {
		setCurrentPage(1);
	}, [employees, search]);

	//to load the employees we added from the backend
	React.useEffect(() => {
		const loadUsers = async () => {
			try {
				const employeesAdded = await fetchUsers();
				setEmployees(employeesAdded);
			} catch (error) {
				console.error("Fehler beim Laden der Mitarbeiter", error);
			}
		};
		loadUsers();
	}, []);

	const reloadUsers = async () => {
		const users = await fetchUsers();
		setEmployees(users);
	};

	/*const handleSave = async (employee: User) => {
		// only editing existing users PIN with and pinMustBeChanged = false
		if (!employee.id) {
			console.warn("");
			return;
		}

		// comes later
		setEmployees(prev =>
			prev.map(e => (e.id === employee.id ? employee : e))
		);

		setUserManagement(null);
	};*/



	// load from localStorage
	/*
	React.useEffect(() => {
		const stored = localStorage.getItem("employees");

		if (stored) {
			setEmployees(JSON.parse(stored));
		} else {
			
			setEmployees(adminTableData);
			localStorage.setItem("employees", JSON.stringify(adminTableData));
		}
	}, []);

	
	const saveEmployees = (list: AdminTableRow[]) => {
		setEmployees(list);
		localStorage.setItem("employees", JSON.stringify(list));
	};

	const handleSave = (employee: AdminTableRow) => {
		if (userManagement) {
			saveEmployees(
				employees.map(e => (e.id === employee.id ? employee : e))
			);
		} else {
			saveEmployees([...employees, employee]);
		}
		setUserManagement(null);
	};*/

	return (
		<div className="userManagementBox">

			{globalSuccess && (
				<div className={`globalSuccess ${fadeOut ? "fadeOut" : ""}`}>
					{globalSuccess}
				</div>
			)}

			<div className="searchWrapper">
				<img src="img/search.png" className="searchIcon" alt="search logo" />

				<input
					type="text"
					placeholder="Mitarbeiter suchen..."
					className="searchInput"
					value={search}
					onChange={(e) => {
						setSearch(e.target.value);
					}}
				/>

			</div>


			<h2 className="tableTitle">Liste der erfassten Mitarbeiter</h2>

			<table className="userTable">
				<thead>
					<tr>
						<th>Benutzername</th>
						<th>Vorname</th>
						<th>Nachname</th>
						<th>PIN-Status</th>
						<th>Mitarbeiterstatus</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{paginatedEmployees.length === 0 ? (
						<tr>
							<td colSpan={6} style={{ textAlign: "center" }}>
								Keine passenden Ergebnisse gefunden
							</td>
						</tr>

					) : (
						paginatedEmployees.map(emp => (
							<tr key={emp.id}>
								<td>{emp.username}</td>
								<td>{emp.firstName}</td>
								<td>{emp.lastName}</td>

								<td>
									<span
										className={`pinStatus ${emp.pinMustBeChanged ? "pending" : "success"
											}`}
									>
										{emp.pinMustBeChanged ? "Noch nicht geändert" : "Geändert"}
									</span>
								</td>

								<td>
									<span className="status">
										<span
											className={`statusDot ${emp.active ? "success" : "pending"}`}
										/>
										{emp.active ? "aktiv" : "inaktiv"}
									</span>
								</td>
								<td>
									<button
										className="editBtn"
										onClick={() => {
											setUserManagement(emp);
										}}
									>
										Bearbeiten
									</button>
								</td>
							</tr>
						))
					)}

				</tbody>
			</table>

			<button
				className="addButton"
				onClick={() => {

					setUserManagement({
						username: "",
						firstName: "",
						lastName: "",
						pinMustBeChanged: true,
						active: true,
					});
				}}
			>
				+ Mitarbeiter hinzufügen
			</button>

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

			{userManagement && (
				<UserModal
					data={userManagement}
					onClose={async () => {
						setUserManagement(null);
						await reloadUsers();
					}}
					onSuccess={(msg: string) => {
						setGlobalSuccess(msg);
						setFadeOut(false);

						setTimeout(() => setFadeOut(true), 2500);
						setTimeout(() => setGlobalSuccess(null), 3000);
					}}
				/>
			)}


		</div>
	);
}
