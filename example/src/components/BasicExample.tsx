import React, { useState, useEffect } from "react";
import {
  usePassage,
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

  // Function to build the resources structure from form field values
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
      const resourcesData = buildResourcesFromFormData();
      console.log("Resources data being passed:", resourcesData);

      await passage.initialize({
        publishableKey,
        integrationId: integrationId || undefined,
        prompts: promptsToSend.length > 0 ? promptsToSend : undefined,
        record: recordMode,
        products: resources.length > 0 ? resources : undefined,
        resources:
          Object.keys(resourcesData).length > 0 ? resourcesData : undefined,
        onConnectionComplete: async (data: PassageSuccessData) => {
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

          // Automatically fetch resources if any are selected
          if (resources.length > 0) {
            addLog(
              `🔄 Auto-fetching ${resources.length} selected resource(s)...`,
              "info"
            );
            await handleFetchResources();
          }
        },
        onError: (error: PassageErrorData) => {
          addLog(`❌ Error: ${error.error} (Code: ${error.code})`, "error");
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
          addLog(
            `📊 Data processing complete: ${JSON.stringify(data, null, 2)}`,
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
        },
        onPromptComplete: (promptResponse: PassagePromptResponse) => {
          addLog(
            `🎯 Prompt completed: ${promptResponse.name} = ${promptResponse.content}`,
            "success"
          );
          setPromptResults((prev) => [...prev, promptResponse]);
          setConnectionResults((prev) => [
            ...prev,
            {
              type: "promptComplete",
              timestamp: new Date().toISOString(),
              data: promptResponse,
            },
          ]);
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
        onConnectionComplete: async (data: PassageSuccessData) => {
          addLog(
            `✅ ${presentationStyle}: Connection complete! Status: ${data.status}`,
            "success"
          );
          setConnectionResults((prev) => [
            ...prev,
            {
              type: data.status === "done" ? "done" : "connectionComplete",
              timestamp: new Date().toISOString(),
              presentationStyle: presentationStyle,
              data: data,
            },
          ]);

          // Automatically fetch resources if any are selected
          if (resources.length > 0) {
            addLog(
              `🔄 Auto-fetching ${resources.length} selected resource(s)...`,
              "info"
            );
            await handleFetchResources();
          }
        },
        onError: (error: PassageErrorData) => {
          addLog(
            `❌ ${presentationStyle}: Error occurred: ${error.error}`,
            "error"
          );
          setConnectionResults((prev) => [
            ...prev,
            {
              type: "error",
              timestamp: new Date().toISOString(),
              presentationStyle: presentationStyle,
              data: error,
            },
          ]);
        },
        onPromptComplete: (promptResponse: PassagePromptResponse) => {
          addLog(
            `🎯 ${presentationStyle} prompt: ${promptResponse.name} = ${promptResponse.content}`,
            "success"
          );
          setPromptResults((prev) => [...prev, promptResponse]);
          setConnectionResults((prev) => [
            ...prev,
            {
              type: "promptComplete",
              timestamp: new Date().toISOString(),
              presentationStyle: presentationStyle,
              data: promptResponse,
            },
          ]);
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
      // Step 1: Initialize
      addLog("1️⃣ Initializing Passage...");
      const resourcesData = buildResourcesFromFormData();

      console.log("Resources data being passed:", resourcesData);

      await passage.initialize({
        publishableKey,
        integrationId: integrationId || undefined,
        prompts: promptsToSend.length > 0 ? promptsToSend : undefined,
        record: recordMode,
        resources:
          Object.keys(resourcesData).length > 0 ? resourcesData : undefined,
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
        onConnectionComplete: async (data: PassageSuccessData) => {
          addLog(
            `✅ ${presentationStyle}: Connection complete! Status: ${data.status}`,
            "success"
          );
          setConnectionResults((prev) => [
            ...prev,
            {
              type: data.status === "done" ? "done" : "connectionComplete",
              timestamp: new Date().toISOString(),
              presentationStyle: presentationStyle,
              data: data,
            },
          ]);

          // Automatically fetch resources if any are selected
          if (resources.length > 0) {
            addLog(
              `🔄 Auto-fetching ${resources.length} selected resource(s)...`,
              "info"
            );
            await handleFetchResources();
          }
        },
        onError: (error: PassageErrorData) => {
          addLog(
            `❌ ${presentationStyle}: Error occurred: ${error.error}`,
            "error"
          );
          setConnectionResults((prev) => [
            ...prev,
            {
              type: "error",
              timestamp: new Date().toISOString(),
              presentationStyle: presentationStyle,
              data: error,
            },
          ]);
        },
        onPromptComplete: (promptResponse: PassagePromptResponse) => {
          addLog(
            `🎯 ${presentationStyle} prompt: ${promptResponse.name} = ${promptResponse.content}`,
            "success"
          );
          setPromptResults((prev) => [...prev, promptResponse]);
          setConnectionResults((prev) => [
            ...prev,
            {
              type: "promptComplete",
              timestamp: new Date().toISOString(),
              presentationStyle: presentationStyle,
              data: promptResponse,
            },
          ]);
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

  const handleFetchResources = async () => {
    try {
      if (resources.length === 0) {
        addLog("⚠️ No resources selected to fetch", "info");
        return;
      }

      addLog(
        `🔄 Fetching ${resources.length} resource(s): ${resources.join(", ")}...`,
        "info"
      );

      const data = await passage.fetchResource(resources);

      if (data && data.length > 0) {
        setFetchedResourceData(data);
        addLog(`✅ Successfully fetched ${data.length} resource(s)`, "success");

        // Log details of each resource
        data.forEach((resource: any) => {
          if (resource.resourceName && resource.data) {
            const itemCount = Array.isArray(resource.data)
              ? resource.data.length
              : 1;
            addLog(
              `  • ${resource.resourceName}: ${itemCount} item(s)`,
              "success"
            );
          }
        });
      } else {
        addLog("⚠️ No data returned from resources", "info");
      }
    } catch (error) {
      addLog(`❌ Error fetching resources: ${error}`, "error");
      console.error("[handleFetchResources] Error:", error);
    }
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

      const result = await createIntentTokenLink({
        integrationId,
        requestPayload: {
          resources: requestResources,
          returnUrl: window.location.origin
        },
        notes: 'Created from example app',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      }, publishableKey);

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
                  disabled={isInitialized}
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
            onClick={handleFetchResources}
            disabled={!isInitialized || resources.length === 0}
          >
            Fetch Resources
          </button>

          <button
            className="button secondary"
            onClick={handleReset}
            style={{ marginLeft: "auto" }}
          >
            🔄 Reset
          </button>
        </div>

        {/* Shortcode Creation Section */}
        <div style={{
          marginTop: '1.5rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid #e0e0e0'
        }}>
          <h4 style={{ marginBottom: '1rem', color: '#333' }}>🔗 Shortcode Creation</h4>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
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

        {/* Fetched Resources Display */}
        {fetchedResourceData.length > 0 && (
          <div style={{ marginBottom: "1.5rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "1rem" }}
              >
                <span style={{ fontWeight: 600 }}>Fetched Resource Data:</span>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    cursor: "pointer",
                    fontSize: "0.875rem",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={showResultAsTable}
                    onChange={(e) => setShowResultAsTable(e.target.checked)}
                    style={{
                      width: "16px",
                      height: "16px",
                      cursor: "pointer",
                    }}
                  />
                  Show as table
                </label>
              </div>
              <button
                className="button secondary"
                onClick={clearFetchedResources}
                style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}
              >
                Clear
              </button>
            </div>

            {showResultAsTable ? (
              <div>
                {fetchedResourceData.map((resourceData, index) => {
                  // Check if we have a data array to display as table
                  const dataArray =
                    resourceData.data?.data ||
                    (Array.isArray(resourceData.data)
                      ? resourceData.data
                      : null);

                  if (
                    dataArray &&
                    Array.isArray(dataArray) &&
                    dataArray.length > 0
                  ) {
                    return (
                      <div
                        key={index}
                        style={{
                          marginBottom: "1.5rem",
                        }}
                      >
                        <div
                          style={{
                            padding: "0.75rem 1rem",
                            background: "#f9fafb",
                            borderTop: "1px solid #e2e8f0",
                            borderLeft: "1px solid #e2e8f0",
                            borderRight: "1px solid #e2e8f0",
                            borderRadius: "8px 8px 0 0",
                            fontWeight: 600,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <div>
                            {resourceData.resourceName}
                            <span
                              style={{
                                fontSize: "0.875rem",
                                color: "#6b7280",
                                fontWeight: 400,
                                marginLeft: "0.5rem",
                              }}
                            >
                              ({dataArray.length} items)
                            </span>
                          </div>
                          {resourceData.data?.meta && (
                            <span
                              style={{
                                fontSize: "0.75rem",
                                color: "#6b7280",
                                fontWeight: 400,
                              }}
                            >
                              Page {resourceData.data.meta.page} of{" "}
                              {resourceData.data.meta.totalPages} • Total:{" "}
                              {resourceData.data.meta.total}
                            </span>
                          )}
                        </div>
                        <TanStackDataTable data={dataArray} maxHeight="500px" />
                      </div>
                    );
                  }

                  // Fallback to JSON display if not an array
                  return (
                    <div
                      key={index}
                      style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        overflow: "hidden",
                        marginBottom: "1rem",
                      }}
                    >
                      <div
                        style={{
                          padding: "0.75rem 1rem",
                          background: "#f9fafb",
                          borderBottom: "1px solid #e2e8f0",
                          fontWeight: 600,
                        }}
                      >
                        {resourceData.resourceName}
                        <span
                          style={{
                            fontSize: "0.875rem",
                            color: "#6b7280",
                            fontWeight: 400,
                            marginLeft: "0.5rem",
                          }}
                        >
                          (Object)
                        </span>
                      </div>
                      <div
                        style={{
                          padding: "1rem",
                          maxHeight: "400px",
                          overflowY: "auto",
                        }}
                      >
                        <pre
                          style={{
                            margin: 0,
                            fontSize: "0.875rem",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                          }}
                        >
                          {JSON.stringify(resourceData.data, null, 2)}
                        </pre>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <JsonExplorerMulti
                data={fetchedResourceData}
                title="Fetched Resources (JSON)"
                maxHeight="500px"
              />
            )}
          </div>
        )}

        {formattedJsonData && (
          <div
            className="status-display success"
            style={{ marginBottom: "1rem" }}
          >
            <h4 style={{ marginBottom: "0.5rem" }}>📋 Session Data:</h4>
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
                      <div
                        style={{
                          marginBottom: "1rem",
                          padding: "0.5rem",
                          background: "#e2e8f0",
                          borderRadius: "4px",
                        }}
                      >
                        <strong>Total Sessions:</strong> {data.length}
                      </div>
                      {data.map((session: any, sessionIndex: number) => (
                        <div
                          key={sessionIndex}
                          style={{
                            marginBottom: "1.5rem",
                            border: "1px solid #d1d5db",
                            borderRadius: "8px",
                            padding: "1rem",
                            background: "white",
                          }}
                        >
                          <div
                            style={{
                              marginBottom: "0.5rem",
                              fontSize: "0.875rem",
                              color: "#6b7280",
                            }}
                          >
                            <strong>Session {sessionIndex + 1}</strong> -{" "}
                            {new Date(session.timestamp).toLocaleString()}
                          </div>
                          <div
                            style={{
                              marginBottom: "0.5rem",
                              fontSize: "0.75rem",
                              color: "#9ca3af",
                              wordBreak: "break-all",
                            }}
                          >
                            <strong>Intent Token:</strong>{" "}
                            {session.intentToken.substring(0, 50)}...
                          </div>
                          {session.data && session.data.length > 0 && (
                            <div>
                              <div
                                style={{
                                  marginBottom: "0.5rem",
                                  fontWeight: "600",
                                  color: "#374151",
                                }}
                              >
                                Videos ({session.data.length}):
                              </div>
                              <div style={{ display: "grid", gap: "0.75rem" }}>
                                {session.data.map(
                                  (video: any, videoIndex: number) => (
                                    <div
                                      key={videoIndex}
                                      style={{
                                        border: "1px solid #e5e7eb",
                                        borderRadius: "6px",
                                        padding: "0.75rem",
                                        background: "#fafafa",
                                        display: "flex",
                                        gap: "0.75rem",
                                      }}
                                    >
                                      <div style={{ flex: "0 0 120px" }}>
                                        <img
                                          src={video.thumbnailUrl}
                                          alt={video.title}
                                          style={{
                                            width: "100%",
                                            height: "68px",
                                            objectFit: "cover",
                                            borderRadius: "4px",
                                          }}
                                          onError={(e) => {
                                            (
                                              e.target as HTMLImageElement
                                            ).style.display = "none";
                                          }}
                                        />
                                      </div>
                                      <div style={{ flex: "1" }}>
                                        <div
                                          style={{
                                            fontWeight: "600",
                                            marginBottom: "0.25rem",
                                            fontSize: "0.875rem",
                                            lineHeight: "1.25",
                                          }}
                                        >
                                          {video.title}
                                        </div>
                                        <div
                                          style={{
                                            fontSize: "0.75rem",
                                            color: "#6b7280",
                                            marginBottom: "0.25rem",
                                          }}
                                        >
                                          <strong>Channel:</strong>{" "}
                                          {video.channel}
                                        </div>
                                        <div
                                          style={{
                                            fontSize: "0.75rem",
                                            color: "#6b7280",
                                            marginBottom: "0.25rem",
                                          }}
                                        >
                                          <strong>Duration:</strong>{" "}
                                          {video.duration}
                                        </div>
                                        <div
                                          style={{
                                            fontSize: "0.75rem",
                                            color: "#6b7280",
                                            marginBottom: "0.25rem",
                                          }}
                                        >
                                          <strong>Watched:</strong>{" "}
                                          {new Date(
                                            video.watchedAt
                                          ).toLocaleString()}
                                        </div>
                                        <div
                                          style={{
                                            fontSize: "0.75rem",
                                            color: "#6b7280",
                                            lineHeight: "1.25",
                                          }}
                                        >
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
                                              textDecoration: "none",
                                            }}
                                          >
                                            Watch Video →
                                          </a>
                                        </div>
                                      </div>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          )}
                          {session.prompts && session.prompts.length > 0 && (
                            <div style={{ marginTop: "1rem" }}>
                              <div
                                style={{
                                  fontWeight: "600",
                                  marginBottom: "0.5rem",
                                  color: "#374151",
                                }}
                              >
                                Prompts ({session.prompts.length}):
                              </div>
                              {session.prompts.map(
                                (prompt: any, promptIndex: number) => (
                                  <div
                                    key={promptIndex}
                                    style={{
                                      background: "#f3f4f6",
                                      padding: "0.5rem",
                                      borderRadius: "4px",
                                      marginBottom: "0.25rem",
                                      fontSize: "0.75rem",
                                    }}
                                  >
                                    <strong>{prompt.name}:</strong>{" "}
                                    {prompt.content}
                                  </div>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                } catch (error) {
                  return (
                    <div
                      style={{
                        color: "#dc2626",
                        fontFamily: "monospace",
                        fontSize: "0.875rem",
                      }}
                    >
                      Error parsing data:{" "}
                      {error instanceof Error ? error.message : String(error)}
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
