import React, { useState } from "react";
import {
  usePassage,
  PassageSuccessData,
  PassageErrorData,
} from "@getpassage/react-js";
import LogDisplay from "./LogDisplay";

const DirectTokenExample: React.FC = () => {
  const passage = usePassage();
  const [intentToken, setIntentToken] = useState(
    "intent_token_abc123xyz789_example"
  );
  const [logs, setLogs] = useState<
    Array<{
      timestamp: string;
      message: string;
      type: "info" | "success" | "error";
    }>
  >([]);

  const addLog = (
    message: string,
    type: "info" | "success" | "error" = "info"
  ) => {
    setLogs((prev) => [
      ...prev,
      {
        timestamp: new Date().toLocaleTimeString(),
        message,
        type,
      },
    ]);
  };

  const handleOpenDirectly = async () => {
    if (!intentToken.trim()) {
      addLog("❌ Intent token is required", "error");
      return;
    }

    addLog("🚀 Opening Passage directly with intent token (no initialize)...");
    addLog(`Using token: ${intentToken}`);

    try {
      await passage.open({
        intentToken: intentToken.trim(),
        onConnectionComplete: (data: PassageSuccessData) => {
          addLog(
            `✅ Direct: Connection complete! Connection ID: ${data.connectionId}`,
            "success"
          );
          addLog(
            `Direct: Data received: ${JSON.stringify(data.data, null, 2)}`,
            "success"
          );
        },
        onError: (error: PassageErrorData) => {
          addLog(
            `❌ Direct: Error: ${error.error} (Code: ${error.code})`,
            "error"
          );
        },
        onDataComplete: (data) => {
          addLog(
            `📊 Direct: Data complete: ${JSON.stringify(data, null, 2)}`,
            "success"
          );
        },
        onPromptComplete: (prompt) => {
          addLog(
            `🎯 Direct: Prompt completed: ${prompt.key} = ${prompt.value}`,
            "success"
          );
        },
        onExit: (reason) => {
          addLog(`👋 Direct: User exited: ${reason || "unknown reason"}`);
        },
      });

      addLog(
        "🎉 Passage opened successfully with direct intent token!",
        "success"
      );
    } catch (error) {
      addLog(`❌ Failed to open with intent token: ${error}`, "error");
    }
  };

  const handleClose = async () => {
    addLog("👋 Closing Passage...");
    await passage.close();
    addLog("✅ Passage closed");
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="example-card">
      <h3>🔑 Direct Intent Token</h3>
      <p>
        Skip initialization and open Passage directly with an existing intent
        token from an external source.
      </p>

      <div className="input-group">
        <label htmlFor="direct-intent-token">Intent Token:</label>
        <input
          id="direct-intent-token"
          type="text"
          value={intentToken}
          onChange={(e) => setIntentToken(e.target.value)}
          placeholder="Enter an intent token"
        />
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <button
          className="button"
          onClick={handleOpenDirectly}
          disabled={!intentToken.trim()}
        >
          Open Modal
        </button>

        <button className="button secondary" onClick={handleClose}>
          Close
        </button>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <span style={{ fontWeight: 600 }}>Activity Log:</span>
        <button
          className="button secondary"
          onClick={clearLogs}
          style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}
        >
          Clear
        </button>
      </div>

      <LogDisplay logs={logs} />
    </div>
  );
};

export default DirectTokenExample;
