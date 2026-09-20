import React from "react";
import { createRoot } from "react-dom/client";
import OnlineApp from "./OnlineApp.jsx";
import ErrorShield from "./ErrorShield.jsx";
createRoot(document.getElementById("root")).render(<ErrorShield><OnlineApp /></ErrorShield>);
