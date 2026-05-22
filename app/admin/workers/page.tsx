"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { apiRequest } from "@/lib/api-client";
import { formatDateTime, formatMoney } from "@/lib/utils";
import { statusClasses, statusLabels } from "@/lib/constants";
import { useAppStore } from "@/stores/app-store";

export default function AdminWorkersPage() {
  const currency = useAppStore((state) => state.currency);
  const exchangeRate = useAppStore((state) => state.exchangeRate);
  const [workers, setWorkers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", specialty: "" });
  const [delivery, setDelivery] = useState({ orderId: "", driver_name: "", driver_phone: "", plate_number: "" });

  function loadData() {
    Promise.all([apiRequest("/workers"), apiRequest("/orders")]).then(([workersData, orderData]) => {
      setWorkers(workersData);
      setOrders(orderData.filter((item: any) => ["tasdiqlangan", "tayyorlanmoqda", "tayyor", "yetkazilmoqda"].includes(item.status)));
    });
  }

  useEffect(() => {
    loadData();
  }, []);

  const activeOrders = useMemo(() => orders, [orders]);

  async function createWorker() {
    await apiRequest("/workers", {
      method: "POST",
      body: JSON.stringify(form),
    });
    setForm({ name: "", email: "", password: "", phone: "", specialty: "" });
    loadData();
  }

  async function assignWorker(orderId: string, itemIndex: number, workerId: string) {
    await apiRequest(`/orders/${orderId}/items/${itemIndex}/assign`, {
      method: "PUT",
      body: JSON.stringify({ worker_id: workerId }),
    });
    loadData();
  }

  async function assignDelivery() {
    if (!delivery.orderId) return;
    await apiRequest(`/orders/${delivery.orderId}/delivery`, {
      method: "PUT",
      body: JSON.stringify(delivery),
    });
    setDelivery({ orderId: "", driver_name: "", driver_phone: "", plate_number: "" });
    loadData();
  }

  async function confirmDelivery(orderId: string) {
    await apiRequest(`/orders/${orderId}/confirm-delivery`, { method: "PUT" });
    loadData();
  }

  return (
    <AppShell
      role="admin"
      title="Ishchilar va logistika"
      subtitle="Ishchilarni qo'shing, vazifalarni taqsimlang va yetkazishni boshqaring."
    >
      <div className="two-col">
        <div className="card">
          <h3 className="section-title">Yangi ishchi</h3>
          <div className="grid">
            <input className="field" placeholder="Ism" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
            <input className="field" placeholder="Email" value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} />
            <input className="field" placeholder="Parol" type="password" value={form.password} onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))} />
            <input className="field" placeholder="Telefon" value={form.phone} onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))} />
            <input className="field" placeholder="Mutaxassislik" value={form.specialty} onChange={(e) => setForm((s) => ({ ...s, specialty: e.target.value }))} />
            <button className="button" type="button" onClick={createWorker}>
              Ishchi qo'shish
            </button>
          </div>
        </div>

        <div className="card">
          <h3 className="section-title">Yetkazish ma'lumoti</h3>
          <div className="grid">
            <select className="select" value={delivery.orderId} onChange={(e) => setDelivery((s) => ({ ...s, orderId: e.target.value }))}>
              <option value="">Buyurtmani tanlang</option>
              {activeOrders.filter((item) => ["tayyor", "tayyorlanmoqda"].includes(item.status)).map((item) => (
                <option key={item.id} value={item.id}>
                  #{item.order_code} · {item.dealer_name}
                </option>
              ))}
            </select>
            <input className="field" placeholder="Haydovchi ismi" value={delivery.driver_name} onChange={(e) => setDelivery((s) => ({ ...s, driver_name: e.target.value }))} />
            <input className="field" placeholder="Telefon" value={delivery.driver_phone} onChange={(e) => setDelivery((s) => ({ ...s, driver_phone: e.target.value }))} />
            <input className="field" placeholder="Mashina raqami" value={delivery.plate_number} onChange={(e) => setDelivery((s) => ({ ...s, plate_number: e.target.value }))} />
            <button className="button" type="button" onClick={assignDelivery}>
              Biriktirish
            </button>
          </div>
        </div>
      </div>

      <div className="two-col" style={{ marginTop: 16 }}>
        <div className="card">
          <h3 className="section-title">Ishchilar ro'yxati</h3>
          <div className="list-stack">
            {workers.map((worker) => (
              <div key={worker.id} className="worker-card">
                <div className="split-row">
                  <div className="list-row">
                    <div className="avatar">{worker.name?.charAt(0)}</div>
                    <div>
                      <strong>{worker.name}</strong>
                      <div className="muted">{worker.email}</div>
                      <div className="muted">{worker.specialty || "Mutaxassislik ko'rsatilmagan"}</div>
                    </div>
                  </div>
                  <button className="button-danger" type="button" onClick={() => apiRequest(`/workers/${worker.id}`, { method: "DELETE" }).then(loadData)}>
                    O'chirish
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="section-title">Faol buyurtmalar</h3>
          <div className="list-stack">
            {activeOrders.map((order) => (
              <div key={order.id} className="order-item">
                <div className="split-row">
                  <div>
                    <span className="pill mono">#{order.order_code}</span>
                    <div style={{ marginTop: 10 }}>
                      <strong>{order.dealer_name}</strong>
                      <div className="muted">{formatDateTime(order.created_at)}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span className={`status-pill ${statusClasses[order.status]}`}>{statusLabels[order.status]}</span>
                    <div className="muted" style={{ marginTop: 8 }}>
                      {formatMoney(order.total_price, currency, exchangeRate)}
                    </div>
                  </div>
                </div>

                <div className="list-stack" style={{ marginTop: 14 }}>
                  {order.items.map((item: any, index: number) => (
                    <div key={`${order.id}-${index}`} className="material-card">
                      <div className="split-row">
                        <div>
                          <strong>{item.material_name}</strong>
                          <div className="muted">{item.width} x {item.height} m · {item.sqm} kv.m</div>
                        </div>
                        <div className="inline-actions">
                          {item.assigned_worker_name ? (
                            <span className={`status-pill ${item.worker_status === "completed" ? "status-success" : "status-accent"}`}>
                              {item.assigned_worker_name}
                            </span>
                          ) : (
                            workers.map((worker) => (
                              <button key={worker.id} className="button-ghost" type="button" onClick={() => assignWorker(order.id, index, worker.id)}>
                                {worker.name.split(" ")[0]}
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {order.status === "yetkazilmoqda" ? (
                  <button className="button-secondary" type="button" style={{ marginTop: 14 }} onClick={() => confirmDelivery(order.id)}>
                    Yetkazildi deb belgilash
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
