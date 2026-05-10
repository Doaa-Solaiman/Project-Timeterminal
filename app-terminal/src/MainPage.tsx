import React from "react";
import "./css/MainPage.css";
//import schellerLogo from "./img/schellerLogo.png";


export default function MainPage({ onActionClick }) {
	// Live clock state
	const [clock, setClock] = React.useState("");
	const [dateText, setDateText] = React.useState("");

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

	return (
		<div className="terminalContainer">
			<div className="headerBlock">
				<div className="clock">{clock}</div>
				<div className="title">
					{/*<img
						src="img/schellerLogo.png"
						alt="logo"
						className="schellerLogo"
					/>
					<img className="logo" />*/}
					Scheller Technology
				</div>
				<div className="date">{dateText}</div>
			</div>

			<div className="buttonPanel">
				<button className="btn green" onClick={() => onActionClick("come")}>Kommen</button>
				<button className="btn red" onClick={() => onActionClick("go")}>Gehen</button>

				<button className="btn orange" onClick={() => onActionClick("breakStart")}>Pause beginnen</button>
				<button className="btn gray" onClick={() => onActionClick("breakEnd")}>Pause beenden</button>

				{/*<button className="btn blue info" onClick={() => onActionClick("info")}>Info</button>*/}
			</div>
		</div>
	);
}
