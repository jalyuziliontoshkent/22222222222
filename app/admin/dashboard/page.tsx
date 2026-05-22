"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { apiRequest } from "@/lib/api-client";
import { formatMoney } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";

export default function AdminDashboardPage() {
  const currency = useAppStore((state) => state.currency);
  const exchangeRate = useAppStore((state) => state.exchangeRate);
  const toggleCurrency = useAppStore((state) => state.toggleCurrency);
  const [stats, setStats] = useState<any>(null);
  const [reports, setReports] = useState<any>(null);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [profile, setProfile] = useState({ email: "", current_password: "", password: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      apiRequest("/statistics"),
      apiRequest("/reports"),
      apiRequest("/alerts/low-stock"),
      apiRequest("/auth/me"),
    ])
      .then(([statsData, reportData, lowStockData, meData]) => {
        setStats(statsData);
        setReports(reportData);
        setLowStock(lowStockData);
        setProfile((state) => ({ ...state, email: meData.user.email }));
      })
      .catch((loadError) => setError(loadError.message));
  }, []);

  async function saveProfile() {
    setMessage("");
    setError("");
    try {
      const result = await apiRequest("/auth/profile", {
        method: "PUT",
        body: JSON.stringify(profile),
      });
      setMessage(result.message || "Profil yangilandi");
      setProfile((state) => ({ ...state, current_password: "", password: "" }));
    } catch (saveError: any) {
      setError(saveError.message);
    }
  }

  const money = (value: number) => formatMoney(value, currency, exchangeRate);

  return (
    <AppShell
      role="admin"
      title="Operatsion markaz"
      subtitle="Buyurtma, ombor va hisobotlarni bir paneldan boshqaring."
      actions={
        <button className="button-secondary" type="button" onClick={toggleCurrency}>
          {currency === "USD" ? "USD" : "UZS"}
        </button>
      }
    >
      <div className="stats-grid">
        {[
          ["Jami buyurtma", stats?.total_orders || 0],
          ["Dilerlar", stats?.total_dealers || 0],
          ["Ishchilar", stats?.total_workers || 0],
          ["Materiallar", stats?.total_materials || 0],
        ].map(([label, value]) => (
          <div key={String(label)} className="card">
            <div className="mini-kpi">{label}</div>
            <div className="metric-number">{value}</div>
          </div>
        ))}
      </div>

      <div className="two-col" style={{ marginTop: 16 }}>
        <div className="hero-card">
          <span className="pill">Daromadlar</span>
          <div className="metric-number">{money(reports?.total_revenue || 0)}</div>
          <p className="muted">Oxirgi haftalik tushum: {money(reports?.weekly_revenue || 0)}</p>
          <div className="three-col" style={{ marginTop: 18 }}>
            <div className="card">
              <div className="mini-kpi">Kutilmoqda</div>
              <strong>{stats?.pending_orders || 0}</strong>
            </div>
            <div className="card">
              <div className="mini-kpi">Jarayonda</div>
              <strong>{(stats?.approved_orders || 0) + (stats?.preparing_orders || 0)}</strong>
            </div>
            <div className="card">
              <div className="mini-kpi">Yetkazildi</div>
              <strong>{stats?.delivered_orders || 0}</strong>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="section-title">Profil sozlamalari</h3>
          <div className="grid">
            {message ? <div className="success-text">{message}</div> : null}
            {error ? <div className="error-text">{error}</div> : null}
            <input
              className="field"
              placeholder="Email"
              value={profile.email}
              onChange={(event) => setProfile((state) => ({ ...state, email: event.target.value }))}
            />
            <input
              className="field"
              placeholder="Yangi parol"
              type="password"
              value={profile.password}
              onChange={(event) => setProfile((state) => ({ ...state, password: event.target.value }))}
            />
            <input
              className="field"
              placeholder="Joriy parol"
              type="password"
              value={profile.current_password}
              onChange={(event) => setProfile((state) => ({ ...state, current_password: event.target.value }))}
            />
            <button className="button" type="button" onClick={saveProfile}>
              Saqlash
            </button>
          </div>
        </div>
      </div>

      <div className="two-col" style={{ marginTop: 16 }}>
        <div className="card">
          <h3 className="section-title">Oxirgi 7 kun</h3>
          <div className="list-stack">
            {(reports?.daily || []).map((day: any) => (
              <div key={day.day} className="split-row">
                <span className="mono">{day.day}</span>
                <span className="muted">{day.orders} ta buyurtma</span>
                <strong>{money(day.revenue || 0)}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="section-title">Kam qolgan materiallar</h3>
          <div className="list-stack">
            {lowStock.length ? (
              lowStock.map((item) => (
                <div key={item.id} className="split-row">
                  <div>
                    <strong>{item.name}</strong>
                    <div className="muted">{item.category_name || item.category}</div>
                  </div>
                  <span className="status-pill status-danger">{item.stock_quantity} kv.m</span>
                </div>
              ))
            ) : (
              <div className="empty-state">Hozircha kritik qoldiq yo'q.</div>
            )}
          </div>
        </div>
      </div>

      <div className="two-col" style={{ marginTop: 16 }}>
        <div className="card">
          <h3 className="section-title">Top materiallar</h3>
          <div className="list-stack">
            {(reports?.top_materials || []).map((item: any, index: number) => (
              <div key={item.name} className="split-row">
                <div>
                  <strong>{index + 1}. {item.name}</strong>
                  <div className="muted">{item.count} ta item, {Number(item.total_sqm || 0).toFixed(1)} kv.m</div>
                </div>
                <strong>{money(item.total_price || 0)}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="section-title">Top dilerlar</h3>
          <div className="list-stack">
            {(reports?.top_dealers || []).map((item: any) => (
              <div key={item.name} className="split-row">
                <div>
                  <strong>{item.name}</strong>
                  <div className="muted">{item.orders} ta buyurtma</div>
                </div>
                <strong>{money(item.revenue || 0)}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
