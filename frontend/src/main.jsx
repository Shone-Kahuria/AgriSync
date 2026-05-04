import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

const globalStyles = `
  *, *::before, *::after { box-sizing: border-box; }
  body { margin: 0; padding: 0; background: #f9fafb; }
  button:disabled { opacity: 0.5; cursor: not-allowed; }
  input:focus, select:focus { border-color: #16a34a !important; box-shadow: 0 0 0 2px #dcfce7; }
`;

const styleEl = document.createElement("style");
styleEl.textContent = globalStyles;
document.head.appendChild(styleEl);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
