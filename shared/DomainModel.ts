export type User = {
	id?: string; //primary key for the employee
	username: string,
	firstName: string;
	lastName: string;
	pin?: string;
	pinMustBeChanged: boolean;
	active: boolean;

	createdAt?: string;
	updatedAt?: string;
}

export type TimeEvent = {
	id: string;
	userId: string; // foreign key
	eventType: "come" | "breakStart" | "breakEnd" | "go";
	eventTime: string; // ISO timestamp and it means when the action was made until the next action.
	source: "terminal" | "admin";
	statusComplete: boolean; // when the user records "go", the system starts to count the working day.
}

export type TimeEventChanges = {
	id: string;
	eventId: string; //foreign key from id in TimeEvent table

	oldEventTime?: string; // because in case for inserting there would be no oldEventTime found
	newEventTime?: string; //because in case for deleting there would be no newEventTime found

	changeType: "update" | "insert" | "delete";

	updatedAt: string; // the time the admin made that change.
	notes: string; // should be required field to explain the reason for that edit/ change.

}
