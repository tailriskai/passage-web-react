# Passage Web SDK

A React SDK for integrating Passage into your web applications. Display QR codes for users to scan with the Passage Authenticator mobile app and track connection status in real-time.

## Installation

```bash
npm install @tailriskai/passage-web-react
# or
yarn add @tailriskai/passage-web-react
```

## Quick Start

### 1. Wrap your app with PassageProvider

```tsx
import { PassageProvider } from "@tailriskai/passage-web-react";

function App() {
  return (
    <PassageProvider
      config={{
        // Optional configuration
        baseUrl: "https://gravy-connect-infra-web.vercel.app/",
        socketUrl: "https://prod-gravy-connect-api.onrender.com",
        debug: true, // Enable debug logs
      }}
    >
      <YourAppContent />
    </PassageProvider>
  );
}
```

### 2. Use the hook in your components

```tsx
import React from "react";
import { usePassage } from "@tailriskai/passage-web-react";

function ConnectButton() {
  const { initialize, open, isOpen, status } = usePassage();

  const handleConnect = async () => {
    try {
      // Initialize Passage with your publishable key and integration ID
      await initialize({
        publishableKey: "your-publishable-key",
        integrationId: "your-integration-id",
        products: ["history"], // Optional: defaults to ["history"]
        onConnectionComplete: (data) => {
          console.log("Connection successful!", data);
          // Connection is complete, you can now fetch data from your backend
        },
        onError: (error) => {
          console.error("Connection failed:", error);
        },
      });

      // Open Passage modal
      await open();
    } catch (error) {
      console.error("Failed to open Passage:", error);
    }
  };

  return (
    <div>
      <button onClick={handleConnect} disabled={isOpen}>
        {isOpen ? `Status: ${status}` : "Connect Your Accounts"}
      </button>
    </div>
  );
}
```

## API Reference

### PassageProvider

The provider component that manages the Passage SDK state.

**Props:**

- `config` (optional): Configuration object
  - `baseUrl`: Base URL for the Passage web app
  - `socketUrl`: WebSocket URL for status updates
  - `socketNamespace`: WebSocket namespace (default: "/ws")
  - `customStyles`: Custom styles for the modal
  - `debug`: Enable debug logging

### usePassage

Hook that provides access to Passage functionality.

**Returns:**

- `isOpen`: Whether the Passage modal is currently open
- `status`: Current connection status (`"pending"` | `"connecting"` | `"connected"` | `"data_processing"` | `"data_available"` | `"error"`)
- `intentToken`: The current intent token being used
- `open(intentToken, options)`: Open the Passage modal
- `close()`: Close the Passage modal

### open() Options

```typescript
interface PassageOpenOptions {
  // How to display the modal
  presentationStyle?: "modal" | "embed";

  // Container element for embed mode
  container?: HTMLElement | string;

  // Callbacks
  onSuccess?: (data: PassageSuccessData) => void;
  onError?: (error: PassageErrorData) => void;
  onClose?: () => void;
  onStatusChange?: (status: ConnectionStatus) => void;
}
```

## Connection Status Flow

The SDK tracks the connection status through these stages:

1. **`pending`** - Initial state, QR code is displayed
2. **`connecting`** - User scanned QR code, establishing connection
3. **`connected`** - Successfully connected to user's device
4. **`data_processing`** - Processing account data
5. **`data_available`** - Data is ready (triggers onSuccess)
6. **`error`** - Something went wrong (triggers onError)

## Styling

### Custom Styles

You can customize the modal appearance:

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
      header: {
        fontSize: "28px",
      },
    },
  }}
>
```

### CSS Classes

The SDK uses these CSS classes that you can override:

- `.passage-modal-backdrop` - Modal backdrop
- `.passage-modal-container` - Modal container
- `.passage-modal-content` - Modal content area
- `.passage-modal-header` - Modal header
- `.passage-modal-body` - Modal body
- `.passage-modal-footer` - Modal footer
- `.passage-qr-code` - QR code container
- `.passage-status` - Status display container

## Embed Mode

Instead of a modal, you can embed Passage directly in your page:

```tsx
await open(intentToken, {
  presentationStyle: "embed",
  container: "#passage-container", // or HTMLElement
});
```

```html
<div id="passage-container"></div>
```

## Complete Example

```tsx
import React, { useState } from "react";
import { PassageProvider, usePassage } from "@tailriskai/passage-web-react";

function ConnectFlow() {
  const { initialize, open, isOpen, status } = usePassage();
  const [connectionData, setConnectionData] = useState(null);

  const handleConnect = async () => {
    try {
      // 1. Initialize Passage with your keys
      await initialize({
        publishableKey: "your-publishable-key",
        integrationId: "your-integration-id",
        products: ["history", "transactions"], // Optional: specify which data products to collect
        onConnectionComplete: async (data) => {
          console.log("Connection successful!", data);

          // 2. Fetch enriched data from your backend
          const dataResponse = await fetch(
            `/api/passage/connection/${data.connectionId}/history`
          );
          const enrichedData = await dataResponse.json();

          setConnectionData(enrichedData);
        },
        onError: (error) => {
          alert("Connection failed: " + error.error);
        },
      });

      // 3. Open Passage modal
      await open();
    } catch (error) {
      console.error("Error:", error);
    }
  };

  return (
    <div>
      {!connectionData ? (
        <button onClick={handleConnect} disabled={isOpen}>
          Connect Your Accounts
        </button>
      ) : (
        <div>
          <h3>Connection Complete!</h3>
          <pre>{JSON.stringify(connectionData, null, 2)}</pre>
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
```

## TypeScript Support

The SDK is written in TypeScript and provides full type definitions:

```typescript
import type {
  PassageConfig,
  PassageOpenOptions,
  PassageSuccessData,
  PassageErrorData,
  ConnectionStatus,
} from "@tailriskai/passage-web-react";
```

## Requirements

- React >= 16.8.0 (Hooks support)
- React DOM >= 16.8.0

## License

MIT © Passage
