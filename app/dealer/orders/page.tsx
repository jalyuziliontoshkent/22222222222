"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { apiRequest } from "@/lib/api-client";
import { allOrderStatuses, statusClasses, statusLabels } from "@/lib/constants";
import { formatDateTime, formatMoney } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";

export default function DealerOrdersPage() {
  const currency = useAppStore((state) => state.currency);
  const exchangeRate = useAppStore((state) => state.exchangeRate);
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    apiRequest("/orders").then(setOrders);
  }, []);

  return (
    <AppShell role="dealer" title="Buyurtmalarim" subtitle="Har bir buyurtmaning holati va yetkazish ma'lumotlari shu yerda.">
      <div className="list-stack">
        {orders.map((order) => (
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

            <div className="progress-track">
              {allOrderStatuses.slice(0, 6).map((status) => (
                <span
                  key={status}
                  className={`progress-step ${allOrderStatuses.indexOf(status) <= allOrderStatuses.indexOf(order.status) && order.status !== "rad_etilgan" ? "active" : ""}`}
                />
              ))}
            </div>

            {order.rejection_reason ? <div className="error-text">Sabab: {order.rejection_reason}</div> : null}

            {order.delivery_info ? (
              <div className="success-text">
                Haydovchi: {order.delivery_info.driver_name} · {order.delivery_info.driver_phone}
                {order.delivery_info.plate_number ? ` · ${order.delivery_info.plate_number}` : ""}
              </div>
            ) : null}

            <div className="list-stack" style={{ marginTop: 12 }}>
              {order.items.map((item: any, index: number) => (
                <div key={`${order.id}-${index}`} className="material-card">
                  <div className="split-row">
                    <div>
                      <strong>{item.material_name}</strong>
                      <div className="muted">{item.width} x {item.height} m · {item.sqm} kv.m</div>
                    </div>
                    <strong>{formatMoney(item.price || 0, currency, exchangeRate)}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
