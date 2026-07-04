import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import Login from "./Login.jsx";
import WorkspaceSelect from "./WorkspaceSelect.jsx";
import { getSession, onAuthStateChange, signOut } from "./supabaseClient";

function Root() {
  const [session, setSession] = useState(undefined); // undefined = checking, null = logged out
  const [workspace, setWorkspace] = useState(null);
  const [workspaceLabel, setWorkspaceLabel] = useState(null);

  useEffect(() => {
    getSession().then(setSession);
    const sub = onAuthStateChange((s) => {
      setSession(s);
      if (!s) { setWorkspace(null); setWorkspaceLabel(null); }
    });
    return () => sub.unsubscribe();
  }, []);

  if (session === undefined) {
    return <div style={{ minHeight: "100vh", background: "#FBF7EE" }} />;
  }

  if (!session) {
    return <Login onLoggedIn={setSession} />;
  }

  if (!workspace) {
    return (
      <WorkspaceSelect
        onSelect={(id, label) => { setWorkspace(id); setWorkspaceLabel(label); }}
        onLogout={() => signOut()}
      />
    );
  }

  return (
    <App
      workspace={workspace}
      workspaceLabel={workspaceLabel}
      onSwitchWorkspace={() => { setWorkspace(null); setWorkspaceLabel(null); }}
      onLogout={() => signOut()}
    />
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
