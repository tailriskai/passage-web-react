# Passage Web SDK - Development

This is the development repository for the Passage Web SDK.

## Overview

The Passage Web SDK provides a React-based interface for integrating Passage into web applications. It displays a QR code that users scan with the Passage Authenticator mobile app and tracks the connection status in real-time via WebSocket.

## Development Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/tailriskai/passage-web-sdk.git
   cd passage-web-sdk
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Build the package:**

   ```bash
   npm run build
   ```

4. **Watch for changes during development:**

   ```bash
   npm run dev
   ```

## Project Structure

```
passage-web-sdk/
├── src/                      # TypeScript source files
│   ├── components/           # React components
│   │   ├── PassageModal.tsx  # Main modal UI
│   │   ├── QRCode.tsx        # QR code display
│   │   └── StatusDisplay.tsx # Status UI component
│   ├── Provider.tsx          # React Context Provider
│   ├── usePassage.ts         # React hook
│   ├── websocket-manager.ts  # WebSocket connection management
│   ├── types.ts              # TypeScript type definitions
│   └── index.ts              # Main entry point
├── dist/                     # Compiled JavaScript (generated)
├── example/                  # Example React app
├── README.npm.md             # README for published package
└── README.repo.md            # This file
```

## Architecture

### Components

1. **PassageProvider** - React Context provider that manages SDK state and WebSocket connections
2. **PassageModal** - Main UI component that displays QR code and status updates
3. **WebSocketManager** - Singleton class that manages WebSocket connections for real-time updates
4. **usePassage** - React hook for accessing SDK functionality

### Status Flow

The SDK tracks connection status through these stages:

```
pending → connecting → connected → data_processing → data_available
                         ↓
                       error
```

### WebSocket Events

The SDK listens for these WebSocket events:

- `status_update` - General status update message
- `connection_status` - Connection-specific status update
- Individual status events: `pending`, `connecting`, `connected`, etc.

## Local Development

### Testing with Example App

Create an example app to test the SDK:

```bash
mkdir example
cd example
npm init -y
npm install react react-dom parcel
```

Create `example/index.html`:

```html
<!DOCTYPE html>
<html>
  <body>
    <div id="root"></div>
    <script type="module" src="./app.tsx"></script>
  </body>
</html>
```

Create `example/app.tsx`:

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { PassageProvider, usePassage } from "../dist";

function App() {
  const { initialize, open } = usePassage();

  const handleInitialize = async () => {
    await initialize({
      publishableKey: "your-publishable-key",
      integrationId: "your-integration-id",
      onConnectionComplete: (data) => {
        console.log("Connection successful!", data);
      },
      onError: (error) => {
        console.error("Connection failed:", error);
      },
    });
  };

  const handleOpen = async () => {
    await open();
  };

  return (
    <div>
      <h1>Passage SDK Example</h1>
      <button onClick={handleInitialize}>Initialize</button>
      <button onClick={handleOpen}>Open Passage</button>
    </div>
  );
}

function Root() {
  return (
    <PassageProvider config={{ debug: true }}>
      <App />
    </PassageProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(<Root />);
```

### Running the Example

```bash
cd example
npx parcel index.html
```

## Publishing

### Prerequisites

1. GitHub personal access token with `write:packages` permission
2. Logged in to GitHub registry:

   ```bash
   npm login --registry=https://npm.pkg.github.com --scope=@tailriskai
   ```

### Release Process

1. **Update version:**

   ```bash
   npm version patch # or minor/major
   ```

2. **Build and test:**

   ```bash
   npm run build
   ```

3. **Publish:**

   ```bash
   npm publish
   ```

### Automated Release

This repository should be configured with GitHub Actions for automated releases (similar to passage-react-native).

## API Design Principles

1. **Simple API** - Easy to integrate with minimal configuration
2. **Type Safety** - Full TypeScript support with comprehensive types
3. **Customizable** - Support for custom styles and embed mode
4. **Real-time Updates** - WebSocket-based status tracking
5. **Error Handling** - Graceful error handling with clear messages

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add/update tests if applicable
5. Submit a pull request

## License

MIT © Passage

# passage-web-react
