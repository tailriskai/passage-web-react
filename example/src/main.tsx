import React from "react";
import ReactDOM from "react-dom/client";
import { PassageProvider } from "@getpassage/react-js";
import App from "./App";
import "./index.css";
import {
  DEFAULT_API_BASE_URL,
  DEFAULT_WEB_BASE_URL,
} from "@getpassage/react-js";

// Allow overriding URLs via query string, e.g. ?webUrl=http://localhost:3001&apiUrl=http://localhost:3000&socketUrl=http://localhost:3000
const searchParams = new URLSearchParams(window.location.search);
const webUrlFromQuery = searchParams.get("webUrl");
const apiUrlFromQuery = searchParams.get("apiUrl");
const socketUrlFromQuery = searchParams.get("socketUrl");

const providerConfig = {
  debug: true,
  webUrl: webUrlFromQuery ?? DEFAULT_WEB_BASE_URL,
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
