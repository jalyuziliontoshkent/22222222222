"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { apiRequest } from "@/lib/api-client";

export default function WorkerCompletedPage() {
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    apiRequest("/worker/tasks").then((data) => setTasks(data.filter((item: any) => item.worker_status === "completed")));
  }, []);

  return (
    <AppShell role="worker" title="Bajarilgan ishlar" subtitle="Tugallangan vazifalar arxivi.">
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
                <span className="status-pill status-success">Bajarildi</span>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">Hali tugallangan ish yo'q.</div>
        )}
      </div>
    </AppShell>
  );
}
