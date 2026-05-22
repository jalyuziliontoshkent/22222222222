import { createAccessToken, hashPassword, normalizeUser, verifyPassword } from "@/server/auth";
import { buildOrdersWorkbook } from "@/server/excel";
import { calculateBillableArea } from "@/lib/utils";

type MockState = {
  ids: Record<string, number>;
  users: any[];
  categories: any[];
  materials: any[];
  orders: any[];
  messages: any[];
  payments: any[];
};

declare global {
  // eslint-disable-next-line no-var
  var __curtainMockState: MockState | undefined;
}

function nowIso() {
  return new Date().toISOString();
}

function nextId(state: MockState, key: keyof MockState["ids"]) {
  state.ids[key] += 1;
  return state.ids[key];
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function safeUser(row: any) {
  const user = normalizeUser(row);
  delete (user as any).password_hash;
  return clone(user);
}

function safeMaterial(row: any) {
  return clone({
    ...row,
    id: String(row.id),
    category_id: row.category_id ? String(row.category_id) : null,
    price_per_sqm: Number(row.price_per_sqm || 0),
    stock_quantity: Number(row.stock_quantity || 0),
  });
}

function safeCategory(row: any, state: MockState) {
  const material_count = state.materials.filter((item) => String(item.category_id) === String(row.id)).length;
  return clone({ ...row, id: String(row.id), material_count });
}

function safeOrder(row: any) {
  return clone({
    ...row,
    id: String(row.id),
    dealer_id: String(row.dealer_id),
    total_sqm: Number(row.total_sqm || 0),
    total_price: Number(row.total_price || 0),
  });
}

function safeMessage(row: any) {
  return clone({
    ...row,
    id: String(row.id),
    sender_id: String(row.sender_id),
    receiver_id: String(row.receiver_id),
  });
}

function safePayment(row: any) {
  return clone({
    ...row,
    id: String(row.id),
    dealer_id: String(row.dealer_id),
    amount: Number(row.amount || 0),
  });
}

function makeOrderCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function seedState(): MockState {
  const now = nowIso();
  const state: MockState = {
    ids: {
      users: 3,
      categories: 3,
      materials: 6,
      orders: 0,
      messages: 0,
      payments: 0,
    },
    users: [
      {
        id: 1,
        name: "Admin",
        email: "admin@curtain.uz",
        password_hash: hashPassword("admin123"),
        role: "admin",
        phone: "",
        address: "",
        credit_limit: 0,
        debt: 0,
        specialty: "",
        created_at: now,
      },
      {
        id: 2,
        name: "Test Diler",
        email: "dealer@test.uz",
        password_hash: hashPassword("dealer123"),
        role: "dealer",
        phone: "+998901234567",
        address: "Toshkent, Yunusobod",
        credit_limit: 5000,
        debt: 0,
        specialty: "",
        created_at: now,
      },
      {
        id: 3,
        name: "Aziz Ishchi",
        email: "worker@test.uz",
        password_hash: hashPassword("worker123"),
        role: "worker",
        phone: "+998901112233",
        address: "",
        credit_limit: 0,
        debt: 0,
        specialty: "Jalyuzi o'rnatish",
        created_at: now,
      },
    ],
    categories: [
      { id: 1, name: "Parda", description: "Har xil parda turlari", image_url: "", created_at: now },
      { id: 2, name: "Jalyuzi", description: "Gorizontal va vertikal jalyuzilar", image_url: "", created_at: now },
      { id: 3, name: "Aksessuar", description: "Karniz, gardina va boshqa aksessuarlar", image_url: "", created_at: now },
    ],
    materials: [
      { id: 1, name: "Blackout Parda", category: "Parda", category_id: 1, category_name: "Parda", price_per_sqm: 7, stock_quantity: 500, unit: "kv.m", description: "Yorug'lik o'tkazmaydigan parda", image_url: "https://images.pexels.com/photos/4814070/pexels-photo-4814070.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", created_at: now },
      { id: 2, name: "Tull Parda", category: "Parda", category_id: 1, category_name: "Parda", price_per_sqm: 3.5, stock_quantity: 800, unit: "kv.m", description: "Shaffof tull parda", image_url: "https://images.unsplash.com/photo-1574197635162-68e4b468e4e9?w=600", created_at: now },
      { id: 3, name: "Roller Jalyuzi", category: "Jalyuzi", category_id: 2, category_name: "Jalyuzi", price_per_sqm: 10, stock_quantity: 300, unit: "kv.m", description: "Zamonaviy roller jalyuzi", image_url: "https://images.pexels.com/photos/19166538/pexels-photo-19166538.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", created_at: now },
      { id: 4, name: "Gorizontal Jalyuzi", category: "Jalyuzi", category_id: 2, category_name: "Jalyuzi", price_per_sqm: 8, stock_quantity: 400, unit: "kv.m", description: "Alyuminiy gorizontal jalyuzi", image_url: "https://images.unsplash.com/photo-1603299938527-d035bc6fc2c8?w=600", created_at: now },
      { id: 5, name: "Vertikal Jalyuzi", category: "Jalyuzi", category_id: 2, category_name: "Jalyuzi", price_per_sqm: 6, stock_quantity: 350, unit: "kv.m", description: "Ofis uchun vertikal jalyuzi", image_url: "https://images.pexels.com/photos/8955198/pexels-photo-8955198.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", created_at: now },
      { id: 6, name: "Rimskaya Parda", category: "Parda", category_id: 1, category_name: "Parda", price_per_sqm: 9, stock_quantity: 200, unit: "kv.m", description: "Premium rimskaya parda", image_url: "https://images.unsplash.com/photo-1729277980958-092c5e9e2ea4?w=600", created_at: now },
    ],
    orders: [],
    messages: [],
    payments: [],
  };
  return state;
}

export function getMockState() {
  if (!global.__curtainMockState) {
    global.__curtainMockState = seedState();
  }
  return global.__curtainMockState;
}

export const mockApi = {
  login(email: string, password: string) {
    const state = getMockState();
    const row = state.users.find((item) => item.email === email.trim().toLowerCase());
    if (!row || !verifyPassword(password, row.password_hash)) {
      throw new Error("Email yoki parol noto'g'ri");
    }
    const user = safeUser(row);
    return { token: createAccessToken(user), user };
  },
  getUserFromToken(userId: string) {
    const state = getMockState();
    const row = state.users.find((item) => String(item.id) === String(userId));
    return row ? safeUser(row) : null;
  },
  updateProfile(userId: string, body: any) {
    const state = getMockState();
    const user = state.users.find((item) => String(item.id) === String(userId));
    if (!user) throw new Error("User not found");
    if (!body.current_password || !verifyPassword(body.current_password, user.password_hash)) {
      throw new Error("Joriy parol noto'g'ri");
    }
    if (body.email) {
      const nextEmail = String(body.email).trim().toLowerCase();
      const exists = state.users.find((item) => item.email === nextEmail && String(item.id) !== String(userId));
      if (exists) throw new Error("Bu email allaqachon mavjud");
      user.email = nextEmail;
    }
    if (body.password) {
      if (String(body.password).trim().length < 4) throw new Error("Parol kamida 4 ta belgi");
      user.password_hash = hashPassword(body.password.trim());
    }
    const safe = safeUser(user);
    return { user: safe, token: createAccessToken(safe), message: "Profil yangilandi" };
  },
  listUsers(role: "dealer" | "worker") {
    const state = getMockState();
    return state.users.filter((item) => item.role === role).map(safeUser);
  },
  createDealer(body: any) {
    const state = getMockState();
    if (state.users.some((item) => item.email === String(body.email).trim().toLowerCase())) {
      throw new Error("Email mavjud");
    }
    const user = {
      id: nextId(state, "users"),
      name: body.name,
      email: String(body.email).trim().toLowerCase(),
      password_hash: hashPassword(body.password),
      role: "dealer",
      phone: body.phone || "",
      address: body.address || "",
      credit_limit: Number(body.credit_limit || 0),
      debt: 0,
      specialty: "",
      created_at: nowIso(),
    };
    state.users.unshift(user);
    return safeUser(user);
  },
  createWorker(body: any) {
    const state = getMockState();
    if (state.users.some((item) => item.email === String(body.email).trim().toLowerCase())) {
      throw new Error("Email mavjud");
    }
    const user = {
      id: nextId(state, "users"),
      name: body.name,
      email: String(body.email).trim().toLowerCase(),
      password_hash: hashPassword(body.password),
      role: "worker",
      phone: body.phone || "",
      address: "",
      credit_limit: 0,
      debt: 0,
      specialty: body.specialty || "",
      created_at: nowIso(),
    };
    state.users.unshift(user);
    return safeUser(user);
  },
  deleteUser(id: string, role: "dealer" | "worker") {
    const state = getMockState();
    const index = state.users.findIndex((item) => String(item.id) === String(id) && item.role === role);
    if (index === -1) throw new Error("Not found");
    state.users.splice(index, 1);
    return { message: "Deleted" };
  },
  listCategories() {
    const state = getMockState();
    return state.categories.map((item) => safeCategory(item, state));
  },
  createCategory(body: any) {
    const state = getMockState();
    const category = {
      id: nextId(state, "categories"),
      name: body.name,
      description: body.description || "",
      image_url: body.image_url || "",
      created_at: nowIso(),
    };
    state.categories.push(category);
    return safeCategory(category, state);
  },
  updateCategory(id: string, body: any) {
    const state = getMockState();
    const category = state.categories.find((item) => String(item.id) === String(id));
    if (!category) throw new Error("Not found");
    if (body.name !== undefined) category.name = body.name;
    if (body.description !== undefined) category.description = body.description;
    if (body.image_url !== undefined) category.image_url = body.image_url;
    state.materials.forEach((item) => {
      if (String(item.category_id) === String(id)) {
        item.category = category.name;
        item.category_name = category.name;
      }
    });
    return safeCategory(category, state);
  },
  deleteCategory(id: string) {
    const state = getMockState();
    const count = state.materials.filter((item) => String(item.category_id) === String(id)).length;
    if (count > 0) {
      throw new Error(`Bu kategoriyada ${count} ta mahsulot bor. Avval mahsulotlarni ko'chiring.`);
    }
    state.categories = state.categories.filter((item) => String(item.id) !== String(id));
    return { message: "Deleted" };
  },
  listMaterials(categoryId?: string) {
    const state = getMockState();
    const items = categoryId
      ? state.materials.filter((item) => String(item.category_id) === String(categoryId))
      : state.materials;
    return items.map(safeMaterial);
  },
  createMaterial(body: any) {
    const state = getMockState();
    const category = state.categories.find((item) => String(item.id) === String(body.category_id));
    const material = {
      id: nextId(state, "materials"),
      name: body.name,
      category: body.category || category?.name || "",
      category_id: body.category_id ? Number(body.category_id) : null,
      category_name: category?.name || body.category || "",
      price_per_sqm: Number(body.price_per_sqm || 0),
      stock_quantity: Number(body.stock_quantity || 0),
      unit: body.unit || "kv.m",
      description: body.description || "",
      image_url: body.image_url || "",
      created_at: nowIso(),
    };
    state.materials.push(material);
    return safeMaterial(material);
  },
  updateMaterial(id: string, body: any) {
    const state = getMockState();
    const material = state.materials.find((item) => String(item.id) === String(id));
    if (!material) throw new Error("Not found");
    Object.assign(material, {
      name: body.name ?? material.name,
      category: body.category ?? material.category,
      category_id: body.category_id !== undefined ? Number(body.category_id) : material.category_id,
      price_per_sqm: body.price_per_sqm !== undefined ? Number(body.price_per_sqm) : material.price_per_sqm,
      stock_quantity: body.stock_quantity !== undefined ? Number(body.stock_quantity) : material.stock_quantity,
      description: body.description ?? material.description,
      image_url: body.image_url ?? material.image_url,
    });
    const category = state.categories.find((item) => String(item.id) === String(material.category_id));
    material.category_name = category?.name || material.category;
    return safeMaterial(material);
  },
  deleteMaterial(id: string) {
    const state = getMockState();
    state.materials = state.materials.filter((item) => String(item.id) !== String(id));
    return { message: "Deleted" };
  },
  createOrder(actor: any, body: any) {
    const state = getMockState();
    const dealerId =
      actor.role === "admin"
        ? String(body.dealer_id || "")
        : String(actor.id);
    const dealer = state.users.find((item) => String(item.id) === dealerId && item.role === "dealer");
    if (!dealer) throw new Error("Diler topilmadi");
    const items = [];
    let total_sqm = 0;
    let total_price = 0;
    for (const input of body.items || []) {
      if (Number(input.width) <= 0 || Number(input.height) <= 0) throw new Error(`Noto'g'ri o'lcham: ${input.width}x${input.height}`);
      const raw_area = Number(input.width) * Number(input.height) * Number(input.quantity || 1);
      const sqm = calculateBillableArea(raw_area);
      const price = Number((sqm * Number(input.price_per_sqm || 0)).toFixed(2));
      total_sqm += sqm;
      total_price += price;
      items.push({
        material_id: String(input.material_id),
        material_name: input.material_name,
        width: Number(input.width),
        height: Number(input.height),
        quantity: Number(input.quantity || 1),
        raw_area: Number(raw_area.toFixed(4)),
        sqm: Number(sqm.toFixed(2)),
        price_per_sqm: Number(input.price_per_sqm || 0),
        price,
        notes: input.notes || "",
        assigned_worker_id: "",
        assigned_worker_name: "",
        worker_status: "pending",
      });
      const material = state.materials.find((item) => String(item.id) === String(input.material_id));
      if (material) material.stock_quantity = Math.max(0, Number(material.stock_quantity || 0) - sqm);
    }
    const order = {
      id: nextId(state, "orders"),
      order_code: makeOrderCode(),
      dealer_id: dealer.id,
      dealer_name: dealer.name,
      items,
      total_sqm: Number(total_sqm.toFixed(2)),
      total_price: Number(total_price.toFixed(2)),
      status: "kutilmoqda",
      notes: body.notes || "",
      rejection_reason: "",
      delivery_info: null,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    dealer.debt = Number(dealer.debt || 0) + order.total_price;
    state.orders.unshift(order);
    return safeOrder(order);
  },
  listOrders(user: any) {
    const state = getMockState();
    const orders = user.role === "dealer"
      ? state.orders.filter((item) => String(item.dealer_id) === String(user.id))
      : state.orders;
    return orders.map(safeOrder);
  },
  getOrder(user: any, orderId: string) {
    const state = getMockState();
    const order = state.orders.find((item) => String(item.id) === String(orderId));
    if (!order) throw new Error("Not found");
    if (user.role === "dealer" && String(order.dealer_id) !== String(user.id)) throw new Error("Forbidden");
    return safeOrder(order);
  },
  updateOrderStatus(orderId: string, body: any) {
    const state = getMockState();
    const order = state.orders.find((item) => String(item.id) === String(orderId));
    if (!order) throw new Error("Not found");
    order.status = body.status;
    order.updated_at = nowIso();
    if (body.status === "rad_etilgan") order.rejection_reason = body.rejection_reason || "";
    return safeOrder(order);
  },
  assignWorker(orderId: string, itemIndex: number, workerId: string) {
    const state = getMockState();
    const order = state.orders.find((item) => String(item.id) === String(orderId));
    const worker = state.users.find((item) => String(item.id) === String(workerId) && item.role === "worker");
    if (!order) throw new Error("Order not found");
    if (!worker) throw new Error("Worker not found");
    const item = order.items[itemIndex];
    if (!item) throw new Error("Invalid item index");
    item.assigned_worker_id = String(workerId);
    item.assigned_worker_name = worker.name;
    item.worker_status = "assigned";
    return safeOrder(order);
  },
  workerTasks(userId: string) {
    const state = getMockState();
    const tasks: any[] = [];
    for (const order of state.orders.filter((item) => ["tasdiqlangan", "tayyorlanmoqda", "tayyor"].includes(item.status))) {
      order.items.forEach((item: any, item_index: number) => {
        if (String(item.assigned_worker_id) === String(userId)) {
          tasks.push({
            order_id: String(order.id),
            order_code: order.order_code,
            dealer_name: order.dealer_name,
            item_index,
            material_name: item.material_name,
            width: item.width,
            height: item.height,
            sqm: item.sqm,
            notes: item.notes || "",
            worker_status: item.worker_status || "assigned",
            created_at: order.created_at,
          });
        }
      });
    }
    return clone(tasks);
  },
  completeWorkerTask(userId: string, orderId: string, itemIndex: number) {
    const state = getMockState();
    const order = state.orders.find((item) => String(item.id) === String(orderId));
    if (!order) throw new Error("Not found");
    const item = order.items[itemIndex];
    if (!item) throw new Error("Invalid item index");
    if (String(item.assigned_worker_id) !== String(userId)) throw new Error("Not your task");
    item.worker_status = "completed";
    order.updated_at = nowIso();
    const allDone = order.items.filter((entry: any) => entry.assigned_worker_id).every((entry: any) => entry.worker_status === "completed");
    if (allDone) {
      order.status = "tayyor";
      const admin = state.users.find((entry) => entry.role === "admin");
      if (admin) {
        state.messages.push({
          id: nextId(state, "messages"),
          sender_id: admin.id,
          sender_name: admin.name,
          sender_role: "admin",
          receiver_id: order.dealer_id,
          text: `Buyurtma #${order.order_code} tayyor! Barcha ishlar tugallandi.`,
          read: false,
          created_at: nowIso(),
        });
      }
    }
    return safeOrder(order);
  },
  assignDelivery(orderId: string, body: any) {
    const state = getMockState();
    const order = state.orders.find((item) => String(item.id) === String(orderId));
    if (!order) throw new Error("Buyurtma topilmadi");
    order.delivery_info = {
      driver_name: body.driver_name,
      driver_phone: body.driver_phone,
      plate_number: body.plate_number || "",
    };
    order.status = "yetkazilmoqda";
    order.updated_at = nowIso();
    return safeOrder(order);
  },
  confirmDelivery(orderId: string) {
    const state = getMockState();
    const order = state.orders.find((item) => String(item.id) === String(orderId));
    if (!order) throw new Error("Buyurtma topilmadi");
    order.status = "yetkazildi";
    order.updated_at = nowIso();
    return safeOrder(order);
  },
  sendMessage(sender: any, body: any) {
    const state = getMockState();
    const message = {
      id: nextId(state, "messages"),
      sender_id: Number(sender.id),
      sender_name: sender.name,
      sender_role: sender.role,
      receiver_id: Number(body.receiver_id),
      text: body.text,
      read: false,
      created_at: nowIso(),
    };
    state.messages.push(message);
    return safeMessage(message);
  },
  getMessages(userId: string, partnerId: string) {
    const state = getMockState();
    const items = state.messages.filter((item) =>
      (String(item.sender_id) === String(userId) && String(item.receiver_id) === String(partnerId)) ||
      (String(item.sender_id) === String(partnerId) && String(item.receiver_id) === String(userId)));
    items.forEach((item) => {
      if (String(item.sender_id) === String(partnerId) && String(item.receiver_id) === String(userId)) {
        item.read = true;
      }
    });
    return items.map(safeMessage);
  },
  getChatPartners(user: any) {
    const state = getMockState();
    const targets = user.role === "admin"
      ? state.users.filter((item) => item.role === "dealer")
      : state.users.filter((item) => item.role === "admin").slice(0, 1);
    return targets.map((target) => {
      const related = state.messages.filter((item) =>
        (String(item.sender_id) === String(user.id) && String(item.receiver_id) === String(target.id)) ||
        (String(item.sender_id) === String(target.id) && String(item.receiver_id) === String(user.id)));
      const last = related[related.length - 1];
      const unread_count = related.filter((item) => String(item.sender_id) === String(target.id) && String(item.receiver_id) === String(user.id) && !item.read).length;
      return {
        ...safeUser(target),
        last_message: last?.text || "",
        last_message_time: last?.created_at || "",
        unread_count,
      };
    });
  },
  statistics() {
    const orders = getMockState().orders;
    const users = getMockState().users;
    const materials = getMockState().materials;
    const total_revenue = orders.filter((item) => ["tasdiqlangan", "tayyorlanmoqda", "tayyor", "yetkazilmoqda", "yetkazildi"].includes(item.status)).reduce((sum, item) => sum + Number(item.total_price || 0), 0);
    return {
      total_orders: orders.length,
      pending_orders: orders.filter((item) => item.status === "kutilmoqda").length,
      approved_orders: orders.filter((item) => item.status === "tasdiqlangan").length,
      preparing_orders: orders.filter((item) => item.status === "tayyorlanmoqda").length,
      ready_orders: orders.filter((item) => item.status === "tayyor").length,
      delivering_orders: orders.filter((item) => item.status === "yetkazilmoqda").length,
      delivered_orders: orders.filter((item) => item.status === "yetkazildi").length,
      rejected_orders: orders.filter((item) => item.status === "rad_etilgan").length,
      total_dealers: users.filter((item) => item.role === "dealer").length,
      total_workers: users.filter((item) => item.role === "worker").length,
      total_materials: materials.length,
      total_revenue: Number(total_revenue.toFixed(2)),
    };
  },
  reports() {
    const state = getMockState();
    const now = new Date();
    const weekAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    const monthAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;
    const validOrders = state.orders.filter((item) => item.status !== "rad_etilgan");
    const weekly = validOrders.filter((item) => new Date(item.created_at).getTime() >= weekAgo);
    const monthly = validOrders.filter((item) => new Date(item.created_at).getTime() >= monthAgo);
    const materialStats: Record<string, any> = {};
    validOrders.forEach((order) => {
      order.items.forEach((item: any) => {
        if (!materialStats[item.material_name]) {
          materialStats[item.material_name] = { name: item.material_name, total_sqm: 0, total_price: 0, count: 0 };
        }
        materialStats[item.material_name].total_sqm += Number(item.sqm || 0);
        materialStats[item.material_name].total_price += Number(item.price || 0);
        materialStats[item.material_name].count += 1;
      });
    });
    const top_materials = Object.values(materialStats).sort((a: any, b: any) => b.total_price - a.total_price).slice(0, 5);
    const dealerRevenue: Record<string, any> = {};
    validOrders.forEach((order) => {
      if (!dealerRevenue[order.dealer_name]) {
        dealerRevenue[order.dealer_name] = { name: order.dealer_name, orders: 0, revenue: 0 };
      }
      dealerRevenue[order.dealer_name].orders += 1;
      dealerRevenue[order.dealer_name].revenue += Number(order.total_price || 0);
    });
    const top_dealers = Object.values(dealerRevenue).sort((a: any, b: any) => b.revenue - a.revenue).slice(0, 5);
    const daily = [];
    for (let i = 6; i >= 0; i -= 1) {
      const day = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const start = new Date(day); start.setHours(0, 0, 0, 0);
      const end = new Date(day); end.setHours(23, 59, 59, 999);
      const orders = validOrders.filter((item) => {
        const time = new Date(item.created_at).getTime();
        return time >= start.getTime() && time <= end.getTime();
      });
      daily.push({
        day: `${String(day.getDate()).padStart(2, "0")}.${String(day.getMonth() + 1).padStart(2, "0")}`,
        orders: orders.length,
        revenue: Number(orders.reduce((sum, item) => sum + Number(item.total_price || 0), 0).toFixed(2)),
      });
    }
    return {
      weekly_revenue: Number(weekly.reduce((sum, item) => sum + Number(item.total_price || 0), 0).toFixed(2)),
      monthly_revenue: Number(monthly.reduce((sum, item) => sum + Number(item.total_price || 0), 0).toFixed(2)),
      total_revenue: Number(validOrders.reduce((sum, item) => sum + Number(item.total_price || 0), 0).toFixed(2)),
      weekly_orders: weekly.length,
      monthly_orders: monthly.length,
      total_orders: state.orders.length,
      top_materials,
      top_dealers,
      daily,
    };
  },
  lowStock() {
    return getMockState().materials.filter((item) => Number(item.stock_quantity) < 10).map(safeMaterial);
  },
  addPayment(dealerId: string, body: any) {
    const state = getMockState();
    const dealer = state.users.find((item) => String(item.id) === String(dealerId) && item.role === "dealer");
    if (!dealer) throw new Error("Diler topilmadi");
    const amount = Number(body.amount || 0);
    if (amount <= 0) throw new Error("Summa 0 dan katta bo'lishi kerak");
    const payment = {
      id: nextId(state, "payments"),
      dealer_id: Number(dealerId),
      amount,
      note: body.note || "",
      created_at: nowIso(),
    };
    state.payments.unshift(payment);
    dealer.debt = Math.max(0, Number(dealer.debt || 0) - amount);
    return { message: "To'lov qabul qilindi", new_debt: Number(dealer.debt.toFixed(2)), paid: amount };
  },
  dealerPayments(dealerId: string) {
    return getMockState().payments.filter((item) => String(item.dealer_id) === String(dealerId)).map(safePayment);
  },
  exportOrdersBuffer() {
    return buildOrdersWorkbook(getMockState().orders.map(safeOrder));
  },
};
