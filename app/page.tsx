"use client";

import { useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { useAuth } from "@/components/providers";
import type { User } from "@/types/app";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await apiRequest<{ token: string; user: User }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });
      login(data.token, data.user);
    } catch (submitError: any) {
      setError(submitError.message || "Kirish amalga oshmadi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <section className="auth-hero">
          <div>
            <span className="auth-kicker">Web Control Center</span>
            <h1>Parda va jalyuzi boshqaruvi.</h1>
            <p>Hisob, buyurtma, ombor va ichki aloqalar bitta web panelda.</p>
          </div>
        </section>

        <section className="auth-form">
          <form onSubmit={onSubmit} className="grid">
            {error ? <div className="error-text">{error}</div> : null}
            <input
              className="field"
              placeholder="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <input
              className="field"
              placeholder="Parol"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button className="button" type="submit" disabled={loading}>
              {loading ? "Kirilmoqda..." : "Kirish"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
