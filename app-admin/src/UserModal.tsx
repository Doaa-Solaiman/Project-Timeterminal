import React from "react";
import { createUser, checkUsernameExists, updateUserByAdmin } from "../../shared/API_helper";
import { User } from "../../shared/DomainModel";
import "./css/UserModal.css";

type Props = {
	data: User;
	onClose: () => void;
	onSuccess: (msg: string) => void;
};

export default function UserModal({ data, onClose, onSuccess }: Props) {
	const [form, setForm] = React.useState<User>(data);
	const [newPin, setNewPin] = React.useState("");
	const [oldPin, setOldPin] = React.useState("");
	const [repeatPin, setRepeatPin] = React.useState("");

	const [error, setError] = React.useState("");
	const isNewEmployee = !data.id;
	const canAdminEditFields = !isNewEmployee && !form.pinMustBeChanged;

	React.useEffect(() => {
		setForm(data);
		setNewPin("");
		setOldPin("");
		setRepeatPin("");
		setError("");

	}, [data]);

	//create new employee
	const createEmployee = async () => {
		if (!newPin) {
			setError("Bitte Standard PIN erstellen");
			return;
		}
		if (newPin.length !== 6 || newPin !== repeatPin) {
			setError("PIN ungültig oder stimmt nicht überein");
			return;
		}

		if (!form.username.trim()) {
			setError("Benutzername ist erforderlich");
			return;
		}

		const exists = await checkUsernameExists(form.username);
		if (exists) {
			setError("Benutzername existiert bereits");
			return;
		}

		await createUser({ ...form, pin: newPin, pinMustBeChanged: true, });

		onSuccess("Mitarbeiter wurde erfolgreich erstellt");
		onClose();
	};


	//edit by admin (firstname, lastname, active or not)
	const saveAdminEdits = async () => {
		if (form.pinMustBeChanged) {
			setError("Bearbeitung erst nach PIN-Änderung möglich");
			return;
		}
		await updateUserByAdmin(form);
		
		onSuccess("Mitarbeiter wurde erfolgreich aktualisiert");
		onClose();
	};

	const handleSubmit = async () => {
		try {
			if (isNewEmployee) {
				await createEmployee();
			} else {
				await saveAdminEdits();
			}
		} catch (error) {
			console.error(error);
			setError("Fehler beim Speichern des Mitarbeiters!");
		}
	};

	return (
		<div className="modalOverlay">
			<div className="modal">
				<button className="closeBtn" onClick={onClose}>x</button>

				<h3 className="windowTitle">
					{isNewEmployee ? "Mitarbeiter hinzufügen" : "Mitarbeiter bearbeiten"}
				</h3>

				{error && <div className="error">{error}</div>}

				{!isNewEmployee && form.pinMustBeChanged && (
					<div className="infoWrapper">
						<img src="img/info.png" className="infoIcon" alt="search logo" />
						<p className="info">
							Dieser Mitarbeiter muss zuerst seine Standard PIN ändern.
						</p>
					</div>

				)}

				{/* Username: always read only except for creating new employee */}
				<input
					placeholder="Benutzername"
					value={form.username}
					onChange={e =>
						setForm(prev => ({ ...prev, username: e.target.value }))
					}
					readOnly={!isNewEmployee}
				/>

				<input
					placeholder="Vorname"
					value={form.firstName}
					onChange={e =>
						setForm(prev => ({ ...prev, firstName: e.target.value }))
					}
					readOnly={!isNewEmployee && !canAdminEditFields}
				/>

				<input
					placeholder="Nachname"
					value={form.lastName}
					onChange={e =>
						setForm(prev => ({ ...prev, lastName: e.target.value }))
					}
					readOnly={!isNewEmployee && !canAdminEditFields}
				/>

				{/*{!isNewEmployee && !form.pinMustBeChanged && (
					<input
						type="password"
						placeholder="Alte PIN eingeben"
						value={oldPin}
						onChange={e => setOldPin(e.target.value)}
					/>
				)}*/}

				{isNewEmployee && (
					<>
						<input
							placeholder={
								isNewEmployee
									? "Standard-PIN erstellen (6 stellig)"
									: "Neue PIN (6 stellig)"
							}
							type="password"
							value={newPin}
							onChange={e => setNewPin(e.target.value)}
							disabled={!isNewEmployee && !oldPin}
						/>

						<input
							placeholder="PIN wiederholen"
							type="password"
							value={repeatPin}
							onChange={e => setRepeatPin(e.target.value)}
						/>

					</>
				)}

				<label className="checkbox">
					<input
						type="checkbox"
						checked={form.active}
						onChange={e =>
							setForm(prev => ({ ...prev, active: e.target.checked }))
						}
						disabled={!canAdminEditFields}
					/>
					Aktiv
				</label>

				<button className="saveButton" onClick={handleSubmit} >
					Speichern
				</button>
			</div>
		</div>
	);
}
