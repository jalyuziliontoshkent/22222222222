"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { apiRequest } from "@/lib/api-client";

export default function AdminChatPage() {
  const [partners, setPartners] = useState<any[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");

  function loadPartners() {
    apiRequest("/chat/partners").then(setPartners);
  }

  async function loadMessages(partnerId: string) {
    const data = await apiRequest(`/messages/${partnerId}`);
    setMessages(data);
  }

  useEffect(() => {
    loadPartners();
  }, []);

  useEffect(() => {
    if (!selectedPartner) return;
    loadMessages(selectedPartner.id);
    const timer = setInterval(() => loadMessages(selectedPartner.id), 10000);
    return () => clearInterval(timer);
  }, [selectedPartner]);

  async function sendMessage() {
    if (!selectedPartner || !text.trim()) return;
    await apiRequest("/messages", {
      method: "POST",
      body: JSON.stringify({
        receiver_id: selectedPartner.id,
        text: text.trim(),
      }),
    });
    setText("");
    loadMessages(selectedPartner.id);
    loadPartners();
  }

  return (
    <AppShell role="admin" title="Chat markazi" subtitle="Dilerlar bilan yozishmalar shu sahifada jamlangan.">
      <div className="chat-layout">
        <div className="card">
          <h3 className="section-title">Dilerlar</h3>
          <div className="list-stack">
            {partners.map((partner) => (
              <button
                key={partner.id}
                type="button"
                className="chat-card"
                style={{ textAlign: "left" }}
                onClick={() => setSelectedPartner(partner)}
              >
                <div className="split-row">
                  <div className="list-row">
                    <div className="avatar">{partner.name?.charAt(0)}</div>
                    <div>
                      <strong>{partner.name}</strong>
                      <div className="muted">{partner.last_message || "Xabar yo'q"}</div>
                    </div>
                  </div>
                  {partner.unread_count ? <span className="status-pill status-accent">{partner.unread_count}</span> : null}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="card chat-window">
          {selectedPartner ? (
            <>
              <div>
                <div className="split-row" style={{ marginBottom: 16 }}>
                  <div>
                    <span className="pill">Suhbat</span>
                    <h3 className="section-title" style={{ marginTop: 12 }}>
                      {selectedPartner.name}
                    </h3>
                  </div>
                </div>
                <div className="chat-messages">
                  {messages.map((message) => (
                    <div key={message.id} className={`chat-bubble ${message.sender_role === "admin" ? "me" : ""}`}>
                      <div>{message.text}</div>
                      <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
                        {new Date(message.created_at).toLocaleTimeString("uz-UZ", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="chat-input">
                <textarea className="textarea" placeholder="Xabar yozing..." value={text} onChange={(e) => setText(e.target.value)} />
                <button className="button" type="button" onClick={sendMessage}>
                  Yuborish
                </button>
              </div>
            </>
          ) : (
            <div className="empty-state">Chap tomondan diler tanlang.</div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
