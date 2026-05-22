export const statusLabels: Record<string, string> = {
  kutilmoqda: "Kutilmoqda",
  tasdiqlangan: "Tasdiqlangan",
  tayyorlanmoqda: "Tayyorlanmoqda",
  tayyor: "Tayyor",
  yetkazilmoqda: "Yetkazilmoqda",
  yetkazildi: "Yetkazildi",
  rad_etilgan: "Rad etilgan",
};

export const statusClasses: Record<string, string> = {
  kutilmoqda: "status-warning",
  tasdiqlangan: "status-accent",
  tayyorlanmoqda: "status-blue",
  tayyor: "status-success",
  yetkazilmoqda: "status-blue",
  yetkazildi: "status-success",
  rad_etilgan: "status-danger",
};

export const allOrderStatuses = [
  "kutilmoqda",
  "tasdiqlangan",
  "tayyorlanmoqda",
  "tayyor",
  "yetkazilmoqda",
  "yetkazildi",
  "rad_etilgan",
];

export const roleRoutes = {
  admin: "/admin/dashboard",
  dealer: "/dealer/dashboard",
  worker: "/worker/tasks",
} as const;

export const navByRole = {
  admin: [
    { href: "/admin/dashboard", label: "Dashboard" },
    { href: "/admin/orders", label: "Buyurtmalar" },
    { href: "/admin/inventory", label: "Ombor" },
    { href: "/admin/dealers", label: "Dilerlar" },
    { href: "/admin/workers", label: "Ishchilar" },
    { href: "/admin/chat", label: "Chat" },
  ],
  dealer: [
    { href: "/dealer/dashboard", label: "Dashboard" },
    { href: "/dealer/orders", label: "Buyurtmalarim" },
    { href: "/dealer/new-order", label: "Yangi buyurtma" },
    { href: "/dealer/chat", label: "Chat" },
  ],
  worker: [
    { href: "/worker/tasks", label: "Vazifalar" },
    { href: "/worker/completed", label: "Bajarilgan" },
  ],
} as const;
