const WORKSPACES = [
  { id: "fras", label: "FRAS Nutrayu", sub: "Supplement stock" },
  { id: "clinic", label: "Clinic", sub: "Clinic stock" },
];

export default function WorkspaceSelect({ onSelect, onLogout }) {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      background: "#FBF7EE", fontFamily: "'Inter', sans-serif", padding: 16, gap: 24,
    }}>
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "#1F3D2B", margin: 0 }}>Which stock do you want to open?</h1>
        <p style={{ fontSize: 13, color: "rgba(31,61,43,.6)", marginTop: 6 }}>You can switch anytime from the sidebar</p>
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
        {WORKSPACES.map((w) => (
          <button
            key={w.id}
            onClick={() => onSelect(w.id, w.label)}
            style={{
              width: 220, padding: "28px 20px", borderRadius: 16, border: "1px solid rgba(0,0,0,.1)",
              background: "#fff", cursor: "pointer", textAlign: "left",
              boxShadow: "0 4px 16px rgba(0,0,0,.05)",
            }}
          >
            <div style={{ fontSize: 17, fontWeight: 700, color: "#1F3D2B" }}>{w.label}</div>
            <div style={{ fontSize: 12.5, color: "rgba(31,61,43,.6)", marginTop: 4 }}>{w.sub}</div>
          </button>
        ))}
      </div>

      <button onClick={onLogout} style={{ background: "none", border: "none", color: "rgba(31,61,43,.5)", fontSize: 12.5, cursor: "pointer", textDecoration: "underline" }}>
        Log out
      </button>
    </div>
  );
}
