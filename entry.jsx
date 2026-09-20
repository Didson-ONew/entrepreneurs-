import React from "react";
import { createRoot } from "react-dom/client";
import Game from "./EntrepreneursGame.jsx";
import ErrorShield from "./ErrorShield.jsx";
createRoot(document.getElementById("root")).render(<ErrorShield><Game /></ErrorShield>);
