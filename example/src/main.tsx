import React from "react";
import ReactDOM from "react-dom/client";
import { PassageProvider } from "@getpassage/react-js";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <PassageProvider
      config={{
        debug: true,
      }}
    >
      <App />
    </PassageProvider>
  </React.StrictMode>
);
