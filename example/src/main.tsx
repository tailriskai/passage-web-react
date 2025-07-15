import React from "react";
import ReactDOM from "react-dom/client";
import { PassageProvider } from "@getpassage/react-js";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <PassageProvider
      config={{
        debug: true, // Enable debug logging for the example
        // You can customize these URLs if needed
        baseUrl: "http://localhost:3001",
        socketUrl: "http://localhost:3000",
      }}
    >
      <App />
    </PassageProvider>
  </React.StrictMode>
);
