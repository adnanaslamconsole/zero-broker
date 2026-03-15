import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeCacheSync } from "./lib/cacheSync";

// Initialize cache synchronization (clears stale data on version mismatch)
initializeCacheSync();

createRoot(document.getElementById("root")!).render(<App />);
