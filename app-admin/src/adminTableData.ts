export type AdminTableRow = {
	id: number;
	Benutzername: string;
	Vorname: string;
	Nachname:string;
	kommen: string | null;
	pauseStart: string | null;
	pauseEnd: string | null;
	gehen: string | null;
	pauseMinutes: number | null;
	arbeitszeit: number | null;
	sollStunden: number;
	istStunden: number;
	pin: string;
	pinMustBeChanged: boolean,
	aktiv: boolean;
	statusAbgeschlossen: boolean;
	notizen: string | null;
	updatedAt: string | null;
};

export const adminTableData: AdminTableRow[] = [
	{
		id: 1,
		Benutzername: "klara111",
		Vorname: "Klara",
		Nachname: "Fischer",
		kommen: "2025-11-12 08:00:50",
		pauseStart: "2025-11-12 12:05:50",
		pauseEnd: "2025-11-12 13:10:03",
		gehen: "2025-11-12 17:00:00",
		pauseMinutes: 65.01,
		arbeitszeit: 7.55,
		sollStunden: 40,
		istStunden: 44,
		pin: "12345",
		pinMustBeChanged: false,
		aktiv: true,
		statusAbgeschlossen: true,
		notizen: "Anna forgets to record when she came",
		updatedAt: "2025-11-12 08:07:00",
	},

	{
		id: 2,
		Benutzername: "b2schmidt",
		Vorname: "Ben",
		Nachname: "Schmidt",
		kommen: "2025-11-12 08:03:00",
		pauseStart: "2025-11-12 12:30:00",
		pauseEnd: "2025-11-12 16:00:00",
		gehen: "NULL",
		pauseMinutes: 110.30,
		arbeitszeit: null,
		sollStunden: 40,
		istStunden: 39,
		pin: "78945",
		pinMustBeChanged: false,
		aktiv: true,
		statusAbgeschlossen: false,
		notizen: "long break for external appointment",
		updatedAt: "2025-11-12 13:10:00",
	},

	{
		id: 3,
		Benutzername: "doaabd2",
		Vorname:"Doaa",
		Nachname: "Solaiman",
		kommen: "2025-11-12 08:05:01",
		pauseStart: "2025-11-12 13:11:05",
		pauseEnd: "2025-11-12 14:00:00",
		gehen: "2025-11-12 13:10:03",
		pauseMinutes: 41.14,
		arbeitszeit: 8.00,
		sollStunden: 40,
		istStunden: 39,
		pin: "20530",
		pinMustBeChanged: false,
		aktiv: true,
		statusAbgeschlossen: true,
		notizen: "Null",
		updatedAt: "NULL",
	},

	{
		id: 4,
		Benutzername: "anna123456",
		Vorname: "Anna",
		Nachname: "Müller",
		kommen: "2025-11-12 08:12:50",
		pauseStart: "2025-11-12 14:04:39",
		pauseEnd: "2025-11-12 15:01:33",
		gehen: "2025-11-12 13:10:03",
		pauseMinutes: 57.03,
		arbeitszeit: 7.50,
		sollStunden: 40,
		istStunden: 48,
		pin: "20205",
		aktiv: true,
		pinMustBeChanged: false,
		statusAbgeschlossen: true,
		notizen: "Null",
		updatedAt: "NULL",
	},

	{
		id: 5,
		Benutzername: "JohnDoe",
		Vorname: "John",
		Nachname: "Doe",
		kommen: "2025-11-12 08:15:05",
		pauseStart: "2025-11-12 14:10:50",
		pauseEnd: "2025-11-12 14:59:00",
		gehen: "2025-11-12 17:05:00",
		pauseMinutes: 49.11,
		arbeitszeit: 7.55,
		sollStunden: 40,
		istStunden: 39.30,
		pin: "12345",
		pinMustBeChanged: true,
		aktiv: true,
		statusAbgeschlossen: true,
		notizen: "Null",
		updatedAt: "NULL",
	},

	{
		id: 6,
		Benutzername: "321456",
		Vorname: "Haley",
		Nachname: "Howard",
		kommen: "2025-11-12 08:16:00",
		pauseStart: "2025-11-12 14:18:50",
		pauseEnd: "2025-11-12 15:05:50",
		gehen: "2025-11-12 17:00:03",
		pauseMinutes: 49.11,
		arbeitszeit: 7.55,
		sollStunden: 40,
		istStunden: 44,
		pin: "24680",
		pinMustBeChanged: false,
		aktiv: false,
		statusAbgeschlossen: true,
		notizen: "Null",
		updatedAt: "2025-11-12 16:08:07",
	},

	{
		id: 7,
		Benutzername: "suzy4you",
		Vorname: "Suzy",
		Nachname: "Smith",
		kommen: "2025-11-12 08:16:51",
		pauseStart: "2025-11-12 14:35:46",
		pauseEnd: "2025-11-12  15:20:11",
		gehen: "2025-11-12 13:13:33",
		pauseMinutes: 45.15,
		arbeitszeit: 7.30,
		sollStunden: 40,
		istStunden: 50,
		pin: "56987",
		pinMustBeChanged: false,
		aktiv: true,
		statusAbgeschlossen: false,
		notizen: "Null",
		updatedAt: "Null",
	},


];
