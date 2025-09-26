import React, { useState, useEffect } from "react";
import {
  usePassage,
  PassageSuccessData,
  PassageErrorData,
  PassagePrompt,
  PassagePromptResponse,
} from "@getpassage/react-js";
import LogDisplay from "./LogDisplay";
import JsonExplorerMulti from "./JsonExplorerMulti";

const BasicExample: React.FC = () => {
  const passage = usePassage();

  // Helper function to get integration from URL
  const getIntegrationFromUrl = (): string => {
    const path = window.location.pathname;
    const integration = path.slice(1); // Remove leading slash
    return integration || "passage-test"; // Default to passage-test if no integration in URL
  };

  const [publishableKey, setPublishableKey] = useState(
    "pk-live-0d017c4c-307e-441c-8b72-cb60f64f77f8"
  );
  const [integrationId, setIntegrationId] = useState(getIntegrationFromUrl());
  const [selectedIntegration, setSelectedIntegration] = useState<string>(
    getIntegrationFromUrl()
  );
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
  const [recordMode, setRecordMode] = useState(false);
  const [products, setProducts] = useState<string[]>([]);
  const [sessionArgs, setSessionArgs] = useState<string>("");
  const [integrationOptions, setIntegrationOptions] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [integrationsLoading, setIntegrationsLoading] = useState(true);
  const [formattedJsonData, setFormattedJsonData] = useState<string>("");
  const [connectionResults, setConnectionResults] = useState<any[]>([]);

  // Fetch integrations from API
  useEffect(() => {
    const fetchIntegrations = async () => {
      try {
        setIntegrationsLoading(true);
        // Get API URL from query params or use default
        const searchParams = new URLSearchParams(window.location.search);
        const apiUrlFromQuery = searchParams.get("apiUrl");
        const apiUrl = apiUrlFromQuery || "https://api.runpassage.ai";
        const response = await fetch(`${apiUrl}/integrations`);

        if (!response.ok) {
          throw new Error(`Failed to fetch integrations: ${response.status}`);
        }

        const data = await response.json();

        // Transform API response to options format
        const fetchedOptions = data.map((integration: any) => ({
          value: integration.slug,
          label: integration.name,
        }));

        // Combine hardcoded test integrations with fetched ones
        const hardcodedOptions = [
          {
            value: "passage-test-captcha",
            label: "Passage Test Integration (with CAPTCHA)",
          },
          { value: "passage-test", label: "Passage Test Integration" },
        ];

        // Create a map to avoid duplicates, with hardcoded options taking precedence
        const optionsMap = new Map();

        // Add hardcoded options first (they take precedence)
        hardcodedOptions.forEach((option) => {
          optionsMap.set(option.value, option);
        });

        // Add fetched options, but don't override hardcoded ones
        fetchedOptions.forEach((option: any) => {
          if (!optionsMap.has(option.value)) {
            optionsMap.set(option.value, option);
          }
        });

        setIntegrationOptions(Array.from(optionsMap.values()));
      } catch (error) {
        console.error("Failed to fetch integrations:", error);
        // Fallback to only hardcoded test integrations if API fails
        setIntegrationOptions([
          {
            value: "passage-test-captcha",
            label: "Passage Test Integration (with CAPTCHA)",
          },
          { value: "passage-test", label: "Passage Test Integration" },
        ]);
      } finally {
        setIntegrationsLoading(false);
      }
    };

    fetchIntegrations();
  }, []);

  // Effect to handle URL changes and validate integration
  useEffect(() => {
    // Only run validation if integrations have been loaded
    if (integrationOptions.length === 0) return;

    const handleUrlChange = () => {
      const integration = getIntegrationFromUrl();
      const validIntegrations = integrationOptions
        .map((opt) => opt.value)
        .filter(Boolean);

      // Check if the integration from URL is valid
      if (integration && validIntegrations.includes(integration)) {
        setIntegrationId(integration);
        setSelectedIntegration(integration);
      } else if (integration && integration !== "passage-test") {
        // Invalid integration in URL, but not empty - log warning and use default
        console.warn(
          `Invalid integration "${integration}" in URL. Using default "passage-test".`
        );
        // Update URL to reflect the default, preserving query parameters
        const queryString = window.location.search;
        window.history.replaceState({}, "", "/passage-test" + queryString);
        setIntegrationId("passage-test");
        setSelectedIntegration("passage-test");
      }

      // Handle products from URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const productsParam = urlParams.get("products");
      if (productsParam) {
        const urlProducts = productsParam.split(",").filter(Boolean);
        const validProducts = ["history", "info", "add-balance", "switch-card"];
        const filteredProducts = urlProducts.filter((product) =>
          validProducts.includes(product)
        );
        if (filteredProducts.length > 0) {
          setProducts(filteredProducts);
        }
      }

      // Handle session args from URL parameters
      const sessionArgsParam = urlParams.get("sessionArgs");
      if (sessionArgsParam) {
        try {
          // Validate JSON before setting
          JSON.parse(sessionArgsParam);
          setSessionArgs(sessionArgsParam);
        } catch (error) {
          console.warn("Invalid JSON in sessionArgs URL parameter");
        }
      }
    };

    // Handle initial load
    handleUrlChange();

    // Listen for browser back/forward navigation
    const handlePopState = () => {
      handleUrlChange();
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [integrationOptions]);

  // Effect to handle session args when products change
  useEffect(() => {
    if (products.length === 0) {
      setSessionArgs("");
      return;
    }

    try {
      const currentArgs = sessionArgs.trim() ? JSON.parse(sessionArgs) : {};
      let hasChanges = false;

      // Add history fields if history is selected
      if (products.includes("history") && !currentArgs.limit) {
        currentArgs.limit = 20;
        hasChanges = true;
      }

      // Add add-balance fields if add-balance is selected
      if (products.includes("add-balance")) {
        if (!currentArgs.primaryCode) {
          currentArgs.primaryCode = "1234567890";
          hasChanges = true;
        }
        if (!currentArgs.secondaryCode) {
          currentArgs.secondaryCode = "0987654321";
          hasChanges = true;
        }
        if (!currentArgs.amount) {
          currentArgs.amount = 100;
          hasChanges = true;
        }
      }

      // Add switch-card fields if switch-card is selected
      if (products.includes("switch-card")) {
        if (!currentArgs.cardNumber) {
          currentArgs.cardNumber = "1234567890";
          hasChanges = true;
        }
        if (!currentArgs.expirationDate) {
          currentArgs.expirationDate = "12/2025";
          hasChanges = true;
        }
        if (!currentArgs.cvv) {
          currentArgs.cvv = "123";
          hasChanges = true;
        }
        if (!currentArgs.nameOnCard) {
          currentArgs.nameOnCard = "John Doe";
          hasChanges = true;
        }
        if (!currentArgs.billingAddress) {
          currentArgs.billingAddress = "20 West 34th Street";
          hasChanges = true;
        }
        if (!currentArgs.billingCity) {
          currentArgs.billingCity = "New York";
          hasChanges = true;
        }
        if (!currentArgs.billingState) {
          currentArgs.billingState = "NY";
          hasChanges = true;
        }
        if (!currentArgs.billingZip) {
          currentArgs.billingZip = "10001";
          hasChanges = true;
        }
        if (!currentArgs.billingCountry) {
          currentArgs.billingCountry = "United States";
          hasChanges = true;
        }
      }

      if (hasChanges) {
        const newSessionArgs = JSON.stringify(currentArgs, null, 2);
        setSessionArgs(newSessionArgs);
        updateUrlForSessionArgs(newSessionArgs);
      }
    } catch (error) {
      // If JSON is invalid, create new object based on selected products
      const newArgs: any = {};

      if (products.includes("history")) {
        newArgs.limit = 20;
      }
      if (products.includes("add-balance")) {
        newArgs.primaryCode = "1234567890";
        newArgs.secondaryCode = "0987654321";
        newArgs.amount = 100;
      }
      if (products.includes("switch-card")) {
        newArgs.cardNumber = "1234567890";
        newArgs.expirationDate = "12/2025";
        newArgs.cvv = "123";
        newArgs.nameOnCard = "John Doe";
        newArgs.billingAddress = "20 West 34th Street";
        newArgs.billingCity = "New York";
        newArgs.billingState = "NY";
        newArgs.billingZip = "10001";
        newArgs.billingCountry = "United States";
      }

      if (Object.keys(newArgs).length > 0) {
        const newSessionArgs = JSON.stringify(newArgs, null, 2);
        setSessionArgs(newSessionArgs);
        updateUrlForSessionArgs(newSessionArgs);
      }
    }
  }, [products]);

  // Function to update URL when integration changes
  const updateUrlForIntegration = (integration: string) => {
    const newPath = integration ? `/${integration}` : "/";
    // Preserve existing query parameters
    const queryString = window.location.search;
    const newUrl = newPath + queryString;
    window.history.pushState({}, "", newUrl);
  };

  // Function to update URL when products change
  const updateUrlForProducts = (newProducts: string[]) => {
    const url = new URL(window.location.href);
    if (newProducts.length > 0) {
      url.searchParams.set("products", newProducts.join(","));
    } else {
      url.searchParams.delete("products");
    }
    window.history.pushState({}, "", url.toString());
  };

  // Function to update URL when session args change
  const updateUrlForSessionArgs = (newSessionArgs: string) => {
    const url = new URL(window.location.href);
    if (newSessionArgs.trim()) {
      try {
        // Validate JSON before adding to URL
        JSON.parse(newSessionArgs);
        url.searchParams.set("sessionArgs", newSessionArgs);
      } catch (error) {
        // If invalid JSON, don't update URL
        console.warn("Invalid JSON in session args, not updating URL");
        return;
      }
    } else {
      url.searchParams.delete("sessionArgs");
    }
    window.history.pushState({}, "", url.toString());
  };

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
    if (recordMode) {
      addLog("📹 Record mode enabled - session will be recorded", "info");
    }

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
      // Parse sessionArgs JSON if provided
      let parsedSessionArgs = {};
      if (sessionArgs.trim()) {
        try {
          parsedSessionArgs = JSON.parse(sessionArgs);
        } catch (error) {
          addLog(`❌ Invalid JSON in session args: ${error}`, "error");
          setLoading(false);
          return;
        }
      }

      await passage.initialize({
        publishableKey,
        integrationId: integrationId || undefined,
        prompts: promptsToSend.length > 0 ? promptsToSend : undefined,
        record: recordMode,
        products: products.length > 0 ? products : undefined,
        sessionArgs:
          Object.keys(parsedSessionArgs).length > 0
            ? parsedSessionArgs
            : undefined,
        onConnectionComplete: (data: PassageSuccessData) => {
          addLog(
            `✅ Connection complete! Connection ID: ${data.connectionId}`,
            "success"
          );
          addLog(
            `Data received: ${JSON.stringify(data.data, null, 2)}`,
            "success"
          );
          setConnectionResults(prev => [...prev, {
            type: data.status === 'done' ? 'done' : 'connectionComplete',
            timestamp: new Date().toISOString(),
            data: data
          }]);
        },
        onError: (error: PassageErrorData) => {
          addLog(`❌ Error: ${error.error} (Code: ${error.code})`, "error");
          setConnectionResults(prev => [...prev, {
            type: 'error',
            timestamp: new Date().toISOString(),
            data: error
          }]);
        },
        onDataComplete: (data) => {
          addLog(
            `📊 Data processing complete: ${JSON.stringify(data, null, 2)}`,
            "success"
          );
          setConnectionResults(prev => [...prev, {
            type: 'dataComplete',
            timestamp: new Date().toISOString(),
            data: data
          }]);
        },
        onPromptComplete: (promptResponse: PassagePromptResponse) => {
          addLog(
            `🎯 Prompt completed: ${promptResponse.name} = ${promptResponse.content}`,
            "success"
          );
          setPromptResults((prev) => [...prev, promptResponse]);
          setConnectionResults(prev => [...prev, {
            type: 'promptComplete',
            timestamp: new Date().toISOString(),
            data: promptResponse
          }]);
        },
        onExit: (reason) => {
          addLog(`👋 User exited: ${reason || "unknown reason"}`);
          setConnectionResults(prev => [...prev, {
            type: 'exit',
            timestamp: new Date().toISOString(),
            data: { reason: reason || "unknown reason" }
          }]);
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
      const openOptions: any = {
        presentationStyle,
        onConnectionComplete: (data: PassageSuccessData) => {
          addLog(
            `✅ ${presentationStyle}: Connection complete! Status: ${data.status}`,
            "success"
          );
          setConnectionResults(prev => [...prev, {
            type: data.status === 'done' ? 'done' : 'connectionComplete',
            timestamp: new Date().toISOString(),
            presentationStyle: presentationStyle,
            data: data
          }]);
        },
        onError: (error: PassageErrorData) => {
          addLog(
            `❌ ${presentationStyle}: Error occurred: ${error.error}`,
            "error"
          );
          setConnectionResults(prev => [...prev, {
            type: 'error',
            timestamp: new Date().toISOString(),
            presentationStyle: presentationStyle,
            data: error
          }]);
        },
        onPromptComplete: (promptResponse: PassagePromptResponse) => {
          addLog(
            `🎯 ${presentationStyle} prompt: ${promptResponse.name} = ${promptResponse.content}`,
            "success"
          );
          setPromptResults((prev) => [...prev, promptResponse]);
          setConnectionResults(prev => [...prev, {
            type: 'promptComplete',
            timestamp: new Date().toISOString(),
            presentationStyle: presentationStyle,
            data: promptResponse
          }]);
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
    if (recordMode) {
      addLog("📹 Record mode enabled - session will be recorded", "info");
    }

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
      // Parse sessionArgs JSON if provided
      let parsedSessionArgs = {};
      if (sessionArgs.trim()) {
        try {
          parsedSessionArgs = JSON.parse(sessionArgs);
        } catch (error) {
          addLog(`❌ Invalid JSON in session args: ${error}`, "error");
          setLoading(false);
          return;
        }
      }

      // Step 1: Initialize
      addLog("1️⃣ Initializing Passage...");
      await passage.initialize({
        publishableKey,
        integrationId: integrationId || undefined,
        prompts: promptsToSend.length > 0 ? promptsToSend : undefined,
        record: recordMode,
        products: products.length > 0 ? products : undefined,
        sessionArgs:
          Object.keys(parsedSessionArgs).length > 0
            ? parsedSessionArgs
            : undefined,
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
          setConnectionResults(prev => [...prev, {
            type: data.status === 'done' ? 'done' : 'connectionComplete',
            timestamp: new Date().toISOString(),
            presentationStyle: presentationStyle,
            data: data
          }]);
        },
        onError: (error: PassageErrorData) => {
          addLog(
            `❌ ${presentationStyle}: Error occurred: ${error.error}`,
            "error"
          );
          setConnectionResults(prev => [...prev, {
            type: 'error',
            timestamp: new Date().toISOString(),
            presentationStyle: presentationStyle,
            data: error
          }]);
        },
        onPromptComplete: (promptResponse: PassagePromptResponse) => {
          addLog(
            `🎯 ${presentationStyle} prompt: ${promptResponse.name} = ${promptResponse.content}`,
            "success"
          );
          setPromptResults((prev) => [...prev, promptResponse]);
          setConnectionResults(prev => [...prev, {
            type: 'promptComplete',
            timestamp: new Date().toISOString(),
            presentationStyle: presentationStyle,
            data: promptResponse
          }]);
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
    const formattedData = JSON.stringify(data, null, 2);
    setFormattedJsonData(formattedData);
    addLog(`📊 Session data: ${formattedData}`, "success");
    if (data.length > 0) {
      const lastResult = data[0];
      setPromptResults(lastResult.prompts || []);
    }
  };

  const clearLogs = () => {
    setLogs([]);
    setPromptResults([]);
  };

  const clearConnectionResults = () => {
    setConnectionResults([]);
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
              const newIntegration = e.target.value;
              setSelectedIntegration(newIntegration);
              setIntegrationId(newIntegration);
              updateUrlForIntegration(newIntegration);
            }}
            disabled={isInitialized || integrationsLoading}
            style={{
              padding: "0.5rem",
              border: "1px solid #e2e8f0",
              borderRadius: "4px",
              background: "white",
              width: "100%",
            }}
          >
            {integrationsLoading ? (
              <option value="">Loading integrations...</option>
            ) : (
              <>
                <option value="">Select an integration type</option>
                {integrationOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </>
            )}
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

        <div className="input-group">
          <label
            htmlFor="record-mode-checkbox"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <input
              id="record-mode-checkbox"
              type="checkbox"
              checked={recordMode}
              onChange={(e) => setRecordMode(e.target.checked)}
              disabled={isInitialized}
              style={{
                width: "16px",
                height: "16px",
                cursor: "pointer",
              }}
            />
            Record Mode
          </label>
          <div
            style={{
              fontSize: "0.875rem",
              color: "#6b7280",
              marginTop: "0.25rem",
            }}
          >
            Enable recording mode for session replay and debugging
          </div>
        </div>

        <div className="input-group">
          <label
            style={{
              fontWeight: 600,
              marginBottom: "0.5rem",
              display: "block",
            }}
          >
            Products Configuration:
          </label>
          <div
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              padding: "1rem",
              background: "#f9fafb",
            }}
          >
            {["history", "info", "add-balance", "switch-card"].map(
              (product) => (
                <label
                  key={product}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginBottom: "0.5rem",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={products.includes(product)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        const newProducts = [...products, product];
                        setProducts(newProducts);
                        updateUrlForProducts(newProducts);
                        // Auto-populate session args when history is checked
                        if (product === "history" && !sessionArgs.trim()) {
                          const newSessionArgs = '{\n  "limit": 20\n}';
                          setSessionArgs(newSessionArgs);
                          updateUrlForSessionArgs(newSessionArgs);
                        }
                        // Auto-populate session args when add-balance is checked
                        if (product === "add-balance") {
                          try {
                            const currentArgs = sessionArgs.trim()
                              ? JSON.parse(sessionArgs)
                              : {};
                            currentArgs.primaryCode = "1234567890";
                            currentArgs.secondaryCode = "0987654321";
                            currentArgs.amount = 100;
                            const newSessionArgs = JSON.stringify(
                              currentArgs,
                              null,
                              2
                            );
                            setSessionArgs(newSessionArgs);
                            updateUrlForSessionArgs(newSessionArgs);
                          } catch (error) {
                            // If JSON is invalid, create new object with add-balance fields
                            const newSessionArgs =
                              '{\n  "primaryCode": "1234567890",\n  "secondaryCode": "0987654321",\n  "amount": 100\n}';
                            setSessionArgs(newSessionArgs);
                            updateUrlForSessionArgs(newSessionArgs);
                          }
                        }
                        // Auto-populate session args when switch-card is checked
                        if (product === "switch-card") {
                          try {
                            const currentArgs = sessionArgs.trim()
                              ? JSON.parse(sessionArgs)
                              : {};
                            currentArgs.cardNumber = "1234567890";
                            currentArgs.expirationDate = "12/2025";
                            currentArgs.cvv = "123";
                            currentArgs.nameOnCard = "John Doe";
                            currentArgs.billingAddress = "20 West 34th Street";
                            currentArgs.billingCity = "New York";
                            currentArgs.billingState = "NY";
                            currentArgs.billingZip = "10001";
                            currentArgs.billingCountry = "United States";
                            const newSessionArgs = JSON.stringify(
                              currentArgs,
                              null,
                              2
                            );
                            setSessionArgs(newSessionArgs);
                            updateUrlForSessionArgs(newSessionArgs);
                          } catch (error) {
                            // If JSON is invalid, create new object with switch-card fields
                            const newSessionArgs =
                              '{\n  "cardNumber": "1234567890",\n  "expirationDate": "12/2025",\n  "cvv": "123",\n  "nameOnCard": "John Doe",\n  "billingAddress": "20 West 34th Street",\n  "billingCity": "New York",\n  "billingState": "NY",\n  "billingZip": "10001",\n  "billingCountry": "United States"\n}';
                            setSessionArgs(newSessionArgs);
                            updateUrlForSessionArgs(newSessionArgs);
                          }
                        }
                      } else {
                        const newProducts = products.filter(
                          (p) => p !== product
                        );
                        setProducts(newProducts);
                        updateUrlForProducts(newProducts);
                        // Remove limit from session args when history is unchecked
                        if (product === "history") {
                          try {
                            const currentArgs = JSON.parse(sessionArgs);
                            delete currentArgs.limit;
                            const remainingKeys = Object.keys(currentArgs);
                            if (remainingKeys.length === 0) {
                              setSessionArgs("");
                              updateUrlForSessionArgs("");
                            } else {
                              const newSessionArgs = JSON.stringify(
                                currentArgs,
                                null,
                                2
                              );
                              setSessionArgs(newSessionArgs);
                              updateUrlForSessionArgs(newSessionArgs);
                            }
                          } catch (error) {
                            // If JSON is invalid, just clear it
                            setSessionArgs("");
                            updateUrlForSessionArgs("");
                          }
                        }
                        // Remove add-balance fields when add-balance is unchecked
                        if (product === "add-balance") {
                          try {
                            const currentArgs = JSON.parse(sessionArgs);
                            delete currentArgs.primaryCode;
                            delete currentArgs.secondaryCode;
                            delete currentArgs.amount;
                            const remainingKeys = Object.keys(currentArgs);
                            if (remainingKeys.length === 0) {
                              setSessionArgs("");
                              updateUrlForSessionArgs("");
                            } else {
                              const newSessionArgs = JSON.stringify(
                                currentArgs,
                                null,
                                2
                              );
                              setSessionArgs(newSessionArgs);
                              updateUrlForSessionArgs(newSessionArgs);
                            }
                          } catch (error) {
                            // If JSON is invalid, just clear it
                            setSessionArgs("");
                            updateUrlForSessionArgs("");
                          }
                        }
                        // Remove switch-card fields when switch-card is unchecked
                        if (product === "switch-card") {
                          try {
                            const currentArgs = JSON.parse(sessionArgs);
                            delete currentArgs.cardNumber;
                            delete currentArgs.expirationDate;
                            delete currentArgs.cvv;
                            delete currentArgs.nameOnCard;
                            delete currentArgs.billingAddress;
                            delete currentArgs.billingCity;
                            delete currentArgs.billingState;
                            delete currentArgs.billingZip;
                            delete currentArgs.billingCountry;
                            const remainingKeys = Object.keys(currentArgs);
                            if (remainingKeys.length === 0) {
                              setSessionArgs("");
                              updateUrlForSessionArgs("");
                            } else {
                              const newSessionArgs = JSON.stringify(
                                currentArgs,
                                null,
                                2
                              );
                              setSessionArgs(newSessionArgs);
                              updateUrlForSessionArgs(newSessionArgs);
                            }
                          } catch (error) {
                            // If JSON is invalid, just clear it
                            setSessionArgs("");
                            updateUrlForSessionArgs("");
                          }
                        }
                      }
                    }}
                    disabled={isInitialized}
                    style={{
                      width: "16px",
                      height: "16px",
                      cursor: "pointer",
                    }}
                  />
                  {product}
                </label>
              )
            )}
          </div>
        </div>

        <div className="input-group">
          <label
            style={{
              fontWeight: 600,
              marginBottom: "0.5rem",
              display: "block",
            }}
          >
            Session Args (JSON):
          </label>
          <textarea
            value={sessionArgs}
            onChange={(e) => {
              setSessionArgs(e.target.value);
              updateUrlForSessionArgs(e.target.value);
            }}
            placeholder='{"key": "value"}'
            disabled={isInitialized}
            style={{
              width: "100%",
              padding: "0.5rem",
              border: "1px solid #e2e8f0",
              borderRadius: "4px",
              resize: "vertical",
              minHeight: "80px",
              fontFamily: "monospace",
            }}
          />
          <div
            style={{
              fontSize: "0.875rem",
              color: "#6b7280",
              marginTop: "0.25rem",
            }}
          >
            Enter a valid JSON object that will be passed as sessionArgs
          </div>
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

        {formattedJsonData && (
          <div
            className="status-display success"
            style={{ marginBottom: "1rem" }}
          >
            <h4 style={{ marginBottom: "0.5rem" }}>
              📋 Session Data:
            </h4>
            <div
              style={{
                maxHeight: "400px",
                overflowY: "auto",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                padding: "1rem",
                background: "#f9fafb",
              }}
            >
              {(() => {
                try {
                  const data = JSON.parse(formattedJsonData);
                  return (
                    <div>
                      <div style={{ marginBottom: "1rem", padding: "0.5rem", background: "#e2e8f0", borderRadius: "4px" }}>
                        <strong>Total Sessions:</strong> {data.length}
                      </div>
                      {data.map((session: any, sessionIndex: number) => (
                        <div key={sessionIndex} style={{ marginBottom: "1.5rem", border: "1px solid #d1d5db", borderRadius: "8px", padding: "1rem", background: "white" }}>
                          <div style={{ marginBottom: "0.5rem", fontSize: "0.875rem", color: "#6b7280" }}>
                            <strong>Session {sessionIndex + 1}</strong> - {new Date(session.timestamp).toLocaleString()}
                          </div>
                          <div style={{ marginBottom: "0.5rem", fontSize: "0.75rem", color: "#9ca3af", wordBreak: "break-all" }}>
                            <strong>Intent Token:</strong> {session.intentToken.substring(0, 50)}...
                          </div>
                          {session.data && session.data.length > 0 && (
                            <div>
                              <div style={{ marginBottom: "0.5rem", fontWeight: "600", color: "#374151" }}>
                                Videos ({session.data.length}):
                              </div>
                              <div style={{ display: "grid", gap: "0.75rem" }}>
                                {session.data.map((video: any, videoIndex: number) => (
                                  <div key={videoIndex} style={{ 
                                    border: "1px solid #e5e7eb", 
                                    borderRadius: "6px", 
                                    padding: "0.75rem", 
                                    background: "#fafafa",
                                    display: "flex",
                                    gap: "0.75rem"
                                  }}>
                                    <div style={{ flex: "0 0 120px" }}>
                                      <img 
                                        src={video.thumbnailUrl} 
                                        alt={video.title}
                                        style={{ 
                                          width: "100%", 
                                          height: "68px", 
                                          objectFit: "cover", 
                                          borderRadius: "4px" 
                                        }}
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                      />
                                    </div>
                                    <div style={{ flex: "1" }}>
                                      <div style={{ fontWeight: "600", marginBottom: "0.25rem", fontSize: "0.875rem", lineHeight: "1.25" }}>
                                        {video.title}
                                      </div>
                                      <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>
                                        <strong>Channel:</strong> {video.channel}
                                      </div>
                                      <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>
                                        <strong>Duration:</strong> {video.duration}
                                      </div>
                                      <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>
                                        <strong>Watched:</strong> {new Date(video.watchedAt).toLocaleString()}
                                      </div>
                                      <div style={{ fontSize: "0.75rem", color: "#6b7280", lineHeight: "1.25" }}>
                                        {video.description}
                                      </div>
                                      <div style={{ marginTop: "0.25rem" }}>
                                        <a 
                                          href={video.videoUrl} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          style={{ 
                                            fontSize: "0.75rem", 
                                            color: "#3b82f6", 
                                            textDecoration: "none" 
                                          }}
                                        >
                                          Watch Video →
                                        </a>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {session.prompts && session.prompts.length > 0 && (
                            <div style={{ marginTop: "1rem" }}>
                              <div style={{ fontWeight: "600", marginBottom: "0.5rem", color: "#374151" }}>
                                Prompts ({session.prompts.length}):
                              </div>
                              {session.prompts.map((prompt: any, promptIndex: number) => (
                                <div key={promptIndex} style={{ 
                                  background: "#f3f4f6", 
                                  padding: "0.5rem", 
                                  borderRadius: "4px", 
                                  marginBottom: "0.25rem",
                                  fontSize: "0.75rem"
                                }}>
                                  <strong>{prompt.name}:</strong> {prompt.content}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                } catch (error) {
                  return (
                    <div style={{ color: "#dc2626", fontFamily: "monospace", fontSize: "0.875rem" }}>
                      Error parsing data: {error instanceof Error ? error.message : String(error)}
                    </div>
                  );
                }
              })()}
            </div>
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

        {connectionResults.length > 0 && (
          <div style={{ marginTop: "1.5rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
              }}
            >
              <span style={{ fontWeight: 600 }}>Connection Results Explorer:</span>
              <button
                className="button secondary"
                onClick={clearConnectionResults}
                style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}
              >
                Clear Results
              </button>
            </div>
            <JsonExplorerMulti
              data={connectionResults}
              title="All Handler Results"
              maxHeight="500px"
            />
          </div>
        )}
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
