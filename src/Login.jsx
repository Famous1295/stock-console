import { useState } from "react";
import { signIn } from "./supabaseClient";

export default function Login({ onLoggedIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    const { data, error } = await signIn(email.trim(), password);
    setBusy(false);
    if (error) {
      setError(error.message || "Login failed. Check your email and password.");
      return;
    }
    onLoggedIn(data.session);
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#FBF7EE", fontFamily: "'Inter', sans-serif", padding: 16,
    }}>
      <form onSubmit={handleSubmit} style={{
        background: "#fff", borderRadius: 16, padding: 32, width: "100%", maxWidth: 380,
        boxShadow: "0 8px 30px rgba(0,0,0,.08)", display: "flex", flexDirection: "column", gap: 14,
      }}>
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <img src="/logo.png" alt="" style={{ width: 56, height: 56, objectFit: "contain", margin: "0 auto 10px" }} />
          <h1 style={{ fontSize: 19, fontWeight: 700, color: "#1F3D2B", margin: 0 }}>Stock Console Login</h1>
          <p style={{ fontSize: 12.5, color: "rgba(31,61,43,.6)", marginTop: 4 }}>Sign in to manage your stock</p>
        </div>

        <label style={{ fontSize: 13, fontWeight: 600, color: "#1F3D2B" }}>
          Email
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            style={{ display: "block", width: "100%", marginTop: 6, padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(0,0,0,.15)", fontSize: 14 }}
          />
        </label>

        <label style={{ fontSize: 13, fontWeight: 600, color: "#1F3D2B" }}>
          Password
          <input
            type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            style={{ display: "block", width: "100%", marginTop: 6, padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(0,0,0,.15)", fontSize: 14 }}
          />
        </label>

        {error && <div style={{ color: "#B4472F", fontSize: 12.5 }}>{error}</div>}

        <button
          type="submit" disabled={busy}
          style={{
            marginTop: 6, padding: "11px 0", borderRadius: 8, border: "none",
            background: "#1F3D2B", color: "#fff", fontWeight: 600, fontSize: 14, cursor: "pointer",
            opacity: busy ? 0.7 : 1,
          }}
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
