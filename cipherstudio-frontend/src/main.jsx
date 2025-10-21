import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate, useParams, useLocation } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ProjectProvider } from "./context/ProjectContext.jsx";
import { ToastProvider } from "./components/ui/ToastProvider.jsx";

// Wrapper to inject workspaceId from route param into provider
const WorkspaceProviderWrapper = ({ children }) => {
  const params = useParams();
  const { search } = useLocation();
  const workspaceId = params?.workspaceId;
  const query = new URLSearchParams(search);
  const selectedProjectId = query.get("project") || null;
  const exampleId = query.get("example") || null;
  return <ProjectProvider workspaceId={workspaceId} selectedProjectId={selectedProjectId} exampleId={exampleId}>{children}</ProjectProvider>;
};

const Root = () => (
  <AuthProvider>
    <Routes>
      <Route
        path="/workspace/:workspaceId/*"
        element={
          <WorkspaceProviderWrapper>
            <App />
          </WorkspaceProviderWrapper>
        }
      />
      {/* Backwards compatibility: redirect /ide and / to last or new workspace */}
      <Route path="/ide" element={<Navigate to={`/workspace/${crypto.randomUUID()}/ide`} replace />} />
      <Route path="/*" element={<App />} />
    </Routes>
  </AuthProvider>
);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <Root />
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>
);
