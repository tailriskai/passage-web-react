import React from "react";
import ReactDOM from "react-dom/client";
import { PassageProvider } from "@getpassage/react-js";
import App from "./App";
import "./index.css";
import {
  DEFAULT_API_BASE_URL,
  DEFAULT_UI_BASE_URL,
} from "@getpassage/react-js";

// Allow overriding URLs via query string, e.g. ?uiUrl=http://localhost:3001&apiUrl=http://localhost:3000&socketUrl=http://localhost:3000
const searchParams = new URLSearchParams(window.location.search);
const uiUrlFromQuery = searchParams.get("uiUrl") || searchParams.get("webUrl"); // Support both old and new param names
const apiUrlFromQuery = searchParams.get("apiUrl");
const socketUrlFromQuery = searchParams.get("socketUrl");

const providerConfig = {
  publishableKey: "pk-live-0d017c4c-307e-441c-8b72-cb60f64f77f8", // Default publishable key
  debug: true,
  uiUrl: uiUrlFromQuery ?? DEFAULT_UI_BASE_URL,
  apiUrl: apiUrlFromQuery ?? DEFAULT_API_BASE_URL,
  socketUrl: socketUrlFromQuery ?? DEFAULT_API_BASE_URL,
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <PassageProvider config={providerConfig}>
      <App />
    </PassageProvider>
  </React.StrictMode>
);
