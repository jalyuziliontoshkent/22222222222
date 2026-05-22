"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { apiRequest } from "@/lib/api-client";

export default function DealerChatPage() {
  const [partner, setPartner] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");

  async function loadPartner() {
    const partners = await apiRequest("/chat/partners");
    setPartner(partners[0] || null);
  }

  async function loadMessages(partnerId: string) {
    const data = await apiRequest(`/messages/${partnerId}`);
    setMessages(data);
  }

  useEffect(() => {
    loadPartner();
  }, []);

  useEffect(() => {
    if (!partner) return;
    loadMessages(partner.id);
    const timer = setInterval(() => loadMessages(partner.id), 10000);
    return () => clearInterval(timer);
  }, [partner]);

  async function sendMessage() {
    if (!partner || !text.trim()) return;
    await apiRequest("/messages", {
      method: "POST",
      body: JSON.stringify({
        receiver_id: partner.id,
        text: text.trim(),
      }),
    });
    setText("");
    loadMessages(partner.id);
  }

  return (
    <AppShell role="dealer" title="Admin bilan chat" subtitle="Buyurtma bo'yicha tezkor muloqot uchun chat.">
      <div className="card chat-window">
        {partner ? (
          <>
            <div>
              <span className="pill">Hamkor</span>
              <h3 className="section-title" style={{ marginTop: 12 }}>{partner.name}</h3>
              <div className="chat-messages">
                {messages.map((message) => (
                  <div key={message.id} className={`chat-bubble ${message.sender_role === "dealer" ? "me" : ""}`}>
                    <div>{message.text}</div>
                    <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
                      {new Date(message.created_at).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}
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
          <div className="empty-state">Admin topilmadi.</div>
        )}
      </div>
    </AppShell>
  );
}
