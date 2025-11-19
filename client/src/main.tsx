console.log('🚀 Peppol Light v2.1 - ErrorBoundary + HMR overlay OFF');
console.log('📅 Build:', new Date().toISOString());
console.log('🔧 Config: useSuspense=false, overlay=false');

import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./i18n/config";

createRoot(document.getElementById("root")!).render(<App />);
