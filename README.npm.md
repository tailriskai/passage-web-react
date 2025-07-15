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
        products: ["history"], // Data products to collect
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
    ];

    try {
      // Initialize with prompts
      await passage.initialize({
        publishableKey: "pk-test-your-publishable-key",
        integrationId: "kindle",
        products: ["history"],
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
  products?: string[];                 // Data products (default: ["history"])
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

Get stored session data.

```tsx
const data = await passage.getData();
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

## Data Products

Available data products for the `products` array:

- `"history"` - User activity/reading history

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
import React, { useState } from "react";
import {
  PassageProvider,
  usePassage,
  PassagePrompt,
  PassagePromptResponse,
  PassageSuccessData,
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
        products: ["history"],
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
