import React from "react";
import { fetchTimeEventHistory } from "../../shared/API_helper";
import "./css/HistoryChanges.css";

type Props = {
	eventId: string;
	onClose: () => void;
};

export default function HistoryChanges({ eventId, onClose }: Props) {

	const [history, setHistory] = React.useState<any[]>([]);
	//const [loading, setLoading] = React.useState(true);

	React.useEffect(() => {
		async function loadingHistory() {
			try {
				const result = await fetchTimeEventHistory([eventId]);
				setHistory(result);
			} catch (e) {
				console.error("Failed to load history", e);
			}
		}
		loadingHistory();
	}, [eventId]);

	function formatTime(timestamp: number | string | null) {
		if (!timestamp) return "-";
		const d = new Date(timestamp);
		return d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
	}

	function formatDateTime(timestamp: number | string | null) {
		if (!timestamp) return "-";
		const d = new Date(timestamp);
		return d.toLocaleString("de-DE", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit"
		});
	}

	return (
		<div className="historyModalOverlay">
			<div className="historyModalBox">

				<div className="historyHeader">
					<h2>Änderungsverlauf</h2>
					<button className="historyCloseBtn" onClick={onClose}>x</button>
				</div>
				{history.length > 0 && (
					<div className="historyContent">
						{history.map(h => (
							<div key={h.id} className="historyCard">
								<div><span>Alt:</span> {formatTime(h.oldEventTime)}</div>
								<div><span>Neu:</span> {formatTime(h.newEventTime)}</div>
								<div><span>Notiz:</span> {h.notes || "-"}</div>
								<div><span>Am:</span> {formatDateTime(h.updatedAt)}</div>
							</div>
						))}
					</div>
				)}

			</div>
		</div>
	);

}
