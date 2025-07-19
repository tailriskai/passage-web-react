import BasicExample from "./components/BasicExample";

function App() {
  return (
    <div className="container">
      <header className="header">
        <h1>Passage Web React SDK</h1>
        <p>
          Interactive examples demonstrating the Passage authentication flow
        </p>
      </header>

      <div className="examples-grid">
        <BasicExample />
      </div>

      <footer style={{ textAlign: "center", color: "white", opacity: 0.8 }}>
        <p>
          Learn more about Passage at{" "}
          <a
            href="https://getpassage.ai"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "white", textDecoration: "underline" }}
          >
            getpassage.ai
          </a>
        </p>
      </footer>
    </div>
  );
}

export default App;
