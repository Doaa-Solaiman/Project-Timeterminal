import React from "react";
import "./css/PinEntry.css";
import { User } from "../../shared/DomainModel";
import { createTimeEvent, fetchLastAction } from "../../shared/API_helper";

type TerminalState = "ENTER_USERNAME" | "ENTER_PIN" | "CHANGE_PIN" | "MESSAGE";

type Props = {
	action?: string;
	onBack: () => void;
	onSuccess: () => void;
	//onInfo: (user: User) => void;
	onInfo: (user: any) => void;
	lastAction?: string | null;
	setLastAction: (action: string | null) => void;
};

export default function PinEntry({
	action,
	onBack,
	onSuccess,
	onInfo,
	lastAction,
	setLastAction,
}: Props) {
	// Live clock state
	const [clock, setClock] = React.useState("");
	const [dateText, setDateText] = React.useState("");

	const [state, setState] = React.useState<TerminalState>("ENTER_USERNAME");

	// states for changing the initial PIN
	const [oldPin, setOldPin] = React.useState("");
	const [newPin, setNewPin] = React.useState("");
	const [repeatPin, setRepeatPin] = React.useState("");

	//Login user
	const [username, setUsername] = React.useState("");
	const [pin, setPin] = React.useState("");
	const [user, setUser] = React.useState<User | null>(null);

	//UI feedback
	const [error, setError] = React.useState("");
	const [message, setMessage] = React.useState<string | null>(null);
	const [messageType, setMessageType] = React.useState<"success" | "error" | "info">("success");

	//clock and date effect
	React.useEffect(() => {
		const interval = setInterval(() => {
			const now = new Date();
			const hours = String(now.getHours()).padStart(2, "0");
			const minutes = String(now.getMinutes()).padStart(2, "0");
			setClock(`${hours}:${minutes}`);

			const weekdayNames = [
				"Sonntag",
				"Montag",
				"Dienstag",
				"Mittwoch",
				"Donnerstag",
				"Freitag",
				"Samstag"
			];

			const weekday = weekdayNames[now.getDay()];
			const day = String(now.getDate()).padStart(2, "0");
			const month = String(now.getMonth() + 1).padStart(2, "0");
			const year = now.getFullYear();

			setDateText(`${weekday} ${day}.${month}.${year}`);
		},);

		return () => clearInterval(interval);
	}, []);

	//helper functions
	const clearSensitiveData = () => {
		setPin("");
		setOldPin("");
		setNewPin("");
		setRepeatPin("");
		setError("");
	};

	const cancelButton = () => {
		setState("ENTER_USERNAME");
		setUsername("");
		clearSensitiveData();
		setUser(null);
		setMessage(null);
	};

	const showMessage = (msg: string, type: "success" | "error" | "info" = "success", duration = 3000, callback?: () => void) => {
		setMessage(msg);
		setMessageType(type);
		setState("MESSAGE");
		setTimeout(() => {
			setMessage(null);
			if (callback) callback();
		}, duration);
	};


	//username handling
	const confirmUsername = async () => {
		if (!username) {
			setError("Bitte Benutzername eingeben");
			return;
		}

		try {
			const respond = await fetch(`/api/users/by-username/${username}`);

			if (!respond.ok) {
				throw new Error("Benutzer nicht gefunden");
			}

			const userData = await respond.json();

			if (!userData.active) {
				setError("Benutzer ist deaktiviert");
				return;
			}
			setUser(userData);
			setError("");

			setState(userData.pinMustBeChanged ? "CHANGE_PIN" : "ENTER_PIN");
		} catch {
			setError("Benutzername unbekannt");
		}
	};

	//when inserting username succeeded then insert PIN

	const addDigit = (d: number) => {
		if (pin.length < 6) setPin(pin + d);
	};


	const removeDigit = () => { setPin(pin.slice(0, -1)); };

	const confirmPin = async () => {
		if (pin.length !== 6) {
			setError("PIN muss 6 stellig sein");
			return;
		}

		try {
			const respond = await fetch("/api/auth/pin", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					userId: user?.id,
					pin,
				}),
			});

			// PIN is wrong
			if (respond.status === 401) {
				setError("Falsche PIN");
				setPin("");
				return;
			}

			if (!respond.ok) { throw new Error(); }
			clearSensitiveData();
			setError("");

			// now validate and record action
			await handleAction();
		} catch {
			setError("Technischer Fehler"); setPin("");
		}
	};

	//The user Must change the initial PIN, that was created on the Admin page(in case they did not)
	const confirmChangeStandardPin = async () => {

		if (newPin.length !== 6) {
			setError("PIN muss 6 stellig sein");
			return;
		}

		if (newPin !== repeatPin) {
			setError("PINs stimmen nicht überein");
			return;
		}

		if (newPin === oldPin) {
			setError("Die neue PIN darf nicht mit der ursprünglichen PIN übereinstimmen.");
			return;
		}

		try {
			const respond = await fetch("/api/auth/change-pin", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					userId: user?.id,
					oldPin,
					newPin,
				}),
			});

			if (respond.status === 401) {
				setError("Alte PIN ist falsch");
				return;
			}

			if (!respond.ok) {
				throw new Error();
			}

			clearSensitiveData();

			// Welcome message for new users 3s then continue action
			showMessage(`Welcome ${user?.firstName}, Ihre Standard-PIN wurde erfolgreich geändert`, "success", 3000, handleAction);
		} catch {
			setError("PIN konnte nicht geändert werden");
		}
	};

	const validateAction = (action?: string, lastAction?: string | null) => {
		if (action === "info") return null;

		if (action === "come") {
			if (lastAction === "come")
				return "Sie sind bereits angemeldet";
			if (lastAction === "breakStart")
				return "Pause läuft noch. Bitte zuerst Pause beenden";
			return null;
		}

		if (action === "breakStart") {
			if (lastAction === null)
				return "Bitte zuerst kommen buchen";

			if (lastAction === "breakStart")
				return "Sie sind bereits in einer Pause";

			/*if (lastAction === "breakEnd")
				return "Pause wurde bereits beendet";*/

			if (lastAction === "go")
				return "Bitte zuerst kommen buchen";

			return null;
		}

		if (action === "breakEnd") {
			if (lastAction === null || lastAction === "come")
				return "Keine laufende Pause";

			if (lastAction === "breakEnd")
				return "Sie haben die Pause bereits beendet";

			if (lastAction === "go")
				return "Bitte zuerst kommen buchen, um eine Pause zu beginnen.";

			return null;
		}

		if (action === "go") {
			if (lastAction === null)
				return "Bitte zuerst kommen buchen";

			if (lastAction === "go")
				return "Sie haben bereits ausgecheckt";

			if (lastAction === "breakStart")
				return "Pause läuft noch. Bitte zuerst Pause beenden";

			return null;
		}

		return null;
	};

	const handleAction = async () => {
		if (!user || !action) return;
		console.log("Action is:", action);

		if (action === "info") {
			clearSensitiveData();
			onInfo(user);
			return;
		}

		try {
			// Fetching the real last action from the database
			const last = await fetchLastAction(user.id);
			const backendLastAction = last?.eventType ?? null;

			// store it in the frontend-useState
			setLastAction(backendLastAction);

			// validate that action using backend value, and not the usestate
			const validationError = validateAction(action, backendLastAction);

			if (validationError) {
				showMessage(validationError, "info", 3000, () => {
					clearSensitiveData();
					cancelButton();
					onBack();
				});

				return;
			}

			// saving the new action
			const result = await createTimeEvent({
				userId: user.id,
				eventType: action as "come" | "breakStart" | "breakEnd" | "go",
				source: "terminal",
			});

			setLastAction(result.eventType); //backend here is the source of truth.


			const timeText = new Date(result.eventTime).toLocaleTimeString("de-DE", {
				hour: "2-digit",
				minute: "2-digit",
			});

			const actionMessages: Record<string, (userName: string, time: string) => string> = {
				come: (userName, time) => `Danke ${userName}. Sie haben erfolgreich das Kommen um ${time} gebucht.`,
				breakStart: (userName, time) => `Danke ${userName}. Sie haben erfolgreich die Pause um ${time} begonnen.`,
				breakEnd: (userName, time) => `Danke ${userName}. Sie haben erfolgreich die Pause um ${time} beendet.`,
				go: (userName, time) => `Danke ${userName}. Sie haben erfolgreich das Gehen um ${time} gebucht.`,
			};

			const msg = actionMessages[action]
				? actionMessages[action](user.firstName, timeText)
				: "unbekannte Aktion";

			showMessage(msg, "success", 3000, onSuccess);

			/*showMessage(
				`Danke ${user.firstName}. '${action}' um ${timeText} gebucht.`,
				"success",
				999999,
				onSuccess,
			);*/

			// to manage the backend messages reach the terminal UI
		} catch (err: any) {
			setError(err.message || "Leider konnte die Aktion nicht gespeichert werden");
		}
	};

	function getButtonLabel(action) {
		switch (action) {
			case "come": return "Kommen bestätigen";
			case "go": return "Gehen bestätigen";
			case "breakStart": return "Pause beginnen bestätigen";
			case "breakEnd": return "Pause beenden bestätigen";
			case "info": return "Info anzeigen";
			default: return "Bestätigen";
		}
	}

	function getButtonColorClass(action) {
		switch (action) {
			case "come": return "green";
			case "go": return "red";
			case "breakStart": return "orange";
			case "breakEnd": return "gray";
			case "info": return "blue";
			default: return "gray";
		}
	}

	return (
		<div className="pinpadContainer">
			<div className="headerBlock">
				<div className="clock">{clock}</div>
				<div className="title">
					{/*<img
						src="img/schellerLogo.png"
						alt="logo"
						className="schellerLogo"
					/>*/}
					Scheller Technology
				</div>
				<div className="date">{dateText}</div>
			</div>

			<div className="box">
				{error && <div className="error">{error}</div>}

				{message && (
					<div style={{ position: "relative", backgroundColor: "red" }}>
						<div className={`terminalMessage ${messageType} show`}>
							{message}
						</div>

					</div>

				)}

				{state === "ENTER_USERNAME" && (
					<>
						<p></p>
						<input
							className="usernameInput"
							placeholder="Benutzername eingeben"
							value={username}
							onChange={e => setUsername(e.target.value)}
						/>

						<div className="bottomButtons">
							<button className="confirm green" onClick={confirmUsername}>
								Weiter
							</button>

							<button className="gray backBtn" onClick={onBack}>
								Zurück
							</button>
						</div>
					</>
				)}

				{state === "ENTER_PIN" && (
					<>
						<div className="pinDisplay">
							{pin.replace(/./g, "*") || "PIN eingeben"}
						</div>

						<div className="numGrid">
							{[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
								<button className="numBtn" key={n} onClick={() => addDigit(n)}>
									{n}
								</button>
							))}
							<button className="emptyBtn"></button>
							<button className="numBtn" onClick={() => addDigit(0)}>0</button>
							<button className="numBtn" onClick={removeDigit}>x</button>
						</div>

						<div className="bottomButtons">
							<button className={`confirm ${getButtonColorClass(action)}`} onClick={confirmPin}>
								{getButtonLabel(action)}
							</button>

							<button className="gray backBtn" onClick={cancelButton}>
								Zurück
							</button>
						</div>

					</>
				)}

				{state === "CHANGE_PIN" && (
					<>
						<div className="pinChangeTitle">
							Bitte ändern Sie die Standard-PIN.
						</div>

						<input
							className="pinInput"
							type="password"
							placeholder="Alte PIN"
							value={oldPin}
							onChange={e => setOldPin(e.target.value)}

						/>

						<input
							className="pinInput"
							type="password"
							placeholder="Neue PIN"
							value={newPin}
							onChange={e => setNewPin(e.target.value)}
						/>

						<input
							className="pinInput"
							type="password"
							placeholder="Neue PIN wiederholen"
							value={repeatPin}
							onChange={e => setRepeatPin(e.target.value)}
						/>

						<div className="bottomButtons">
							<button className="confirm green" onClick={confirmChangeStandardPin}>
								PIN Ändern
							</button>

							<button className="gray backBtn" onClick={cancelButton}>
								Abbrechen
							</button>
						</div>
					</>
				)}
			</div>
		</div>
	);
}
