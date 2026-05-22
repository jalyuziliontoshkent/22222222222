"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { apiRequest } from "@/lib/api-client";
import { formatDateTime, formatMoney } from "@/lib/utils";
import { statusClasses, statusLabels } from "@/lib/constants";
import { useAppStore } from "@/stores/app-store";

export default function DealerDashboardPage() {
  const currency = useAppStore((state) => state.currency);
  const exchangeRate = useAppStore((state) => state.exchangeRate);
  const toggleCurrency = useAppStore((state) => state.toggleCurrency);
  const [orders, setOrders] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    Promise.all([apiRequest("/orders"), apiRequest("/auth/me")]).then(([orderData, me]) => {
      setOrders(orderData);
      setUser(me.user);
    });
  }, []);

  const pending = orders.filter((item) => item.status === "kutilmoqda").length;
  const inProgress = orders.filter((item) => ["tasdiqlangan", "tayyorlanmoqda", "tayyor"].includes(item.status)).length;
  const delivered = orders.filter((item) => item.status === "yetkazildi").length;

  return (
    <AppShell
      role="dealer"
      title="Dealer panel"
      subtitle="Buyurtmalaringiz va hisobingiz shu joyda."
      actions={
        <button className="button-secondary" type="button" onClick={toggleCurrency}>
          {currency}
        </button>
      }
    >
      <div className="two-col">
        <div className="hero-card">
          <span className="pill">Hisob holati</span>
          <div className="metric-number">{formatMoney(user?.credit_limit || 0, currency, exchangeRate)}</div>
          <p className="muted">Kredit limit</p>
          <div className="card" style={{ marginTop: 16 }}>
            <div className="split-row">
              <span>Joriy qarz</span>
              <strong>{formatMoney(user?.debt || 0, currency, exchangeRate)}</strong>
            </div>
          </div>
        </div>

        <div className="stats-grid" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
          {[
            ["Kutilmoqda", pending],
            ["Jarayonda", inProgress],
            ["Yetkazildi", delivered],
          ].map(([label, value]) => (
            <div key={String(label)} className="card">
              <div className="mini-kpi">{label}</div>
              <div className="metric-number">{value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3 className="section-title">So'nggi buyurtmalar</h3>
        <div className="list-stack">
          {orders.slice(0, 6).map((order) => (
            <div key={order.id} className="order-item">
              <div className="split-row">
                <div>
                  <span className="pill mono">#{order.order_code}</span>
                  <div style={{ marginTop: 10 }}>
                    <strong>{formatMoney(order.total_price, currency, exchangeRate)}</strong>
                    <div className="muted">{formatDateTime(order.created_at)}</div>
                  </div>
                </div>
                <span className={`status-pill ${statusClasses[order.status]}`}>{statusLabels[order.status]}</span>
              </div>
              <div className="order-items" style={{ marginTop: 12 }}>
                {order.items.map((item: any, index: number) => (
                  <span key={`${order.id}-${index}`} className="chip">
                    {item.material_name} · {item.width}x{item.height}m
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
