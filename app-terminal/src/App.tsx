import React from "react";
import MainPage from "./MainPage";
import PinEntry from "./PinEntry";
import Info from "./Info";
import { User } from "../../shared/DomainModel";

//This is the MainPage navigation controller
export default function App() {
	const [screen, setScreen] = React.useState("main");   // the default page
	const [pendingAction, setPendingAction] = React.useState<string | null>(null);
	const [lastAction, setLastAction] = React.useState<string | null>(null);
	const [infoUser, setInfoUser] = React.useState<User | null>(null);

	const openPinPad = (action: string) => {
		setPendingAction(action);
		setScreen("pin");
	};

	// Back button
	const backToMain = () => {
		setScreen("main");
		setPendingAction(null);
	};


	const openInfo = () => {
		setScreen("info");
	};

	return (
		<>
			{screen === "main" && (<MainPage onActionClick={openPinPad} />)}

			{screen === "pin" && (
				<PinEntry
					action={pendingAction}
					onBack={backToMain}
					onSuccess={() => {
						setScreen("main");
					}}
					lastAction={lastAction}
					setLastAction={setLastAction}
					onInfo={(user) => {
						setInfoUser(user);
						openInfo();
					}}
				/>
			)}

			{screen === "info" && infoUser && (
				<Info
					user={infoUser}
					onBack={() => setScreen("main")}
				/>
			)}
		</>
	);
}
