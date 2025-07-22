# Passage Web SDK

A React SDK for integrating Passage into your web applications. Enable users to securely connect their accounts through QR code scanning with the Passage Authenticator mobile app, with real-time connection tracking and data collection.

## Installation

```bash
npm install @getpassage/react-js
# or
yarn add @getpassage/react-js
```

## Quick Start

### 1. Wrap your app with PassageProvider

```tsx
import { PassageProvider } from "@getpassage/react-js";

function App() {
  return (
    <PassageProvider>
      <YourAppContent />
    </PassageProvider>
  );
}
```

### 2. Basic Connection Flow

```tsx
import React, { useState } from "react";
import { usePassage } from "@getpassage/react-js";

function ConnectButton() {
  const passage = usePassage();
  const [isInitialized, setIsInitialized] = useState(false);
  const [connectionData, setConnectionData] = useState(null);

  const handleConnect = async () => {
    try {
      // 1. Initialize Passage with your credentials
      await passage.initialize({
        publishableKey: "pk-test-your-publishable-key",
        integrationId: "audible", // or "kindle", "youtube", etc.
        onConnectionComplete: (data) => {
          console.log("✅ Connection successful!", data);
          setConnectionData(data);
          // Connection is complete, you can now fetch data from your backend
        },
        onError: (error) => {
          console.error("❌ Connection failed:", error);
          alert(`Connection failed: ${error.error}`);
        },
      });

      setIsInitialized(true);

      // 2. Open the connection modal
      await passage.open();
    } catch (error) {
      console.error("Failed to initialize Passage:", error);
    }
  };

  return (
    <div>
      {!connectionData ? (
        <button
          onClick={handleConnect}
          disabled={!isInitialized && "initializing"}
        >
          Connect Your Account
        </button>
      ) : (
        <div>
          <h3>✅ Connection Complete!</h3>
          <p>Connection ID: {connectionData.connectionId}</p>
        </div>
      )}
    </div>
  );
}
```

## Data Persistence

Passage automatically stores successful connection data in localStorage, including:

- Raw account data (user's books, playlists, etc.)
- Prompt responses from users
- Connection metadata and timestamps

This data persists across browser sessions and can be retrieved using the `getData()` method, making it easy to build features that work with previously collected user data without requiring users to reconnect every time.

## Advanced Usage with Prompts

Collect additional data from users during the connection process:

```tsx
import React, { useState } from "react";
import {
  usePassage,
  PassagePrompt,
  PassagePromptResponse,
} from "@getpassage/react-js";

function AdvancedConnectFlow() {
  const passage = usePassage();
  const [isInitialized, setIsInitialized] = useState(false);
  const [promptResults, setPromptResults] = useState<PassagePromptResponse[]>(
    []
  );
  const [loading, setLoading] = useState(false);

  const handleConnectWithPrompts = async () => {
    setLoading(true);

    // Define prompts to collect additional data
    const prompts: PassagePrompt[] = [
      {
        name: "reading_vibe",
        value:
          "Describe your Kindle reading history in the most Gen Z way possible - what's your literary personality?",
      },
      {
        name: "book_mood",
        value:
          "What kind of book hits different for you rn? Give me the vibes ✨",
      },
      {
        name: "book_list",
        value: "return a list of my books with with a description of each",
        outputType: "json",
        outputFormat: `{"type":"object","additionalProperties":false,"required":["data"],"properties":{"data":{"type":"array","items":{"type":"object","required":["title","author","roast"],"properties":{"title":{"type":"string"},"author":{"type":"string"},"roast":{"type":"string"}}}}}}`,
      },
    ];

    try {
      // Initialize with prompts
      await passage.initialize({
        publishableKey: "pk-test-your-publishable-key",
        integrationId: "kindle",
        prompts: prompts,
        onConnectionComplete: (data) => {
          console.log("✅ Connection complete!", data);
        },
        onPromptComplete: (promptResponse) => {
          console.log("🎯 Prompt completed:", promptResponse);
          setPromptResults((prev) => [...prev, promptResponse]);
        },
        onDataComplete: (data) => {
          console.log("📊 Data processing complete:", data);
        },
        onError: (error) => {
          console.error("❌ Error:", error);
        },
        onExit: (reason) => {
          console.log("👋 User exited:", reason);
        },
      });

      setIsInitialized(true);

      // Disconnect any existing WebSocket connection before opening
      await passage.disconnect();

      // Open modal
      await passage.open({
        onConnectionComplete: (data) => {
          console.log("Modal: Connection complete!", data);
        },
        onError: (error) => {
          console.error("Modal: Error occurred:", error);
        },
      });
    } catch (error) {
      console.error("Initialization failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={handleConnectWithPrompts} disabled={loading}>
        {loading ? "Connecting..." : "Connect with Data Collection"}
      </button>

      {promptResults.length > 0 && (
        <div>
          <h4>📊 Collected Data:</h4>
          {promptResults.map((result, index) => (
            <div key={index}>
              <strong>{result.key}:</strong> {result.value}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

## API Reference

### PassageProvider

Provides Passage context to your application.

**Props:**

- `config` (optional): Configuration object
  - `debug`: Enable debug logging (default: false)

### usePassage Hook

Provides access to Passage functionality.

**Methods:**

#### initialize(options)

Initialize Passage with your credentials and configuration.

```tsx
await passage.initialize({
  publishableKey: string;              // Your publishable key
  integrationId?: string;              // Integration type (e.g., "audible", "kindle")
  prompts?: PassagePrompt[];           // Optional prompts for data collection

  // Callbacks
  onConnectionComplete?: (data: PassageSuccessData) => void;
  onError?: (error: PassageErrorData) => void;
  onDataComplete?: (data: PassageDataResult) => void;
  onPromptComplete?: (prompt: PassagePromptResponse) => void;
  onExit?: (reason?: string) => void;
});
```

#### open(options?)

Open the Passage connection modal. Can be called after initialization with different `presentationStyle` and `container` options.

```tsx
await passage.open();
```

#### close()

Close the Passage modal.

```tsx
await passage.close();
```

#### disconnect()

Disconnect the WebSocket connection without affecting modal state. Useful for cleaning up connections before opening a new modal session.

```tsx
await passage.disconnect();
```

#### getData()

Retrieve stored connection data from previous sessions. Data is automatically persisted to localStorage and remains available across browser sessions.

```tsx
const dataResults = await passage.getData();
```

**Returns:** `Promise<PassageStoredDataResult[]>` - Array of stored data results with metadata

**Data Structure:**

```tsx
interface PassageStoredDataResult extends PassageDataResult {
  intentToken?: string; // Connection session identifier (if available)
  timestamp?: string; // When the data was collected (ISO string, if available)
  data?: any[]; // Raw connection data (user's account data)
  prompts?: PassagePromptResponse[]; // Responses to prompts
}

interface PassagePromptResponse {
  name: string; // Prompt identifier
  content: string; // User's response content
  outputType?: "text" | "json" | "boolean" | "number";
  outputFormat?: string;
  response?: any; // Full response object
}
```

**Behavior:**

- Returns data from previous successful connections stored in localStorage with metadata
- Each result may include `intentToken` (session ID) and `timestamp` (when collected) if available
- `intentToken` and `timestamp` may be undefined for older data or edge cases
- Falls back to current session data if no stored data exists
- Returns array with empty data structure if no data is available
- Most recent connections appear first in the array

## Data Persistence and Retrieval

Passage automatically stores connection data in localStorage, making it available across browser sessions. Use `getData()` to access previously collected user data.

### Example: Displaying Stored Data

```tsx
import React, { useState, useEffect } from "react";
import { usePassage, PassageStoredDataResult } from "@getpassage/react-js";

function UserDataDisplay() {
  const passage = usePassage();
  const [storedData, setStoredData] = useState<PassageStoredDataResult[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const data = await passage.getData();
      setStoredData(data);
    };
    loadData();
  }, [passage]);

  if (storedData.length === 0) {
    return <p>No stored data found. Connect an account first.</p>;
  }

  return (
    <div>
      <h3>Your Connected Data</h3>
      {storedData.map((result, index) => (
        <div
          key={index}
          style={{
            border: "1px solid #ccc",
            padding: "15px",
            margin: "10px 0",
          }}
        >
          <h4>Connection #{index + 1}</h4>

          {/* Display account data */}
          {result.data && result.data.length > 0 && (
            <div>
              <h5>Data:</h5>
              {result.data.map((item, i) => (
                <div key={i}>
                  <pre>{JSON.stringify(item, null, 2)}</pre>
                </div>
              ))}
            </div>
          )}

          {/* Display prompts */}
          {result.prompts && result.prompts.length > 0 && (
            <div>
              <h5>Prompts:</h5>
              {result.prompts.map((prompt, i) => (
                <div key={i}>
                  <strong>{prompt.name}:</strong> {prompt.content}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

## Callbacks Reference

### onConnectionComplete(data)

Called when the connection is successfully established and the user has connected their account.

```tsx
onConnectionComplete: (data: PassageSuccessData) => {
  console.log("Connection ID:", data.connectionId);
  console.log("Status:", data.status);
  console.log("Data:", data.data);
  // Proceed to fetch data from your backend
};
```

### onError(error)

Called when an error occurs during the connection process.

```tsx
onError: (error: PassageErrorData) => {
  console.error("Error:", error.error);
  console.error("Code:", error.code);
  // Handle the error appropriately
};
```

### onDataComplete(data)

Called when data processing is complete and the user's data is available.

```tsx
onDataComplete: (data: PassageDataResult) => {
  console.log("Processing complete:", data);
  console.log("User data:", data.data);
  console.log("Prompt responses:", data.prompts);
  // Data structure:
  // data.prompts = [{ prompt: "promptId", results: "user response" }]
  // Data is now ready for use
};
```

### onPromptComplete(response)

Called when a user completes answering a prompt question.

```tsx
onPromptComplete: (response: PassagePromptResponse) => {
  console.log("Prompt:", response.key);
  console.log("Answer:", response.value);
  // Store or process the user's response
};
```

### onExit(reason)

Called when the user manually closes or exits the connection flow before completion.

```tsx
onExit: (reason?: string) => {
  console.log("User exited:", reason);
  // Handle early exit (e.g., show message, cleanup state)
};
```

## Connection Status Flow

The SDK tracks connection status through these stages:

1. **`pending`** - QR code displayed, waiting for scan
2. **`connecting`** - User scanned QR, establishing connection
3. **`connected`** - Successfully connected to user's device
4. **`data_processing`** - Processing account data
5. **`data_available`** - Data ready (triggers onDataComplete)
6. **`error`** - Something went wrong (triggers onError)

## Integration Types

Supported integration types for `integrationId`:

- `"audible"` - Audible audiobook accounts
- `"kindle"` - Kindle reading accounts
- `"youtube"` - YouTube viewing history
- More integrations coming soon

## Prompts System

Collect additional information from users during connection:

```tsx
interface PassagePrompt {
  name: string; // Unique identifier for the prompt
  value: string; // The question to ask the user
}

interface PassagePromptResponse {
  key: string; // The prompt name
  value: string; // User's response
  response?: any; // Full response object
}
```

## Styling

### Custom Styles

Customize the modal appearance:

```tsx
<PassageProvider
  config={{
    customStyles: {
      container: {
        padding: "40px",
      },
      content: {
        borderRadius: "16px",
        boxShadow: "0 10px 50px rgba(0, 0, 0, 0.1)",
      },
    },
  }}
>
```

### CSS Classes

Override default styles with these CSS classes:

```css
.passage-modal-backdrop {
  /* Modal backdrop */
}

.passage-modal-container {
  /* Modal container */
}

.passage-modal-content {
  /* Modal content area */
}

.passage-qr-code {
  /* QR code container */
}

.passage-status {
  /* Status display */
}
```

## Complete Example

Here's a full implementation with all features:

```tsx
import React, { useState, useEffect } from "react";
import {
  PassageProvider,
  usePassage,
  PassagePrompt,
  PassagePromptResponse,
  PassageSuccessData,
  PassageDataResult,
  PassageStoredDataResult,
} from "@getpassage/react-js";

function ConnectFlow() {
  const passage = usePassage();
  const [publishableKey, setPublishableKey] = useState("pk-test-your-key");
  const [integrationId, setIntegrationId] = useState("audible");
  const [isInitialized, setIsInitialized] = useState(false);
  const [connectionData, setConnectionData] =
    useState<PassageSuccessData | null>(null);
  const [promptResults, setPromptResults] = useState<PassagePromptResponse[]>(
    []
  );
  const [loading, setLoading] = useState(false);

  const prompts: PassagePrompt[] = [
    {
      name: "reading_vibe",
      value: "Describe your reading history in the most Gen Z way possible ✨",
    },
    {
      name: "book_rec",
      value: "What book should everyone be reading rn? No cap 📚",
    },
  ];

  const handleConnect = async () => {
    setLoading(true);
    setPromptResults([]);

    try {
      // Step 1: Initialize
      await passage.initialize({
        publishableKey,
        integrationId,
        prompts,
        onConnectionComplete: (data) => {
          console.log("✅ Connection successful!", data);
          setConnectionData(data);
        },
        onError: (error) => {
          console.error("❌ Connection failed:", error);
          alert(`Error: ${error.error}`);
        },
        onDataComplete: (data) => {
          console.log("📊 Data complete:", data);
        },
        onPromptComplete: (prompt) => {
          console.log("🎯 Prompt completed:", prompt);
          setPromptResults((prev) => [...prev, prompt]);
        },
        onExit: (reason) => {
          console.log("👋 User exited:", reason);
        },
      });

      setIsInitialized(true);

      // Step 2: Open modal
      await passage.open();
    } catch (error) {
      console.error("Failed to connect:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div>
        <label>
          Publishable Key:
          <input
            value={publishableKey}
            onChange={(e) => setPublishableKey(e.target.value)}
            disabled={isInitialized}
          />
        </label>
      </div>

      <div>
        <label>
          Integration:
          <select
            value={integrationId}
            onChange={(e) => setIntegrationId(e.target.value)}
            disabled={isInitialized}
          >
            <option value="audible">Audible</option>
            <option value="kindle">Kindle</option>
            <option value="youtube">YouTube</option>
          </select>
        </label>
      </div>

      <button onClick={handleConnect} disabled={loading}>
        {loading
          ? "Connecting..."
          : isInitialized
            ? "Open Modal"
            : "Initialize & Connect"}
      </button>

      {connectionData && (
        <div>
          <h3>✅ Connection Complete!</h3>
          <p>Connection ID: {connectionData.connectionId}</p>
          <p>Status: {connectionData.status}</p>
        </div>
      )}

      {promptResults.length > 0 && (
        <div>
          <h4>📊 Collected Responses:</h4>
          {promptResults.map((result, index) => (
            <div key={index}>
              <strong>{result.key}:</strong> {result.value}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <PassageProvider config={{ debug: true }}>
      <ConnectFlow />
    </PassageProvider>
  );
}

export default App;
```

## TypeScript Support

Full TypeScript definitions included:

```typescript
import type {
  PassageConfig,
  PassageInitializeOptions,
  PassageOpenOptions,
  PassagePrompt,
  PassagePromptResponse,
  PassageSuccessData,
  PassageErrorData,
  PassageDataResult,
  PassageStoredDataResult,
  ConnectionStatus,
} from "@getpassage/react-js";
```

## Requirements

- React >= 16.8.0 (Hooks support)
- React DOM >= 16.8.0

## Getting Your Keys

1. Sign up at [Passage Dashboard](https://dashboard.getpassage.ai)
2. Create a new application
3. Copy your publishable key from the dashboard
4. Configure your integration settings

## Support

- [Documentation](https://docs.getpassage.ai)
- [GitHub Issues](https://github.com/passage/passage-web-react/issues)
- [Support](mailto:support@getpassage.ai)

## License

MIT © Passage
