
import { useState } from "react";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth } from "./firebase";

export default function AdminLogin({ onSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (event) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      // Sign in using Firebase Authentication
      const result = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      // Retrieve the user's Firebase custom claims
      const tokenResult = await result.user.getIdTokenResult(true);

      // Check whether the account is an administrator
      if (tokenResult.claims.admin !== true) {
        await signOut(auth);

        setError("Access denied. This account is not an administrator.");
        return;
      }

      // Continue to the admin dashboard
      onSuccess(result.user);

    
} catch (err) {
    console.error("Firebase login error:", err.code, err.message);
  
    setError(
      `Firebase error: ${err.code || "unknown"}`
    );
  
  } finally {
    setLoading(false);
  }
  
  };

  return (
    <div className="hush-admin-login">
      <form className="hush-admin-login-card" onSubmit={handleLogin}>
        <h1>hush<span>.</span></h1>

        <h2>Administrator Login</h2>

        <p>Sign in to manage Hush and review reported content.</p>

        <label htmlFor="admin-email">Email address</label>

        <input
          id="admin-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Enter admin email"
          autoComplete="username"
          required
        />

        <label htmlFor="admin-password">Password</label>

        <input
          id="admin-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Enter password"
          autoComplete="current-password"
          required
        />

        {error && <p className="hush-admin-error" role="alert">{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>

        <a href="/">← Return to Hush</a>
      </form>
    </div>
  );
}
