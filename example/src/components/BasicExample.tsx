import React, { useState, useEffect } from "react";
import {
  usePassage,
  configure,
  PassageSuccessData,
  PassageErrorData,
  PassagePrompt,
  PassagePromptResponse,
  DEFAULT_API_BASE_URL,
  createIntentTokenLink,
} from "@getpassage/react-js";
import LogDisplay from "./LogDisplay";
import JsonExplorerMulti from "./JsonExplorerMulti";
import TanStackDataTable from "./TanStackDataTable";

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
  const [currentToken, setCurrentToken] = useState<string | null>(null);
  const [logs, setLogs] = useState<
    Array<{
      timestamp: string;
      message: string;
      type: "info" | "success" | "error";
    }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [recordMode, setRecordMode] = useState(false);
  const [resources, setResources] = useState<string[]>([]);
  const [dynamicFormFields, setDynamicFormFields] = useState<any[]>([]);
  const [formFieldValues, setFormFieldValues] = useState<Record<string, any>>(
    {}
  );
  const [integrationOptions, setIntegrationOptions] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [integrationsData, setIntegrationsData] = useState<any[]>([]);
  const [integrationsLoading, setIntegrationsLoading] = useState(true);
  const [formattedJsonData, setFormattedJsonData] = useState<string>("");
  const [connectionResults, setConnectionResults] = useState<any[]>([]);
  const [fetchedResourceData, setFetchedResourceData] = useState<any[]>([]);
  const [showResultAsTable, setShowResultAsTable] = useState(true);
  const [createdShortCode, setCreatedShortCode] = useState<string>('');
  const [isCreatingShortcode, setIsCreatingShortcode] = useState(false);
  const [maxUses, setMaxUses] = useState<number>(1);
  const [promptResults, setPromptResults] = useState<PassagePromptResponse[]>(
    []
  );
  const [returnUrl, setReturnUrl] = useState<string>("");

  // Function to get available resources for the selected integration
  const getAvailableResources = (integrationSlug: string) => {
    const integration = integrationsData.find(
      (int: any) => int.slug === integrationSlug
    );
    if (!integration || !integration.resources) {
      return [];
    }

    const resources: any[] = [];

    integration.resources.forEach((resource: any) => {
      const resourceName = resource.resourceType.name
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (str: string) => str.toUpperCase());

      // Add read operation if it exists
      if (resource.operations.read) {
        resources.push({
          value: `${resource.resourceType.name
            .toLowerCase()
            .replace(/([A-Z])/g, "-$1")
            .replace(/^-/, "")}-read`,
          label: `${resourceName} (Read)`,
          operation: "read",
          resource: resource,
        });
      }

      // Add write operation if it exists
      if (resource.operations.write) {
        resources.push({
          value: `${resource.resourceType.name
            .toLowerCase()
            .replace(/([A-Z])/g, "-$1")
            .replace(/^-/, "")}-write`,
          label: `${resourceName} (Write)`,
          operation: "write",
          resource: resource,
        });
      }
    });

    return resources;
  };

  // Function to generate dynamic form fields based on selected resources
  const generateFormFields = (selectedResources: string[]) => {
    const formFields: any[] = [];

    selectedResources.forEach((resourceValue) => {
      // Find the resource in the integrations data
      // Filter by current integration first to avoid conflicts
      const currentIntegration = integrationsData.find(
        (int: any) => int.slug === selectedIntegration
      );

      const integration =
        currentIntegration ||
        integrationsData.find((int: any) => {
          const hasResource = int.resources?.some((res: any) => {
            const readValue = `${res.resourceType.name
              .toLowerCase()
              .replace(/([A-Z])/g, "-$1")
              .replace(/^-/, "")}-read`;
            const writeValue = `${res.resourceType.name
              .toLowerCase()
              .replace(/([A-Z])/g, "-$1")
              .replace(/^-/, "")}-write`;
            return resourceValue === readValue || resourceValue === writeValue;
          });
          return hasResource;
        });

      if (integration) {
        integration.resources.forEach((resource: any) => {
          const readValue = `${resource.resourceType.name
            .toLowerCase()
            .replace(/([A-Z])/g, "-$1")
            .replace(/^-/, "")}-read`;
          const writeValue = `${resource.resourceType.name
            .toLowerCase()
            .replace(/([A-Z])/g, "-$1")
            .replace(/^-/, "")}-write`;

          if (
            resourceValue === readValue &&
            resource.operations.read?.arguments
          ) {
            formFields.push({
              resourceName: resource.resourceType.name,
              operation: "read",
              operationName: resource.operations.read.methodName,
              arguments: resource.operations.read.arguments,
              resourceValue: readValue,
            });
          }

          if (
            resourceValue === writeValue &&
            resource.operations.write?.arguments
          ) {
            formFields.push({
              resourceName: resource.resourceType.name,
              operation: "write",
              operationName: resource.operations.write.methodName,
              arguments: resource.operations.write.arguments,
              resourceValue: writeValue,
            });
          }
        });
      }
    });

    return formFields;
  };

  // Function to build the resources structure from form data
  const buildResourcesFromFormData = () => {
    const resourcesObj: any = {};

    // First, add all selected resources (even those without form fields)
    resources.forEach((resourceValue) => {
      // Extract resource name and operation from value (e.g., "trip-read" -> "trip", "read")
      const isWrite = resourceValue.endsWith("-write");
      const operation = isWrite ? "write" : "read";
      // Remove the operation suffix and convert to camelCase
      let resourceName = resourceValue
        .replace(/-read$/, "")
        .replace(/-write$/, "");

      // Convert kebab-case to camelCase (e.g., "account-info" -> "accountInfo")
      resourceName = resourceName.replace(/-([a-z])/g, (g) =>
        g[1].toUpperCase()
      );

      // Initialize resource if not exists
      if (!resourcesObj[resourceName]) {
        resourcesObj[resourceName] = {};
      }

      // Initialize operation with empty object
      if (!resourcesObj[resourceName][operation]) {
        resourcesObj[resourceName][operation] = {};
      }
    });

    // Then add form field values for resources that have them
    dynamicFormFields.forEach((field) => {
      // Convert PascalCase to camelCase (e.g., "Trip" -> "trip", "AccountInfo" -> "accountInfo")
      const resourceName =
        field.resourceName.charAt(0).toLowerCase() +
        field.resourceName.slice(1);
      const operation = field.operation;

      // Initialize resource if not exists (shouldn't happen if resources array is properly set)
      if (!resourcesObj[resourceName]) {
        resourcesObj[resourceName] = {};
      }

      // Initialize operation if not exists
      if (!resourcesObj[resourceName][operation]) {
        resourcesObj[resourceName][operation] = {};
      }

      // Add form field values for this operation
      if (field.arguments.properties) {
        Object.keys(field.arguments.properties).forEach((propName) => {
          const fieldKey = `${field.resourceValue}_${propName}`;
          if (
            formFieldValues[fieldKey] !== undefined &&
            formFieldValues[fieldKey] !== ""
          ) {
            resourcesObj[resourceName][operation][propName] =
              formFieldValues[fieldKey];
          }
        });
      }
    });

    return resourcesObj;
  };

  // Fetch integrations from API
  useEffect(() => {
    const fetchIntegrations = async () => {
      try {
        setIntegrationsLoading(true);
        // Get API URL from query params or use default
        const searchParams = new URLSearchParams(window.location.search);
        const apiUrlFromQuery = searchParams.get("apiUrl");
        const apiUrl =
          apiUrlFromQuery || DEFAULT_API_BASE_URL || "http://localhost:3000";
        const response = await fetch(`${apiUrl}/automation/integrations`);

        if (!response.ok) {
          throw new Error(`Failed to fetch integrations: ${response.status}`);
        }

        const data = await response.json();

        // Transform API response to options format
        // Handle both old format (array) and new format (object with integrations array)
        const integrations = data.integrations || data;
        setIntegrationsData(integrations);
        const fetchedOptions = integrations.map((integration: any) => ({
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

      // Handle resources from URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const resourcesParam = urlParams.get("resources");
      if (resourcesParam) {
        const urlResources = resourcesParam.split(",").filter(Boolean);
        const validResources = getAvailableResources(integration).map(
          (p: any) => p.value
        );
        const filteredResources = urlResources.filter((resource) =>
          validResources.includes(resource)
        );
        if (filteredResources.length > 0) {
          setResources(filteredResources);
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

  // Effect to update dynamic form fields when resources change
  useEffect(() => {
    const formFields = generateFormFields(resources);
    setDynamicFormFields(formFields);
  }, [resources, integrationsData]);

  // Function to update URL when integration changes
  const updateUrlForIntegration = (integration: string) => {
    const newPath = integration ? `/${integration}` : "/";
    // Preserve existing query parameters
    const queryString = window.location.search;
    const newUrl = newPath + queryString;
    window.history.pushState({}, "", newUrl);
  };

  // Function to update URL when resources change
  const updateUrlForResources = (newResources: string[]) => {
    const url = new URL(window.location.href);
    if (newResources.length > 0) {
      url.searchParams.set("resources", newResources.join(","));
    } else {
      url.searchParams.delete("resources");
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

  const handleGenerateAndOpen = async () => {
    setLoading(true);
    setPromptResults([]);
    addLog("🚀 Generate token and Open in one step...");
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
      // Step 1: Generate token
      addLog("1️⃣ Generating app clip token...");
      const resourcesData = buildResourcesFromFormData();

      console.log("Resources data being passed:", resourcesData);

      // Validate returnUrl if provided (must not be empty string)
      const validReturnUrl = returnUrl.trim() !== "" ? returnUrl.trim() : undefined;

      // Use openAppClip for one-step process
      await passage.openAppClip({
        integrationId: integrationId || undefined,
        prompts: promptsToSend.length > 0 ? promptsToSend : undefined,
        record: recordMode,
        returnUrl: validReturnUrl,
        resources:
          Object.keys(resourcesData).length > 0 ? resourcesData : undefined,
        onConnectionComplete: async (data: PassageSuccessData) => {
          console.log("🎉 [onConnectionComplete] Callback triggered!", data);
          addLog(
            `🎉 [onConnectionComplete] Callback triggered!`,
            "success"
          );
          addLog(
            `✅ Connection complete! Connection ID: ${data.connectionId}`,
            "success"
          );
          addLog(
            `Data received: ${JSON.stringify(data.data, null, 2)}`,
            "success"
          );
          setConnectionResults((prev) => [
            ...prev,
            {
              type: data.status === "done" ? "done" : "connectionComplete",
              timestamp: new Date().toISOString(),
              data: data,
            },
          ]);
        },
        onConnectionError: (error: PassageErrorData) => {
          console.error("❌ [onConnectionError] Callback triggered!", error);
          addLog(`❌ [onConnectionError] Callback triggered!`, "error");
          addLog(`Error: ${error.error} (Code: ${error.code})`, "error");
          setConnectionResults((prev) => [
            ...prev,
            {
              type: "error",
              timestamp: new Date().toISOString(),
              data: error,
            },
          ]);
        },
        onDataComplete: (data) => {
          console.log("📊 [onDataComplete] Callback triggered!", data);
          addLog(
            `📊 [onDataComplete] Callback triggered!`,
            "success"
          );
          addLog(
            `Data processing complete: ${JSON.stringify(data, null, 2)}`,
            "success"
          );
          setConnectionResults((prev) => [
            ...prev,
            {
              type: "dataComplete",
              timestamp: new Date().toISOString(),
              data: data,
            },
          ]);
          if (data?.prompts) {
            setPromptResults(data.prompts);
          }
        },
        onExit: (reason) => {
          addLog(`👋 User exited: ${reason || "unknown reason"}`);
          setConnectionResults((prev) => [
            ...prev,
            {
              type: "exit",
              timestamp: new Date().toISOString(),
              data: { reason: reason || "unknown reason" },
            },
          ]);
        },
      });

      addLog("🎉 App clip opened successfully!", "success");
    } catch (error) {
      addLog(`❌ Generate and Open failed: ${error}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    addLog("🔄 Reloading page...");
    window.location.reload();
  };

  const clearLogs = () => {
    setLogs([]);
    setPromptResults([]);
  };

  const clearConnectionResults = () => {
    setConnectionResults([]);
  };

  const clearFetchedResources = () => {
    setFetchedResourceData([]);
  };

  const handleCreateShortcode = async () => {
    if (!publishableKey || !integrationId) {
      addLog("❌ Please configure publishable key and integration ID first", "error");
      return;
    }

    setIsCreatingShortcode(true);
    setCreatedShortCode('');
    addLog("🔄 Creating shortcode...", "info");

    try {
      // Get API URL from query params or use default
      const searchParams = new URLSearchParams(window.location.search);
      const apiUrlFromQuery = searchParams.get("apiUrl");
      const apiUrl = apiUrlFromQuery || DEFAULT_API_BASE_URL || "https://api.getpassage.ai";

      // Build resources object based on selected resources
      const requestResources: Record<string, Record<string, unknown>> = {};

      resources.forEach((resourceValue) => {
        const isWrite = resourceValue.endsWith("-write");
        const operation = isWrite ? "write" : "read";
        let resourceName = resourceValue
          .replace(/-read$/, "")
          .replace(/-write$/, "");

        // Convert kebab-case to camelCase
        resourceName = resourceName.replace(/-([a-z])/g, (g) =>
          g[1].toUpperCase()
        );

        if (!requestResources[resourceName]) {
          requestResources[resourceName] = {};
        }

        requestResources[resourceName][operation] = {};
      });

      // Manually call the API instead of using createIntentTokenLink to ensure we use the correct apiUrl
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Authorization': `Publishable ${publishableKey}`
      };

      const response = await fetch(`${apiUrl}/intent-token-links`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          integrationId,
          requestPayload: {
            resources: requestResources,
            returnUrl: window.location.origin
          },
          notes: 'Created from example app',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
          maxSuccessfulConnections: maxUses
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to create intent token link: ${response.statusText}`);
      }

      const result = await response.json();

      const shortcode = result.shortToken || result.shortCode;
      if (shortcode) {
        setCreatedShortCode(shortcode);
        addLog(`✅ Shortcode created: ${shortcode}`, "success");
        addLog(`📋 URL: ${window.location.origin}?shortCode=${shortcode}`, "info");
      } else {
        addLog("❌ Failed to get shortcode from response", "error");
      }
    } catch (error) {
      addLog(`❌ Failed to create shortcode: ${error}`, "error");
      console.error('[handleCreateShortcode] Error:', error);
    } finally {
      setIsCreatingShortcode(false);
    }
  };

  const handleOpenShortcode = () => {
    if (createdShortCode) {
      const url = `${window.location.origin}?shortCode=${createdShortCode}`;
      window.open(url, '_blank');
      addLog(`🔗 Opened shortcode link in new tab: ${url}`, "info");
    }
  };

  return (
    <>
      <div className="example-card">
        <h3>🚀 Basic Usage with New API</h3>
        <p>
          Open connection flows using the new simplified API. Each button automatically generates
          an intent token and opens the flow. Choose between Passage Modal/Embed or App Clip Modal (with QR codes).
        </p>
        <div className="input-group">
          <label htmlFor="basic-publishable-key">Publishable Key:</label>
          <input
            id="basic-publishable-key"
            type="text"
            value={publishableKey}
            onChange={(e) => setPublishableKey(e.target.value)}
            placeholder="Enter your publishable key"
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

              // Reset resources to only include those available for the new integration
              const availableResourceValues = getAvailableResources(
                newIntegration
              ).map((r: any) => r.value);
              const filteredResources = resources.filter((r) =>
                availableResourceValues.includes(r)
              );

              // Only update if there's a difference
              if (filteredResources.length !== resources.length) {
                setResources(filteredResources);
                updateUrlForResources(filteredResources);
              }
            }}
            disabled={integrationsLoading}
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
            htmlFor="return-url-input"
            style={{
              fontWeight: 600,
              marginBottom: "0.5rem",
              display: "block",
            }}
          >
            Return URL (optional):
          </label>
          <input
            id="return-url-input"
            type="text"
            value={returnUrl}
            onChange={(e) => setReturnUrl(e.target.value)}
            placeholder="https://example.com/callback"
            style={{
              width: "100%",
              padding: "0.75rem",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              fontSize: "1rem",
            }}
          />
          <div
            style={{
              fontSize: "0.875rem",
              color: "#6b7280",
              marginTop: "0.25rem",
            }}
          >
            URL to redirect to after connection completes
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
            Resources:
          </label>
          <div
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              padding: "1rem",
              background: "#f9fafb",
            }}
          >
            {getAvailableResources(selectedIntegration).map((product: any) => (
              <label
                key={product.value}
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
                  checked={resources.includes(product.value)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      const newResources = [...resources, product.value];
                      setResources(newResources);
                      updateUrlForResources(newResources);
                    } else {
                      const newResources = resources.filter(
                        (p) => p !== product.value
                      );
                      setResources(newResources);
                      updateUrlForResources(newResources);
                    }
                  }}
                  style={{
                    width: "16px",
                    height: "16px",
                    cursor: "pointer",
                  }}
                />
                {product.label}
              </label>
            ))}
          </div>
        </div>

        {/* Dynamic Form Fields */}
        {dynamicFormFields.length > 0 && (
          <div className="input-group">
            <label
              style={{
                fontWeight: 600,
                marginBottom: "0.5rem",
                display: "block",
              }}
            >
              Dynamic Form Fields:
            </label>
            <div
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                padding: "1rem",
                background: "#f9fafb",
              }}
            >
              {dynamicFormFields.map((field, index) => (
                <div key={index} style={{ marginBottom: "1rem" }}>
                  <div
                    style={{
                      fontWeight: "600",
                      marginBottom: "0.5rem",
                      color: "#374151",
                    }}
                  >
                    {field.resourceName} ({field.operation})
                  </div>
                  <div
                    style={{
                      fontSize: "0.875rem",
                      color: "#6b7280",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Method: {field.operationName}
                  </div>
                  {field.arguments.properties &&
                    Object.keys(field.arguments.properties).map((propName) => {
                      const prop = field.arguments.properties[propName];
                      const isRequired =
                        field.arguments.required?.includes(propName);

                      return (
                        <div key={propName} style={{ marginBottom: "0.75rem" }}>
                          <label
                            style={{
                              display: "block",
                              fontWeight: "500",
                              marginBottom: "0.25rem",
                              color: "#374151",
                            }}
                          >
                            {propName}{" "}
                            {isRequired && (
                              <span style={{ color: "#dc2626" }}>*</span>
                            )}
                          </label>
                          <div
                            style={{
                              fontSize: "0.75rem",
                              color: "#6b7280",
                              marginBottom: "0.25rem",
                            }}
                          >
                            {prop.description}
                          </div>
                          {prop.type === "string" && (
                            <input
                              type="text"
                              placeholder={`Enter ${propName}`}
                              value={
                                formFieldValues[
                                  `${field.resourceValue}_${propName}`
                                ] || ""
                              }
                              onChange={(e) => {
                                const fieldKey = `${field.resourceValue}_${propName}`;
                                setFormFieldValues((prev) => ({
                                  ...prev,
                                  [fieldKey]: e.target.value,
                                }));
                              }}
                              style={{
                                width: "100%",
                                padding: "0.5rem",
                                border: "1px solid #e2e8f0",
                                borderRadius: "4px",
                                fontSize: "0.875rem",
                              }}
                              maxLength={prop.maxLength}
                              minLength={prop.minLength}
                            />
                          )}
                          {prop.type === "number" && (
                            <input
                              type="number"
                              placeholder={`Enter ${propName}`}
                              value={
                                formFieldValues[
                                  `${field.resourceValue}_${propName}`
                                ] || ""
                              }
                              onChange={(e) => {
                                const fieldKey = `${field.resourceValue}_${propName}`;
                                setFormFieldValues((prev) => ({
                                  ...prev,
                                  [fieldKey]: e.target.value,
                                }));
                              }}
                              style={{
                                width: "100%",
                                padding: "0.5rem",
                                border: "1px solid #e2e8f0",
                                borderRadius: "4px",
                                fontSize: "0.875rem",
                              }}
                              min={prop.minimum}
                              max={prop.maximum}
                            />
                          )}
                          {prop.type === "boolean" && (
                            <label
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                                cursor: "pointer",
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={
                                  formFieldValues[
                                    `${field.resourceValue}_${propName}`
                                  ] || false
                                }
                                onChange={(e) => {
                                  const fieldKey = `${field.resourceValue}_${propName}`;
                                  setFormFieldValues((prev) => ({
                                    ...prev,
                                    [fieldKey]: e.target.checked,
                                  }));
                                }}
                                style={{
                                  width: "16px",
                                  height: "16px",
                                  cursor: "pointer",
                                }}
                              />
                              {propName}
                            </label>
                          )}
                          {prop.enum && (
                            <select
                              value={
                                formFieldValues[
                                  `${field.resourceValue}_${propName}`
                                ] || ""
                              }
                              onChange={(e) => {
                                const fieldKey = `${field.resourceValue}_${propName}`;
                                setFormFieldValues((prev) => ({
                                  ...prev,
                                  [fieldKey]: e.target.value,
                                }));
                              }}
                              style={{
                                width: "100%",
                                padding: "0.5rem",
                                border: "1px solid #e2e8f0",
                                borderRadius: "4px",
                                fontSize: "0.875rem",
                                background: "white",
                              }}
                            >
                              <option value="">Select {propName}</option>
                              {prop.enum.map((option: string) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      );
                    })}
                </div>
              ))}
            </div>
          </div>
        )}

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

        <div style={{ marginBottom: "1rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            className="button"
            onClick={async () => {
              // Generate token and open modal/embed
              setLoading(true);
              setPromptResults([]);
              addLog(`Generating intent token and opening ${presentationStyle}...`);
              if (recordMode) {
                addLog("📹 Record mode enabled - session will be recorded", "info");
              }

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
                const resourcesData = buildResourcesFromFormData();
                const result = await passage.generateAppClip({
                  integrationId: integrationId || undefined,
                  prompts: promptsToSend.length > 0 ? promptsToSend : undefined,
                  record: recordMode,
                  resources: Object.keys(resourcesData).length > 0 ? resourcesData : undefined,
                });

                setCurrentToken(result.intentToken);
                addLog(`✅ Token generated successfully! Connection ID: ${result.connectionId}`, "success");

                // Now open the modal/embed
                await passage.open({
                  token: result.intentToken,
                  presentationStyle,
                  container: presentationStyle === "embed" ? document.querySelector("#embed-container") || "#embed-container" : undefined,
                  onConnectionComplete: async (data: PassageSuccessData) => {
                    addLog(`✅ ${presentationStyle}: Connection complete! Status: ${data.status}`, "success");
                    setConnectionResults((prev) => [...prev, {
                      type: data.status === "done" ? "done" : "connectionComplete",
                      timestamp: new Date().toISOString(),
                      presentationStyle: presentationStyle,
                      data: data,
                    }]);
                  },
                  onConnectionError: (error: PassageErrorData) => {
                    addLog(`❌ ${presentationStyle}: Error occurred: ${error.error}`, "error");
                    setConnectionResults((prev) => [...prev, {
                      type: "error",
                      timestamp: new Date().toISOString(),
                      presentationStyle: presentationStyle,
                      data: error,
                    }]);
                  },
                  onDataComplete: (data) => {
                    addLog(`📊 Data processing complete: ${JSON.stringify(data, null, 2)}`, "success");
                    setConnectionResults((prev) => [...prev, {
                      type: "dataComplete",
                      timestamp: new Date().toISOString(),
                      data: data,
                    }]);
                    if (data?.prompts) {
                      setPromptResults(data.prompts);
                    }
                  },
                  onExit: (reason) => {
                    addLog(`👋 User exited: ${reason || "unknown reason"}`);
                    setConnectionResults((prev) => [...prev, {
                      type: "exit",
                      timestamp: new Date().toISOString(),
                      data: { reason: reason || "unknown reason" },
                    }]);
                  },
                });

                addLog(`🚀 Passage ${presentationStyle} opened successfully!`);
              } catch (error) {
                addLog(`❌ Failed to generate token and open: ${error}`, "error");
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
            style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              border: "none",
              color: "white",
              fontWeight: "600",
            }}
          >
            {loading ? "🚀 Opening..." : `Open Passage ${presentationStyle === "modal" ? "Modal" : "Embed"}`}
          </button>

          <button
            className="button"
            onClick={handleGenerateAndOpen}
            disabled={loading}
            style={{
              background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
              border: "none",
              color: "white",
              fontWeight: "600",
            }}
          >
            {loading ? "🚀 Opening..." : `Open App Clip Modal`}
          </button>

          <button
            className="button secondary"
            onClick={handleReset}
          >
            🔄 Reset
          </button>
        </div>

        {currentToken && (
          <div
            className="status-display success"
            style={{ marginBottom: "1rem" }}
          >
            <h4 style={{ marginBottom: "0.5rem" }}>✅ Generated Intent Token:</h4>
            <div
              style={{
                background: "rgba(255,255,255,0.5)",
                padding: "0.5rem",
                borderRadius: "4px",
                wordBreak: "break-all",
                fontSize: "0.75rem",
                fontFamily: "monospace",
                maxHeight: "200px",
                overflowY: "auto",
              }}
            >
              {currentToken}
            </div>
          </div>
        )}

        {/* Shortcode Creation Section */}
        <div style={{
          marginTop: '1.5rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid #e0e0e0'
        }}>
          <h4 style={{ marginBottom: '1rem', color: '#333' }}>🔗 Shortcode Creation</h4>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontWeight: '500', color: '#666', whiteSpace: 'nowrap' }}>
                Max uses:
              </label>
              <input
                type="number"
                min="1"
                value={maxUses}
                onChange={(e) => setMaxUses(Math.max(1, parseInt(e.target.value) || 1))}
                style={{
                  width: '80px',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '1rem',
                  textAlign: 'center'
                }}
              />
            </div>

            <button
              className="button"
              onClick={handleCreateShortcode}
              disabled={isCreatingShortcode || !publishableKey || !integrationId}
              style={{
                background: isCreatingShortcode ? '#6c757d' : '#007bff',
              }}
            >
              {isCreatingShortcode ? 'Creating...' : 'Create Shortcode'}
            </button>

            {createdShortCode && (
              <>
                <button
                  className="button"
                  onClick={handleOpenShortcode}
                  style={{
                    background: '#28a745',
                  }}
                >
                  Open Shortcode Link →
                </button>
                <span style={{
                  marginLeft: '1rem',
                  padding: '0.5rem 1rem',
                  background: '#d4edda',
                  color: '#155724',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontFamily: 'monospace',
                }}>
                  {createdShortCode}
                </span>
              </>
            )}
          </div>
          {createdShortCode && (
            <div style={{
              marginTop: '0.5rem',
              fontSize: '0.875rem',
              color: '#666',
            }}>
              URL: <code style={{
                background: '#f8f9fa',
                padding: '0.25rem 0.5rem',
                borderRadius: '3px'
              }}>
                {window.location.origin}?shortCode={createdShortCode}
              </code>
            </div>
          )}
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
              <span style={{ fontWeight: 600 }}>
                Connection Results Explorer:
              </span>
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