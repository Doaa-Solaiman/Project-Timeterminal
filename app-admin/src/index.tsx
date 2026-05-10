import React from "react";
import { createRoot } from "react-dom/client";
import AdminApp from "./AdminApp";

const root = createRoot(document.getElementById("app")!); // this is not null
root.render(<AdminApp/>);

/*function App() {
	return <h1>Hello from Terminal Admin React</h1>
}*/

