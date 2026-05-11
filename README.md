# Time Terminal System

## Project Description

The Time Terminal System is a digital time tracking solution developed as my final project during my vocational training (Ausbildung) in Application Development.

The main goal of the project was to replace manual working time registration with a reliable and user-friendly digital terminal that allows employees to record attendance, breaks, and working hours accurately.

Currently, the company does not have an independent time tracking system. Working hours are mostly recorded manually, which leads to error-prone processes, limited reporting possibilities, and increased administrative effort.

To improve data quality and reduce manual work, the project focuses on developing a standalone digital terminal for time recording.

The system verifies employee authentication using a username and PIN, which are created through the administration panel. Based on recorded events such as check-in, check-out, break start, and break end, the system automatically calculates break durations and daily working hours and stores all data in an SQL database.

The user interface is designed to be simple and easy to use while providing employees with immediate feedback about successful time tracking operations.

The system also validates all terminal actions to prevent incorrect operations such as duplicate check-ins, invalid break actions, or unauthorized time entries.

The prototype uses username and PIN authentication as the identification method. Future expansion is planned to support RFID technology, although physical RFID devices were not included in this project.

The long-term goal is to create a maintainable and scalable system that can also support automatic monthly reporting in the future.
---
## Main Features

* Employee authentication using username and PIN
* First login requires PIN change
* Check-in and check-out time recording
* Break time registration and validation
* Automatic calculation of working hours and break durations
* Prevention of duplicate or invalid terminal actions
* Administrative dashboard for user management
* PIN management and optional corrections
* SQL database integration for data storage
* Future-ready structure for RFID expansion

---
## Technologies Used

* Java (Backend & Business Logic)
* React.js + JavaScript (Frontend)
* SQL Database
* REST API
* Eclipse IDE
* Git (Version Control)
* Draw.io (UI Mockups and System Design)

---

## Work Process

The digital time tracking process follows these steps:

1. An employee account is created in the admin dashboard.
2. A default PIN is assigned by the administrator.
3. During the first login, the employee must change the PIN.
4. The employee logs into the time terminal using username and PIN.
5. The system validates authentication and checks the current user status.
6. After successful verification, the employee can record attendance, breaks, and check-out times.
7. All records are validated and stored in the SQL database.
8. Administrative overview, corrections, and optional PIN changes are managed through a separate admin panel.

---

## Technical Interfaces and Dependencies

* Internal employee management
* SQL Database
* REST API communication between terminal and backend
* Optional future HR web interface
* Planned RFID system expansion

---

## Important Note

The project was designed with scalability and maintainability in mind. Although RFID support is planned for future development, the current prototype focuses on secure PIN-based authentication and reliable time tracking functionality.

The system prioritizes data accuracy, validation, and usability to improve the company's internal workflow and reduce manual administrative effort.

---

## Screenshots

Project screenshots will be added soon.
