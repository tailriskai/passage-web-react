import { AppClipPage } from "@getpassage/react-js";
import { useEffect, useState } from "react";
import BasicExample from "./components/BasicExample";

function App() {
  const [shortCodeFromUrl, setShortCodeFromUrl] = useState<string | null>(null);

  useEffect(() => {
    // Check for shortCode in URL params
    const params = new URLSearchParams(window.location.search);
    const shortCode = params.get('shortCode');
    if (shortCode) {
      setShortCodeFromUrl(shortCode);
    }
  }, []);

  // If shortCode is in URL, show the AppClipPage (kept for backward compatibility)
  if (shortCodeFromUrl) {
    return (
      <AppClipPage
        shortCode={shortCodeFromUrl}
        baseUrl="https://app.getpassage.com"
      />
    );
  }

  return (
    <div className="container">
      <header className="header">
        <h1>Passage Web React SDK</h1>
        <p>
          Interactive examples demonstrating the Passage authentication flow
        </p>
      </header>

      <div className="examples-container">
        <BasicExample />
      </div>

      <footer style={{ textAlign: "center", color: "#666", marginTop: "3rem", paddingTop: "2rem", borderTop: "1px solid #e0e0e0" }}>
        <p>
          Learn more about Passage at{" "}
          <a
            href="https://getpassage.ai"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#4a5568", textDecoration: "underline" }}
          >
            getpassage.ai
          </a>
        </p>
      </footer>
    </div>
  );
}

export default App;
