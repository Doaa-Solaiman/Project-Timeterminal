import React from "react";
import "./css/EditAction.css";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { updateMultipleEvents } from "../../shared/API_helper";

export default function EditAction({ data, onClose, onSave }) {
	const [saving, setSaving] = React.useState(false);
	const [message, setMessage] = React.useState<string | null>(null);
	const [messageType, setMessageType] = React.useState<"success" | "error" | null>(null);

	const toDate = (value?: string | null): Date | null => {
		if (!value) return null;
		const d = new Date(value);
		return isNaN(d.getTime()) ? null : d;
	};

	const [form, setForm] = React.useState({
		...data,
		events: data.events.map(ev => ({ ...ev, eventTime: ev.eventTime })),
		notizen: data.notizen || "",
	});

	React.useEffect(() => {
		setForm({
			...data,
			events: data.events.map(ev => ({ ...ev, eventTime: ev.eventTime })),
			notizen: data.notizen || "",
		});
	}, [data]);

	const handleSave = async () => {
		if (!form.notizen?.trim()) {
			setMessage("Notiz ist erforderlich");
			setMessageType("error");
			return;
		}

		const updates = form.events
			.filter((ev, idx) => {
				const original = data.events[idx];

				const oldTime = new Date(original.eventTime).getTime();
				const newTime = new Date(ev.eventTime).getTime();

				return oldTime !== newTime;
			})
			.map(ev => ({
				eventId: ev.id,
				newEventTime: new Date(ev.eventTime).getTime()
			}));

		if (updates.length === 0) {
			setMessage("Keine Änderungen vorgenommen");
			setMessageType("error");
			return;
		}

		setSaving(true);
		try {
			await updateMultipleEvents({ updates, notes: form.notizen });
			setMessage("Änderung erfolgreich gespeichert");
			setMessageType("success");
			setTimeout(onSave, 1200);
		} catch (err: any) {
			setMessage(err.message || "Speichern fehlgeschlagen");
			setMessageType("error");
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="modalOverlay">
			<div className="modalBox">
				<button className="closeBtn" onClick={onClose}>x</button>
				{message && <h3 className={messageType === "success" ? "formSuccess" : "formError"}>{message}</h3>}
				<h2 className="windowTitle">Benutzer-Zeiterfassungen bearbeiten</h2>

				<div className="userInfoRow">
					<span className="username">{form.Vorname} {form.Nachname}</span>
					<span className="userId">Benutzer ID: {form.userId}</span>
				</div>

				<div className="divider"></div>

				{form.events.map((ev, idx) => (
					<div className="formRow" key={ev.id}>
						<label>{ev.eventType}</label>
						<DatePicker
							selected={toDate(ev.eventTime)}
							onChange={(date: Date | null) => {
								const events = [...form.events];
								events[idx] = { ...events[idx], eventTime: date?.toISOString() ?? ev.eventTime };
								setForm(prev => ({ ...prev, events }));
							}}
							showTimeSelect
							showTimeSelectOnly
							timeIntervals={5}
							timeCaption="Uhrzeit"
							dateFormat="HH:mm"
						/>
					</div>
				))}

				<div className="formRow">
					<label>Notizen</label>
					<textarea value={form.notizen} onChange={e => setForm(prev => ({ ...prev, notizen: e.target.value }))} />
				</div>

				<div className="modalActions">
					<button className="saveBtn" onClick={handleSave} disabled={saving}>
						{saving ? "Speichern..." : "Speichern"}
					</button>
				</div>
			</div>
		</div>
	);
}
