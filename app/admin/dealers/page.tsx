"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { apiRequest } from "@/lib/api-client";
import { formatDateTime, formatMoney } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";

export default function AdminDealersPage() {
  const currency = useAppStore((state) => state.currency);
  const exchangeRate = useAppStore((state) => state.exchangeRate);
  const [dealers, setDealers] = useState<any[]>([]);
  const [selectedDealer, setSelectedDealer] = useState<any>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", credit_limit: "" });
  const [payment, setPayment] = useState({ amount: "", note: "" });
  const [history, setHistory] = useState<any[]>([]);

  function loadDealers() {
    apiRequest("/dealers").then(setDealers);
  }

  useEffect(() => {
    loadDealers();
  }, []);

  async function createDealer() {
    await apiRequest("/dealers", {
      method: "POST",
      body: JSON.stringify({
        ...form,
        credit_limit: Number(form.credit_limit || 0),
      }),
    });
    setForm({ name: "", email: "", password: "", phone: "", credit_limit: "" });
    loadDealers();
  }

  async function submitPayment() {
    if (!selectedDealer) return;
    await apiRequest(`/dealers/${selectedDealer.id}/payment`, {
      method: "POST",
      body: JSON.stringify({
        amount: Number(payment.amount || 0),
        note: payment.note,
      }),
    });
    setPayment({ amount: "", note: "" });
    loadDealers();
    setHistory(await apiRequest(`/dealers/${selectedDealer.id}/payments`));
  }

  async function openDealer(dealer: any) {
    setSelectedDealer(dealer);
    setHistory(await apiRequest(`/dealers/${dealer.id}/payments`));
  }

  return (
    <AppShell
      role="admin"
      title="Dilerlar"
      subtitle="Hisob, qarz va to'lov tarixini shu yerdan yuriting."
    >
      <div className="two-col">
        <div className="card">
          <h3 className="section-title">Yangi diler</h3>
          <div className="grid">
            <input className="field" placeholder="Ism" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
            <input className="field" placeholder="Email" value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} />
            <input className="field" placeholder="Parol" type="password" value={form.password} onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))} />
            <input className="field" placeholder="Telefon" value={form.phone} onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))} />
            <input className="field" placeholder="Kredit limiti" value={form.credit_limit} onChange={(e) => setForm((s) => ({ ...s, credit_limit: e.target.value }))} />
            <button className="button" type="button" onClick={createDealer}>
              Qo'shish
            </button>
          </div>
        </div>

        <div className="card">
          <h3 className="section-title">To'lov qabul qilish</h3>
          {selectedDealer ? (
            <div className="grid">
              <div className="success-text">
                {selectedDealer.name} · joriy qarz: {formatMoney(selectedDealer.debt || 0, currency, exchangeRate)}
              </div>
              <input className="field" placeholder="To'lov summasi ($)" value={payment.amount} onChange={(e) => setPayment((s) => ({ ...s, amount: e.target.value }))} />
              <input className="field" placeholder="Izoh" value={payment.note} onChange={(e) => setPayment((s) => ({ ...s, note: e.target.value }))} />
              <button className="button" type="button" onClick={submitPayment}>
                To'lovni kiritish
              </button>
            </div>
          ) : (
            <div className="empty-state">Pastdagi ro'yxatdan diler tanlang.</div>
          )}
        </div>
      </div>

      <div className="two-col" style={{ marginTop: 16 }}>
        <div className="card">
          <h3 className="section-title">Dilerlar ro'yxati</h3>
          <div className="list-stack">
            {dealers.map((dealer) => (
              <div key={dealer.id} className="dealer-card">
                <div className="split-row">
                  <div className="list-row">
                    <div className="avatar">{dealer.name?.charAt(0)}</div>
                    <div>
                      <strong>{dealer.name}</strong>
                      <div className="muted">{dealer.email}</div>
                      <div className="muted">
                        Limit: {formatMoney(dealer.credit_limit || 0, currency, exchangeRate)} · Qarz: {formatMoney(dealer.debt || 0, currency, exchangeRate)}
                      </div>
                    </div>
                  </div>
                  <div className="inline-actions">
                    <button className="button-ghost" type="button" onClick={() => openDealer(dealer)}>
                      Tanlash
                    </button>
                    <button className="button-danger" type="button" onClick={() => apiRequest(`/dealers/${dealer.id}`, { method: "DELETE" }).then(loadDealers)}>
                      O'chirish
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="section-title">To'lov tarixi</h3>
          {selectedDealer ? (
            <div className="list-stack">
              {history.length ? (
                history.map((item) => (
                  <div key={item.id} className="worker-card">
                    <div className="split-row">
                      <strong>{formatMoney(item.amount, currency, exchangeRate)}</strong>
                      <span className="muted">{formatDateTime(item.created_at)}</span>
                    </div>
                    {item.note ? <div className="muted" style={{ marginTop: 8 }}>{item.note}</div> : null}
                  </div>
                ))
              ) : (
                <div className="empty-state">To'lov tarixi bo'sh.</div>
              )}
            </div>
          ) : (
            <div className="empty-state">Tarix ko'rish uchun diler tanlang.</div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
