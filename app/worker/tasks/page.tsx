"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { apiRequest } from "@/lib/api-client";

export default function WorkerTasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);

  function loadTasks() {
    apiRequest("/worker/tasks").then((data) => setTasks(data.filter((item: any) => item.worker_status !== "completed")));
  }

  useEffect(() => {
    loadTasks();
  }, []);

  async function completeTask(orderId: string, itemIndex: number) {
    await apiRequest(`/worker/tasks/${orderId}/${itemIndex}/complete`, { method: "PUT" });
    loadTasks();
  }

  return (
    <AppShell role="worker" title="Faol vazifalar" subtitle="Biriktirilgan ishlarni shu joydan yakunlaysiz.">
      <div className="list-stack">
        {tasks.length ? (
          tasks.map((task) => (
            <div key={`${task.order_id}-${task.item_index}`} className="task-card">
              <div className="split-row">
                <div>
                  <span className="pill mono">#{task.order_code}</span>
                  <h3 style={{ margin: "12px 0 6px" }}>{task.material_name}</h3>
                  <div className="muted">{task.dealer_name} · {task.width} x {task.height} m · {task.sqm} kv.m</div>
                </div>
                <button className="button" type="button" onClick={() => completeTask(task.order_id, task.item_index)}>
                  Bajarildi
                </button>
              </div>
              {task.notes ? <div className="muted" style={{ marginTop: 12 }}>{task.notes}</div> : null}
            </div>
          ))
        ) : (
          <div className="empty-state">Hozircha faol vazifa yo'q.</div>
        )}
      </div>
    </AppShell>
  );
}
