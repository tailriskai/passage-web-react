# Passage Web React SDK Examples

This directory contains interactive examples demonstrating how to use the Passage Web React SDK. The examples showcase different features and use cases of the SDK in a real React application.

## 🚀 Quick Start

### Prerequisites

- Node.js 16+
- npm, yarn, or pnpm

### Installation & Setup

1. **Navigate to the example directory:**

   ```bash
   cd passage-web-react/example
   ```

2. **Install dependencies:**

   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Start the development server:**

   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

4. **Open your browser:**
   Navigate to `http://localhost:3020` to see the examples.

## 📋 Available Examples

The example app includes five main demonstration components:

### 🚀 Basic Usage

- **File:** `src/components/BasicExample.tsx`
- **Purpose:** Demonstrates the simplest Passage integration
- **Features:**
  - Initialize with publishable key
  - Open modal with QR code
  - Handle connection completion and errors
  - Close modal and retrieve session data

### 🔑 Direct Intent Token

- **File:** `src/components/DirectTokenExample.tsx`
- **Purpose:** Shows how to use external intent tokens without initialization
- **Features:**
  - Skip initialize() step entirely
  - Open directly with pre-existing intent tokens
  - Mock token generation for testing
  - Works with modal, embed, and prompts modes
  - Ideal for server-side token generation

### 🎯 Prompts & Data Collection

- **File:** `src/components/PromptsExample.tsx`
- **Purpose:** Shows how to configure prompts for data collection
- **Features:**
  - Dynamic prompt configuration
  - Initialize with predefined prompts
  - Handle prompt completion events
  - Pass custom prompts when opening modal

### 📱 Embed Mode

- **File:** `src/components/EmbedExample.tsx`
- **Purpose:** Demonstrates embedding Passage directly in page content
- **Features:**
  - Embed mode vs modal presentation
  - Using DOM element refs for containers
  - Using CSS selectors for containers
  - Seamless inline integration

### ⚙️ Advanced Configuration

- **File:** `src/components/ConfigurationExample.tsx`
- **Purpose:** Shows advanced customization options
- **Features:**
  - Custom API URLs and WebSocket endpoints
  - External intent token usage
  - Custom styling configuration
  - Provider-level configuration

## 🛠️ Understanding the Code

### Provider Setup

The app is wrapped with `PassageProvider` in `src/main.tsx`:

```tsx
<PassageProvider
  config={{
    debug: true, // Enable debug logging
    // Optional custom configuration
    baseUrl: "http://localhost:3001",
    socketUrl: "http://localhost:3000",
    // socketNamespace: "/ws",
  }}
>
  <App />
</PassageProvider>
```

### Hook Usage

Each example uses the `usePassage` hook to access SDK functionality:

```tsx
import { usePassage } from "@getpassage/web-react";

const MyComponent = () => {
  const passage = usePassage();

  // Use passage.initialize(), passage.open(), etc.
};
```

### Core Methods

The examples demonstrate these key SDK methods:

- **`initialize(options)`** - Set up Passage with publishable key and callbacks
- **`open(options)`** - Display authentication interface (modal or embed)
- **`close()`** - Close the authentication interface
- **`getData()`** - Retrieve collected session data

### Two Integration Patterns

The examples show two main integration patterns:

#### 1. Initialize → Open Pattern

```tsx
// Traditional flow: initialize first, then open
await passage.initialize({
  publishableKey: "your_key_here",
  // callbacks...
});

await passage.open({
  // options...
});
```

#### 2. Direct Open Pattern

```tsx
// Direct flow: skip initialize, open with intent token
await passage.open({
  intentToken: "intent_token_from_external_source",
  // options and callbacks...
});
```

### Event Handling

All examples show proper error handling and event callbacks:

```tsx
await passage.initialize({
  publishableKey: "your_key_here",
  onConnectionComplete: (data) => {
    // Handle successful authentication
  },
  onError: (error) => {
    // Handle any errors
  },
  onDataComplete: (data) => {
    // Handle data collection completion
  },
  onPromptComplete: (prompt) => {
    // Handle individual prompt completion
  },
  onExit: (reason) => {
    // Handle user manually closing
  },
});
```

## 🎨 Customization

### Styling

The example includes custom CSS in `src/index.css` that you can modify. The SDK also supports custom modal styles through the Provider configuration:

```tsx
<PassageProvider
  config={{
    customStyles: {
      container: { /* Custom container styles */ },
      content: { /* Custom content styles */ },
      header: { /* Custom header styles */ },
      body: { /* Custom body styles */ },
      footer: { /* Custom footer styles */ }
    }
  }}
>
```

### Configuration

You can customize the SDK behavior by modifying the Provider config:

- **`debug`** - Enable/disable debug logging
- **`baseUrl`** - Custom web application URL
- **`socketUrl`** - Custom WebSocket server URL
- **`socketNamespace`** - Custom WebSocket namespace

## 💡 Tips

- Start with the Basic Example to understand the core flow
- Try the Direct Intent Token example for streamlined integration
- Use the browser's developer tools to see network requests and WebSocket connections
- The examples include comprehensive logging to help you understand what's happening
- Try modifying the examples to test different scenarios
- Each example is self-contained and can be used as a starting point for your implementation
