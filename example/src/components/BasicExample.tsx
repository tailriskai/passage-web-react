import React, { useState } from "react";
import {
  usePassage,
  PassageSuccessData,
  PassageErrorData,
  PassagePrompt,
  PassagePromptResponse,
} from "@getpassage/react-js";
import LogDisplay from "./LogDisplay";

const BasicExample: React.FC = () => {
  const passage = usePassage();
  const [publishableKey, setPublishableKey] = useState(
    "pk-live-0d017c4c-307e-441c-8b72-cb60f64f77f8"
  );
  const [integrationId, setIntegrationId] = useState("audible");
  const [selectedIntegration, setSelectedIntegration] =
    useState<string>("audible");
  const [presentationStyle, setPresentationStyle] = useState<"modal" | "embed">(
    "modal"
  );
  const [isInitialized, setIsInitialized] = useState(false);
  const [logs, setLogs] = useState<
    Array<{
      timestamp: string;
      message: string;
      type: "info" | "success" | "error";
    }>
  >([]);
  const [loading, setLoading] = useState(false);

  const defaultSchema = {
    type: "object",
    additionalProperties: false,
    required: ["data"],
    properties: {
      data: {
        type: "array",
        items: {
          type: "object",
          required: ["title", "author", "roast"],
          properties: {
            title: { type: "string" },
            author: { type: "string" },
            roast: { type: "string" },
          },
        },
      },
    },
  };

  const [prompt, setPrompt] = useState<PassagePrompt>({
    name: "",
    value: "",
    outputType: "text",
    outputFormat: undefined,
  });
  const [promptResults, setPromptResults] = useState<PassagePromptResponse[]>(
    []
  );

  const integrationOptions = [
    { value: "kindle", label: "Kindle" },
    { value: "audible", label: "Audible" },
    { value: "youtube", label: "YouTube" },
    { value: "netflix", label: "Netflix" },
    { value: "ubereats", label: "UberEats" },
  ];

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

  const updatePrompt = (field: keyof PassagePrompt, value: string) => {
    setPrompt((prev) => ({ ...prev, [field]: value }));
  };

  const handleInitialize = async () => {
    setLoading(true);
    setPromptResults([]);
    addLog("Initializing Passage...");

    // Validate integrationId is selected
    if (!integrationId) {
      addLog("❌ Please select an integration type first", "error");
      setLoading(false);
      return;
    }

    const promptsToSend: PassagePrompt[] = [];
    if (prompt.name && prompt.value) {
      promptsToSend.push(prompt);
    }

    try {
      await passage.initialize({
        publishableKey,
        integrationId: integrationId || undefined,
        prompts: promptsToSend.length > 0 ? promptsToSend : undefined,
        onConnectionComplete: (data: PassageSuccessData) => {
          addLog(
            `✅ Connection complete! Connection ID: ${data.connectionId}`,
            "success"
          );
          addLog(
            `Data received: ${JSON.stringify(data.data, null, 2)}`,
            "success"
          );
        },
        onError: (error: PassageErrorData) => {
          addLog(`❌ Error: ${error.error} (Code: ${error.code})`, "error");
        },
        onDataComplete: (data) => {
          addLog(
            `📊 Data processing complete: ${JSON.stringify(data, null, 2)}`,
            "success"
          );
        },
        onPromptComplete: (promptResponse: PassagePromptResponse) => {
          addLog(
            `🎯 Prompt completed: ${promptResponse.name} = ${promptResponse.content}`,
            "success"
          );
          setPromptResults((prev) => [...prev, promptResponse]);
        },
        onExit: (reason) => {
          addLog(`👋 User exited: ${reason || "unknown reason"}`);
        },
      });

      setIsInitialized(true);
      addLog("✅ Passage initialized successfully!", "success");
    } catch (error) {
      addLog(`❌ Initialization failed: ${error}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = async () => {
    addLog(`Opening Passage ${presentationStyle}...`);

    try {
      // Disconnect any existing WebSocket connection before opening
      addLog("🔌 Disconnecting existing WebSocket connection...");
      await passage.disconnect();

      const openOptions: any = {
        presentationStyle,
        onConnectionComplete: (data: PassageSuccessData) => {
          addLog(
            `✅ ${presentationStyle}: Connection complete! Status: ${data.status}`,
            "success"
          );
        },
        onError: (error: PassageErrorData) => {
          addLog(
            `❌ ${presentationStyle}: Error occurred: ${error.error}`,
            "error"
          );
        },
        onPromptComplete: (promptResponse: PassagePromptResponse) => {
          addLog(
            `🎯 ${presentationStyle} prompt: ${promptResponse.name} = ${promptResponse.content}`,
            "success"
          );
          setPromptResults((prev) => [...prev, promptResponse]);
        },
      };

      // Add container for embed mode
      if (presentationStyle === "embed") {
        const embedContainer = document.querySelector("#embed-container");
        console.log("[BasicExample] Embed container found:", embedContainer);
        openOptions.container = embedContainer || "#embed-container";
      }

      await passage.open(openOptions);

      addLog(`🚀 Passage ${presentationStyle} opened successfully!`);
    } catch (error) {
      addLog(`❌ Failed to open ${presentationStyle}: ${error}`, "error");
    }
  };

  const handleInitializeAndOpen = async () => {
    setLoading(true);
    setPromptResults([]);
    addLog("🚀 Initialize and Open in one step...");

    // Validate integrationId is selected
    if (!integrationId) {
      addLog("❌ Please select an integration type first", "error");
      setLoading(false);
      return;
    }

    const promptsToSend: PassagePrompt[] = [];
    if (prompt.name && prompt.value) {
      promptsToSend.push(prompt);
    }

    try {
      // Step 1: Initialize
      addLog("1️⃣ Initializing Passage...");
      await passage.initialize({
        publishableKey,
        integrationId: integrationId || undefined,
        prompts: promptsToSend.length > 0 ? promptsToSend : undefined,
        onConnectionComplete: (data: PassageSuccessData) => {
          addLog(
            `✅ Connection complete! Connection ID: ${data.connectionId}`,
            "success"
          );
          addLog(
            `Data received: ${JSON.stringify(data.data, null, 2)}`,
            "success"
          );
        },
        onError: (error: PassageErrorData) => {
          addLog(`❌ Error: ${error.error} (Code: ${error.code})`, "error");
        },
        onDataComplete: (data) => {
          addLog(
            `📊 Data processing complete: ${JSON.stringify(data, null, 2)}`,
            "success"
          );
        },
        onPromptComplete: (promptResponse: PassagePromptResponse) => {
          addLog(
            `🎯 Prompt completed: ${promptResponse.name} = ${promptResponse.content}`,
            "success"
          );
          setPromptResults((prev) => [...prev, promptResponse]);
        },
        onExit: (reason) => {
          addLog(`👋 User exited: ${reason || "unknown reason"}`);
        },
      });

      setIsInitialized(true);
      addLog("✅ Initialization complete!", "success");

      // Step 2: Open modal (add small delay to ensure state is updated)
      addLog(`2️⃣ Opening Passage ${presentationStyle}...`);
      await new Promise((resolve) => setTimeout(resolve, 100)); // Allow state to update

      const openOptions: any = {
        presentationStyle,
        onConnectionComplete: (data: PassageSuccessData) => {
          addLog(
            `✅ ${presentationStyle}: Connection complete! Status: ${data.status}`,
            "success"
          );
        },
        onError: (error: PassageErrorData) => {
          addLog(
            `❌ ${presentationStyle}: Error occurred: ${error.error}`,
            "error"
          );
        },
        onPromptComplete: (promptResponse: PassagePromptResponse) => {
          addLog(
            `🎯 ${presentationStyle} prompt: ${promptResponse.name} = ${promptResponse.content}`,
            "success"
          );
          setPromptResults((prev) => [...prev, promptResponse]);
        },
      };

      // Add container for embed mode
      if (presentationStyle === "embed") {
        const embedContainer = document.querySelector("#embed-container");
        console.log(
          "[BasicExample] Initialize&Open - Embed container found:",
          embedContainer
        );
        openOptions.container = embedContainer || "#embed-container";
      }

      await passage.open(openOptions);

      addLog("🎉 Initialize and Open completed successfully!", "success");
    } catch (error) {
      addLog(`❌ Initialize and Open failed: ${error}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    addLog("🔄 Reloading page...");
    window.location.reload();
  };

  const handleGetData = async () => {
    addLog("Retrieving session data...");
    const data = await passage.getData();
    addLog(`📊 Session data: ${JSON.stringify(data, null, 2)}`, "success");
    if (data.length > 0) {
      const lastResult = data[0];
      setPromptResults(lastResult.prompts || []);
    }
  };

  const clearLogs = () => {
    setLogs([]);
    setPromptResults([]);
  };

  return (
    <>
      <div className="example-card">
        <h3>🚀 Basic Usage with Prompts</h3>
        <p>
          Initialize with your publishable key and optionally configure a prompt
          for data collection. Choose between modal or embedded presentation.
        </p>
        <div className="input-group">
          <label htmlFor="basic-publishable-key">Publishable Key:</label>
          <input
            id="basic-publishable-key"
            type="text"
            value={publishableKey}
            onChange={(e) => setPublishableKey(e.target.value)}
            placeholder="Enter your publishable key"
            disabled={isInitialized}
          />
        </div>

        <div className="input-group">
          <label htmlFor="integration-select">Integration ID Type:</label>
          <select
            id="integration-select"
            value={selectedIntegration}
            onChange={(e) => {
              setSelectedIntegration(e.target.value);
              setIntegrationId(e.target.value);
            }}
            disabled={isInitialized}
            style={{
              padding: "0.5rem",
              border: "1px solid #e2e8f0",
              borderRadius: "4px",
              background: "white",
              width: "100%",
            }}
          >
            <option value="">Select an integrationid type</option>
            {integrationOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="input-group">
          <label htmlFor="presentation-select">Presentation Mode:</label>
          <select
            id="presentation-select"
            value={presentationStyle}
            onChange={(e) =>
              setPresentationStyle(e.target.value as "modal" | "embed")
            }
            style={{
              padding: "0.5rem",
              border: "1px solid #e2e8f0",
              borderRadius: "4px",
              background: "white",
              width: "100%",
            }}
          >
            <option value="modal">Modal</option>
            <option value="embed">Embed</option>
          </select>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label
            style={{
              fontWeight: 600,
              marginBottom: "0.5rem",
              display: "block",
            }}
          >
            Optional Prompt Configuration:
          </label>

          <div
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              padding: "1rem",
              background: "#f9fafb",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.5rem",
                marginBottom: "0.5rem",
              }}
            >
              <input
                type="text"
                placeholder="Prompt name (e.g., book_list)"
                value={prompt.name}
                onChange={(e) => updatePrompt("name", e.target.value)}
                disabled={isInitialized}
                style={{
                  padding: "0.5rem",
                  border: "1px solid #e2e8f0",
                  borderRadius: "4px",
                }}
              />
              <input
                type="text"
                placeholder="Prompt value (e.g., return a list of my books with with a description of each)"
                value={prompt.value}
                onChange={(e) => updatePrompt("value", e.target.value)}
                disabled={isInitialized}
                style={{
                  padding: "0.5rem",
                  border: "1px solid #e2e8f0",
                  borderRadius: "4px",
                }}
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.5rem",
                marginBottom: "0.5rem",
              }}
            >
              <select
                value={prompt.outputType}
                onChange={(e) => {
                  updatePrompt("outputType", e.target.value);
                  updatePrompt(
                    "outputFormat",
                    JSON.stringify(defaultSchema, null, 2)
                  );
                }}
                disabled={isInitialized}
                style={{
                  padding: "0.5rem",
                  border: "1px solid #e2e8f0",
                  borderRadius: "4px",
                  background: "white",
                }}
              >
                <option value="text">Text</option>
                <option value="json">JSON</option>
              </select>

              {prompt.outputType === "json" && (
                <textarea
                  placeholder="JSON output format (e.g., { 'name': 'string', 'age': 'number' })"
                  value={prompt.outputFormat}
                  onChange={(e) => updatePrompt("outputFormat", e.target.value)}
                  disabled={isInitialized}
                  autoComplete="off"
                  style={{
                    padding: "0.5rem",
                    border: "1px solid #e2e8f0",
                    borderRadius: "4px",
                    resize: "vertical",
                    minHeight: "60px",
                  }}
                />
              )}
            </div>
          </div>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <button
            className="button"
            onClick={handleInitialize}
            disabled={loading || isInitialized}
          >
            {loading
              ? "Initializing..."
              : isInitialized
                ? "✅ Initialized"
                : "1. Initialize"}
          </button>

          <button
            className="button"
            onClick={handleOpen}
            disabled={!isInitialized}
          >
            2. Open {presentationStyle === "modal" ? "Modal" : "Embed"}
          </button>

          <button
            className="button"
            onClick={handleInitializeAndOpen}
            disabled={loading}
            style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              border: "none",
              color: "white",
              fontWeight: "600",
            }}
          >
            {loading
              ? "🚀 Processing..."
              : `🚀 Initialize & Open ${presentationStyle === "modal" ? "Modal" : "Embed"}`}
          </button>

          <button className="button secondary" onClick={handleGetData}>
            Get Data
          </button>

          <button
            className="button secondary"
            onClick={handleReset}
            style={{ marginLeft: "auto" }}
          >
            🔄 Reset
          </button>
        </div>

        {promptResults.length > 0 && (
          <div
            className="status-display success"
            style={{ marginBottom: "1rem" }}
          >
            <h4 style={{ marginBottom: "0.5rem" }}>
              📊 Collected Prompt Results:
            </h4>
            {promptResults.map((result, index) => (
              <div
                key={index}
                style={{
                  background: "rgba(255,255,255,0.5)",
                  padding: "0.5rem",
                  borderRadius: "4px",
                  marginBottom: "0.25rem",
                }}
              >
                <strong>{result.name}:</strong> {result.content}
              </div>
            ))}
          </div>
        )}

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

      {/* Embed Container as separate example card */}
      {presentationStyle === "embed" && (
        <div className="example-card">
          <h3>📱 Embed Container</h3>
          <p>
            The Passage flow will be embedded in this container when you open
            it.
          </p>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              marginTop: "1rem",
            }}
          >
            <div>
              <div style={{ marginBottom: "0.5rem", textAlign: "center" }}>
                <label style={{ fontWeight: 600, color: "#2d3748" }}></label>
              </div>
              <div id="embed-container" className="embed-container"></div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BasicExample;
