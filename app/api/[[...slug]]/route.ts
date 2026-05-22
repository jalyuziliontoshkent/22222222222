import { NextRequest, NextResponse } from "next/server";
import {
  createAccessToken,
  decodeAccessToken,
  getUserFromRequest,
  hashPassword,
  normalizeUser,
  requireRole,
  verifyPassword,
} from "@/server/auth";
import { ensureDatabase } from "@/server/bootstrap";
import { cache } from "@/server/cache";
import { hasDatabaseConfig, query, queryOne, queryValue } from "@/server/db";
import { buildOrdersWorkbook } from "@/server/excel";
import { mockApi } from "@/server/mock-store";
import { calculateBillableArea } from "@/lib/utils";

export const runtime = "nodejs";

function ok(data: any, init?: number | ResponseInit) {
  if (typeof init === "number") {
    return NextResponse.json(data, { status: init });
  }
  return NextResponse.json(data, init);
}

function fail(detail: string, status = 400) {
  return NextResponse.json({ detail }, { status });
}

function orderCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function nowIso() {
  return new Date().toISOString();
}

function parseJson<T = any>(value: any) {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }
  return value as T;
}

function asId(value: any) {
  return String(value);
}

function safeUser(row: any) {
  const user = normalizeUser(row);
  delete (user as any).password_hash;
  return user;
}

function safeOrder(row: any) {
  return {
    ...row,
    id: asId(row.id),
    dealer_id: asId(row.dealer_id),
    total_sqm: Number(row.total_sqm || 0),
    total_price: Number(row.total_price || 0),
    items: parseJson(row.items) || [],
    delivery_info: parseJson(row.delivery_info),
  };
}

function safeMaterial(row: any) {
  return {
    ...row,
    id: asId(row.id),
    category_id: row.category_id ? asId(row.category_id) : null,
    price_per_sqm: Number(row.price_per_sqm || 0),
    stock_quantity: Number(row.stock_quantity || 0),
  };
}

function safeCategory(row: any) {
  return { ...row, id: asId(row.id), material_count: Number(row.material_count || 0) };
}

function safeMessage(row: any) {
  return {
    ...row,
    id: asId(row.id),
    sender_id: asId(row.sender_id),
    receiver_id: asId(row.receiver_id),
  };
}

function safePayment(row: any) {
  return {
    ...row,
    id: asId(row.id),
    dealer_id: asId(row.dealer_id),
    amount: Number(row.amount || 0),
  };
}

function buildUpdate(table: string, data: Record<string, any>, id: number) {
  const keys = Object.keys(data).filter((key) => data[key] !== undefined);
  if (!keys.length) return null;
  const setClause = keys.map((key, index) => `${key} = $${index + 1}`).join(", ");
  return {
    text: `UPDATE ${table} SET ${setClause} WHERE id = $${keys.length + 1}`,
    values: [...keys.map((key) => data[key]), id],
  };
}

async function listOrdersForUser(user: any) {
  const cacheKey = `orders_${user.id}_${user.role}`;
  const cached = cache.get<any[]>(cacheKey);
  if (cached) return cached;
  const rows =
    user.role === "dealer"
      ? await query("SELECT * FROM orders WHERE dealer_id = $1 ORDER BY created_at DESC", [Number(user.id)])
      : await query("SELECT * FROM orders ORDER BY created_at DESC LIMIT 500");
  const orders = rows.rows.map(safeOrder);
  cache.set(cacheKey, orders, 15);
  return orders;
}

async function getExchangeRate() {
  const cached = cache.get("exchange_rate");
  if (cached) return cached;
  try {
    const response = await fetch("https://cbu.uz/oz/arkhiv-kursov-valyut/json/USD/", {
      next: { revalidate: 3600 },
    });
    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      const result = {
        rate: Number(data[0].Rate),
        currency: "UZS",
        date: data[0].Date || "",
        source: "CBU.uz",
      };
      cache.set("exchange_rate", result, 3600);
      return result;
    }
  } catch {
    // fallback below
  }
  const fallback = { rate: 12800, currency: "UZS", date: "", source: "fallback" };
  cache.set("exchange_rate", fallback, 300);
  return fallback;
}

function getMockUserFromRequest(request: NextRequest) {
  const authHeader = request.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    throw new Error("Not authenticated");
  }

  try {
    const payload = decodeAccessToken(authHeader.slice(7));
    const user = mockApi.getUserFromToken(payload.sub);
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  } catch {
    throw new Error("Invalid token");
  }
}

function requireMockRole(request: NextRequest, role?: "admin" | "dealer" | "worker") {
  const user = getMockUserFromRequest(request);
  if (role && user.role !== role) {
    throw new Error("Forbidden");
  }
  return user;
}

async function routeMockRequest(request: NextRequest, slug: string[]) {
  const method = request.method.toUpperCase();

  if (!slug.length) {
    return ok({ name: "Curtain CRM API", status: "ok", mode: "mock" });
  }

  try {
    if (method === "GET" && slug[0] === "health") {
      return ok({ status: "ok", database: "not_configured", mode: "mock", time: nowIso() });
    }

    if (method === "GET" && slug[0] === "exchange-rate") {
      return ok(await getExchangeRate());
    }

    if (method === "POST" && slug[0] === "auth" && slug[1] === "login") {
      const body = await request.json();
      return ok(mockApi.login(String(body.email || ""), String(body.password || "")));
    }

    if (method === "GET" && slug[0] === "auth" && slug[1] === "me") {
      return ok({ user: getMockUserFromRequest(request) });
    }

    if (method === "PUT" && slug[0] === "auth" && slug[1] === "profile") {
      const user = getMockUserFromRequest(request);
      const body = await request.json();
      return ok(mockApi.updateProfile(user.id, body));
    }

    if (slug[0] === "dealers" && method === "POST" && slug.length === 1) {
      requireMockRole(request, "admin");
      return ok(mockApi.createDealer(await request.json()));
    }

    if (slug[0] === "dealers" && method === "GET" && slug.length === 1) {
      requireMockRole(request, "admin");
      return ok(mockApi.listUsers("dealer"));
    }

    if (slug[0] === "dealers" && slug.length === 2 && method === "DELETE") {
      requireMockRole(request, "admin");
      return ok(mockApi.deleteUser(slug[1], "dealer"));
    }

    if (slug[0] === "dealers" && slug[2] === "payment" && method === "POST") {
      requireMockRole(request, "admin");
      return ok(mockApi.addPayment(slug[1], await request.json()));
    }

    if (slug[0] === "dealers" && slug[2] === "payments" && method === "GET") {
      requireMockRole(request, "admin");
      return ok(mockApi.dealerPayments(slug[1]));
    }

    if (slug[0] === "workers" && method === "POST" && slug.length === 1) {
      requireMockRole(request, "admin");
      return ok(mockApi.createWorker(await request.json()));
    }

    if (slug[0] === "workers" && method === "GET" && slug.length === 1) {
      requireMockRole(request, "admin");
      return ok(mockApi.listUsers("worker"));
    }

    if (slug[0] === "workers" && method === "DELETE" && slug.length === 2) {
      requireMockRole(request, "admin");
      return ok(mockApi.deleteUser(slug[1], "worker"));
    }

    if (slug[0] === "categories" && method === "GET" && slug.length === 1) {
      getMockUserFromRequest(request);
      return ok(mockApi.listCategories());
    }

    if (slug[0] === "categories" && method === "POST" && slug.length === 1) {
      requireMockRole(request, "admin");
      return ok(mockApi.createCategory(await request.json()));
    }

    if (slug[0] === "categories" && method === "PUT" && slug.length === 2) {
      requireMockRole(request, "admin");
      return ok(mockApi.updateCategory(slug[1], await request.json()));
    }

    if (slug[0] === "categories" && method === "DELETE" && slug.length === 2) {
      requireMockRole(request, "admin");
      return ok(mockApi.deleteCategory(slug[1]));
    }

    if (slug[0] === "materials" && method === "GET" && slug.length === 1) {
      getMockUserFromRequest(request);
      return ok(mockApi.listMaterials());
    }

    if (slug[0] === "materials" && slug[1] === "by-category" && method === "GET") {
      getMockUserFromRequest(request);
      return ok(mockApi.listMaterials(slug[2]));
    }

    if (slug[0] === "materials" && method === "POST" && slug.length === 1) {
      requireMockRole(request, "admin");
      return ok(mockApi.createMaterial(await request.json()));
    }

    if (slug[0] === "materials" && method === "PUT" && slug.length === 2) {
      requireMockRole(request, "admin");
      return ok(mockApi.updateMaterial(slug[1], await request.json()));
    }

    if (slug[0] === "materials" && method === "DELETE" && slug.length === 2) {
      requireMockRole(request, "admin");
      return ok(mockApi.deleteMaterial(slug[1]));
    }

    if (slug[0] === "orders" && method === "POST" && slug.length === 1) {
      const user = getMockUserFromRequest(request);
      if (!["admin", "dealer"].includes(user.role)) {
        return fail("Forbidden", 403);
      }
      return ok(mockApi.createOrder(user, await request.json()));
    }

    if (slug[0] === "orders" && method === "GET" && slug.length === 1) {
      const user = getMockUserFromRequest(request);
      return ok(mockApi.listOrders(user));
    }

    if (slug[0] === "orders" && method === "GET" && slug.length === 2) {
      const user = getMockUserFromRequest(request);
      return ok(mockApi.getOrder(user, slug[1]));
    }

    if (slug[0] === "orders" && slug[2] === "status" && method === "PUT") {
      requireMockRole(request, "admin");
      return ok(mockApi.updateOrderStatus(slug[1], await request.json()));
    }

    if (slug[0] === "orders" && slug[2] === "items" && slug[4] === "assign" && method === "PUT") {
      requireMockRole(request, "admin");
      const body = await request.json();
      return ok(mockApi.assignWorker(slug[1], Number(slug[3]), String(body.worker_id || "")));
    }

    if (slug[0] === "worker" && slug[1] === "tasks" && method === "GET" && slug.length === 2) {
      const user = requireMockRole(request, "worker");
      return ok(mockApi.workerTasks(user.id));
    }

    if (slug[0] === "worker" && slug[1] === "tasks" && slug[4] === "complete" && method === "PUT") {
      const user = requireMockRole(request, "worker");
      return ok(mockApi.completeWorkerTask(user.id, slug[2], Number(slug[3])));
    }

    if (slug[0] === "orders" && slug[2] === "delivery" && method === "PUT") {
      requireMockRole(request, "admin");
      return ok(mockApi.assignDelivery(slug[1], await request.json()));
    }

    if (slug[0] === "orders" && slug[2] === "confirm-delivery" && method === "PUT") {
      requireMockRole(request, "admin");
      return ok(mockApi.confirmDelivery(slug[1]));
    }

    if (slug[0] === "messages" && method === "POST" && slug.length === 1) {
      const user = getMockUserFromRequest(request);
      return ok(mockApi.sendMessage(user, await request.json()));
    }

    if (slug[0] === "messages" && method === "GET" && slug.length === 2) {
      const user = getMockUserFromRequest(request);
      return ok(mockApi.getMessages(user.id, slug[1]));
    }

    if (slug[0] === "chat" && slug[1] === "partners" && method === "GET") {
      return ok(mockApi.getChatPartners(getMockUserFromRequest(request)));
    }

    if (slug[0] === "upload-image" && method === "POST") {
      requireMockRole(request, "admin");
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) return fail("Fayl topilmadi");
      if (!file.type.startsWith("image/")) return fail("Faqat rasm fayllari ruxsat etiladi");
      const bytes = Buffer.from(await file.arrayBuffer());
      return ok({ image_url: `data:${file.type};base64,${bytes.toString("base64")}` });
    }

    if (slug[0] === "statistics" && method === "GET") {
      requireMockRole(request, "admin");
      return ok(mockApi.statistics());
    }

    if (slug[0] === "reports" && method === "GET" && slug.length === 1) {
      requireMockRole(request, "admin");
      return ok(mockApi.reports());
    }

    if (slug[0] === "alerts" && slug[1] === "low-stock" && method === "GET") {
      requireMockRole(request, "admin");
      return ok(mockApi.lowStock());
    }

    if (slug[0] === "reports" && slug[1] === "export-orders" && method === "GET") {
      requireMockRole(request, "admin");
      const buffer = mockApi.exportOrdersBuffer();
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename=orders_${new Date().toISOString().slice(0, 10)}.xlsx`,
        },
      });
    }

    return fail("Endpoint topilmadi", 404);
  } catch (error: any) {
    const message = String(error?.message || error || "Server xatoligi");
    if (message === "Not authenticated" || message === "Invalid token") {
      return fail("Not authenticated", 401);
    }
    if (message === "Forbidden" || message === "Not your task") {
      return fail(message, 403);
    }
    if (message === "Not found" || message === "Order not found" || message === "Worker not found" || message === "Buyurtma topilmadi" || message === "Diler topilmadi") {
      return fail(message, 404);
    }
    return fail(message, 400);
  }
}

async function routeRequest(request: NextRequest, slug: string[]) {
  const method = request.method.toUpperCase();

  if (!slug.length) {
    return ok({ name: "Curtain CRM API", status: "ok" });
  }

  if (!hasDatabaseConfig()) {
    return routeMockRequest(request, slug);
  }

  if (!(slug.length === 1 && slug[0] === "health")) {
    await ensureDatabase();
  }

  try {
    if (method === "GET" && slug[0] === "health") {
      try {
        await query("SELECT 1");
        return ok({ status: "ok", database: "connected", time: nowIso() });
      } catch (error: any) {
        return ok({ status: "error", database: String(error?.message || error) });
      }
    }

    if (method === "GET" && slug[0] === "exchange-rate") {
      return ok(await getExchangeRate());
    }

    if (method === "POST" && slug[0] === "auth" && slug[1] === "login") {
      const body = await request.json();
      const userRow = await queryOne("SELECT * FROM users WHERE email = $1", [
        String(body.email || "").trim().toLowerCase(),
      ]);
      if (!userRow || !verifyPassword(String(body.password || ""), userRow.password_hash)) {
        return fail("Email yoki parol noto'g'ri", 401);
      }
      const user = safeUser(userRow);
      const token = createAccessToken(user);
      return ok({ token, user });
    }

    if (method === "GET" && slug[0] === "auth" && slug[1] === "me") {
      const user = await getUserFromRequest(request);
      return ok({ user });
    }

    if (method === "PUT" && slug[0] === "auth" && slug[1] === "profile") {
      const current = await getUserFromRequest(request);
      const body = await request.json();
      if (!body.current_password) {
        return fail("Joriy parolni kiriting");
      }
      const dbUser = await queryOne("SELECT * FROM users WHERE id = $1", [Number(current.id)]);
      if (!dbUser || !verifyPassword(body.current_password, dbUser.password_hash)) {
        return fail("Joriy parol noto'g'ri");
      }

      const updateData: Record<string, any> = {};
      if (body.email && body.email.trim().toLowerCase() !== dbUser.email) {
        const existing = await queryOne("SELECT id FROM users WHERE email = $1 AND id != $2", [
          body.email.trim().toLowerCase(),
          Number(current.id),
        ]);
        if (existing) return fail("Bu email allaqachon mavjud");
        updateData.email = body.email.trim().toLowerCase();
      }
      if (body.password) {
        if (String(body.password).trim().length < 4) {
          return fail("Parol kamida 4 ta belgi");
        }
        updateData.password_hash = hashPassword(body.password.trim());
      }
      const update = buildUpdate("users", updateData, Number(current.id));
      if (!update) return fail("O'zgartirish yo'q");
      await query(update.text, update.values);
      const updated = safeUser(await queryOne("SELECT * FROM users WHERE id = $1", [Number(current.id)]));
      const token = createAccessToken(updated);
      return ok({ user: updated, token, message: "Profil yangilandi" });
    }

    if (slug[0] === "dealers" && method === "POST" && slug.length === 1) {
      await requireRole(request, "admin");
      const body = await request.json();
      const existing = await queryOne("SELECT id FROM users WHERE email = $1", [
        String(body.email || "").trim().toLowerCase(),
      ]);
      if (existing) return fail("Email mavjud");
      const row = await queryOne(
        "INSERT INTO users (name, email, password_hash, role, phone, address, credit_limit, debt, specialty, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,0,'',$8) RETURNING *",
        [
          body.name,
          String(body.email || "").trim().toLowerCase(),
          hashPassword(body.password),
          "dealer",
          body.phone || "",
          body.address || "",
          Number(body.credit_limit || 0),
          nowIso(),
        ],
      );
      cache.invalidate("dealers", "stats");
      return ok(safeUser(row));
    }

    if (slug[0] === "dealers" && method === "GET" && slug.length === 1) {
      await requireRole(request, "admin");
      const cached = cache.get<any[]>("dealers_list");
      if (cached) return ok(cached);
      const rows = await query("SELECT * FROM users WHERE role = 'dealer' ORDER BY created_at DESC LIMIT 200");
      const dealers = rows.rows.map(safeUser);
      cache.set("dealers_list", dealers, 120);
      return ok(dealers);
    }

    if (slug[0] === "dealers" && slug.length === 2 && method === "PUT") {
      await requireRole(request, "admin");
      const body = await request.json();
      const update = buildUpdate(
        "users",
        {
          name: body.name,
          phone: body.phone,
          address: body.address,
          credit_limit: body.credit_limit,
        },
        Number(slug[1]),
      );
      if (!update) return fail("No data");
      await query(update.text, update.values);
      cache.invalidate("dealers");
      return ok(safeUser(await queryOne("SELECT * FROM users WHERE id = $1", [Number(slug[1])])));
    }

    if (slug[0] === "dealers" && slug.length === 2 && method === "DELETE") {
      await requireRole(request, "admin");
      const result = await query("DELETE FROM users WHERE id = $1 AND role = 'dealer'", [Number(slug[1])]);
      if (!result.rowCount) return fail("Not found", 404);
      cache.invalidate("dealers", "chat", "stats");
      return ok({ message: "Deleted" });
    }

    if (slug[0] === "dealers" && slug[2] === "payment" && method === "POST") {
      await requireRole(request, "admin");
      const body = await request.json();
      const amount = Number(body.amount || 0);
      if (amount <= 0) return fail("Summa 0 dan katta bo'lishi kerak");
      const dealer = await queryOne("SELECT * FROM users WHERE id = $1 AND role = 'dealer'", [Number(slug[1])]);
      if (!dealer) return fail("Diler topilmadi", 404);
      await query(
        "INSERT INTO payments (dealer_id, amount, note, created_at) VALUES ($1,$2,$3,$4)",
        [Number(slug[1]), amount, body.note || "", nowIso()],
      );
      const newDebt = Math.max(0, Number(dealer.debt || 0) - amount);
      await query("UPDATE users SET debt = $1 WHERE id = $2", [newDebt, Number(slug[1])]);
      cache.invalidate("dealers", "stats");
      return ok({ message: "To'lov qabul qilindi", new_debt: Number(newDebt.toFixed(2)), paid: amount });
    }

    if (slug[0] === "dealers" && slug[2] === "payments" && method === "GET") {
      await requireRole(request, "admin");
      const rows = await query("SELECT * FROM payments WHERE dealer_id = $1 ORDER BY created_at DESC", [Number(slug[1])]);
      return ok(rows.rows.map(safePayment));
    }

    if (slug[0] === "workers" && method === "POST" && slug.length === 1) {
      await requireRole(request, "admin");
      const body = await request.json();
      const existing = await queryOne("SELECT id FROM users WHERE email = $1", [
        String(body.email || "").trim().toLowerCase(),
      ]);
      if (existing) return fail("Email mavjud");
      const row = await queryOne(
        "INSERT INTO users (name, email, password_hash, role, phone, address, credit_limit, debt, specialty, created_at) VALUES ($1,$2,$3,$4,$5,'',$6,0,$7,$8) RETURNING *",
        [
          body.name,
          String(body.email || "").trim().toLowerCase(),
          hashPassword(body.password),
          "worker",
          body.phone || "",
          0,
          body.specialty || "",
          nowIso(),
        ],
      );
      cache.invalidate("workers", "stats");
      return ok(safeUser(row));
    }

    if (slug[0] === "workers" && method === "GET" && slug.length === 1) {
      await requireRole(request, "admin");
      const cached = cache.get<any[]>("workers_list");
      if (cached) return ok(cached);
      const rows = await query("SELECT * FROM users WHERE role = 'worker' ORDER BY created_at DESC LIMIT 200");
      const workers = rows.rows.map(safeUser);
      cache.set("workers_list", workers, 120);
      return ok(workers);
    }

    if (slug[0] === "workers" && method === "DELETE" && slug.length === 2) {
      await requireRole(request, "admin");
      const result = await query("DELETE FROM users WHERE id = $1 AND role = 'worker'", [Number(slug[1])]);
      if (!result.rowCount) return fail("Not found", 404);
      cache.invalidate("workers", "stats");
      return ok({ message: "Deleted" });
    }

    if (slug[0] === "categories" && method === "POST" && slug.length === 1) {
      await requireRole(request, "admin");
      const body = await request.json();
      const row = await queryOne(
        "INSERT INTO categories (name, description, image_url, created_at) VALUES ($1,$2,$3,$4) RETURNING *",
        [body.name, body.description || "", body.image_url || "", nowIso()],
      );
      cache.invalidate("categories", "materials");
      return ok(safeCategory(row));
    }

    if (slug[0] === "categories" && method === "GET" && slug.length === 1) {
      await getUserFromRequest(request);
      const cached = cache.get<any[]>("categories_list");
      if (cached) return ok(cached);
      const rows = await query(`
        SELECT c.*, COALESCE(mc.count, 0) AS material_count
        FROM categories c
        LEFT JOIN (
          SELECT category_id, COUNT(*)::int AS count
          FROM materials
          GROUP BY category_id
        ) mc ON mc.category_id = c.id
        ORDER BY c.name ASC
      `);
      const categories = rows.rows.map(safeCategory);
      cache.set("categories_list", categories, 60);
      return ok(categories);
    }

    if (slug[0] === "categories" && method === "PUT" && slug.length === 2) {
      await requireRole(request, "admin");
      const body = await request.json();
      const update = buildUpdate("categories", {
        name: body.name,
        description: body.description,
        image_url: body.image_url,
      }, Number(slug[1]));
      if (!update) return fail("No data");
      await query(update.text, update.values);
      cache.invalidate("categories", "materials");
      return ok(safeCategory(await queryOne("SELECT * FROM categories WHERE id = $1", [Number(slug[1])])));
    }

    if (slug[0] === "categories" && method === "DELETE" && slug.length === 2) {
      await requireRole(request, "admin");
      const materialCount = Number(await queryValue("SELECT COUNT(*)::int AS count FROM materials WHERE category_id = $1", [Number(slug[1])]));
      if (materialCount > 0) {
        return fail(`Bu kategoriyada ${materialCount} ta mahsulot bor. Avval mahsulotlarni ko'chiring.`);
      }
      const result = await query("DELETE FROM categories WHERE id = $1", [Number(slug[1])]);
      if (!result.rowCount) return fail("Not found", 404);
      cache.invalidate("categories", "materials");
      return ok({ message: "Deleted" });
    }

    if (slug[0] === "materials" && method === "POST" && slug.length === 1) {
      await requireRole(request, "admin");
      const body = await request.json();
      const row = await queryOne(
        "INSERT INTO materials (name, category, category_id, price_per_sqm, stock_quantity, unit, description, image_url, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *",
        [
          body.name,
          body.category || "",
          body.category_id ? Number(body.category_id) : null,
          Number(body.price_per_sqm || 0),
          Number(body.stock_quantity || 0),
          body.unit || "kv.m",
          body.description || "",
          body.image_url || "",
          nowIso(),
        ],
      );
      cache.invalidate("materials", "categories", "stats", "alerts");
      return ok(safeMaterial(row));
    }

    if (slug[0] === "materials" && method === "GET" && slug.length === 1) {
      await getUserFromRequest(request);
      const cached = cache.get<any[]>("materials_list");
      if (cached) return ok(cached);
      const rows = await query("SELECT m.*, c.name as category_name FROM materials m LEFT JOIN categories c ON m.category_id = c.id ORDER BY c.name ASC, m.name ASC LIMIT 500");
      const materials = rows.rows.map(safeMaterial);
      cache.set("materials_list", materials, 60);
      return ok(materials);
    }

    if (slug[0] === "materials" && slug[1] === "by-category" && method === "GET") {
      await getUserFromRequest(request);
      const cacheKey = `materials_cat_${slug[2]}`;
      const cached = cache.get<any[]>(cacheKey);
      if (cached) return ok(cached);
      const rows = await query("SELECT * FROM materials WHERE category_id = $1 ORDER BY name ASC", [Number(slug[2])]);
      const materials = rows.rows.map(safeMaterial);
      cache.set(cacheKey, materials, 60);
      return ok(materials);
    }

    if (slug[0] === "materials" && method === "PUT" && slug.length === 2) {
      await requireRole(request, "admin");
      const body = await request.json();
      const update = buildUpdate("materials", {
        name: body.name,
        category: body.category,
        category_id: body.category_id ? Number(body.category_id) : body.category_id,
        price_per_sqm: body.price_per_sqm !== undefined ? Number(body.price_per_sqm) : undefined,
        stock_quantity: body.stock_quantity !== undefined ? Number(body.stock_quantity) : undefined,
        description: body.description,
        image_url: body.image_url,
      }, Number(slug[1]));
      if (!update) return fail("No data");
      await query(update.text, update.values);
      cache.invalidate("materials", "categories", "alerts");
      return ok(safeMaterial(await queryOne("SELECT * FROM materials WHERE id = $1", [Number(slug[1])])));
    }

    if (slug[0] === "materials" && method === "DELETE" && slug.length === 2) {
      await requireRole(request, "admin");
      const result = await query("DELETE FROM materials WHERE id = $1", [Number(slug[1])]);
      if (!result.rowCount) return fail("Not found", 404);
      cache.invalidate("materials", "categories", "stats", "alerts");
      return ok({ message: "Deleted" });
    }

    if (slug[0] === "orders" && method === "POST" && slug.length === 1) {
      const user = await getUserFromRequest(request);
      if (!["admin", "dealer"].includes(user.role)) {
        return fail("Forbidden", 403);
      }
      const body = await request.json();
      const dealer =
        user.role === "admin"
          ? await queryOne("SELECT * FROM users WHERE id = $1 AND role = 'dealer'", [Number(body.dealer_id)])
          : await queryOne("SELECT * FROM users WHERE id = $1 AND role = 'dealer'", [Number(user.id)]);
      if (!dealer) {
        return fail("Diler topilmadi", 404);
      }
      const items: any[] = [];
      let totalPrice = 0;
      let totalSqm = 0;

      for (const item of body.items || []) {
        if (Number(item.width) <= 0 || Number(item.height) <= 0) {
          return fail(`Noto'g'ri o'lcham: ${item.width}x${item.height}`);
        }
        const rawArea = Number(item.width) * Number(item.height) * Number(item.quantity || 1);
        const sqm = calculateBillableArea(rawArea);
        if (sqm <= 0) {
          return fail(`Noto'g'ri maydon: ${rawArea}`);
        }
        const price = sqm * Number(item.price_per_sqm || 0);
        totalSqm += sqm;
        totalPrice += price;
        items.push({
          material_id: item.material_id,
          material_name: item.material_name,
          width: Number(item.width),
          height: Number(item.height),
          quantity: Number(item.quantity || 1),
          raw_area: Number(rawArea.toFixed(4)),
          sqm: Number(sqm.toFixed(2)),
          price_per_sqm: Number(item.price_per_sqm || 0),
          price: Number(price.toFixed(2)),
          notes: item.notes || "",
          assigned_worker_id: "",
          assigned_worker_name: "",
          worker_status: "pending",
        });
      }

      const row = await queryOne(
        "INSERT INTO orders (order_code, dealer_id, dealer_name, items, total_sqm, total_price, status, notes, rejection_reason, delivery_info, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *",
        [
          orderCode(),
          Number(dealer.id),
          dealer.name,
          JSON.stringify(items),
          Number(totalSqm.toFixed(2)),
          Number(totalPrice.toFixed(2)),
          "kutilmoqda",
          body.notes || "",
          "",
          null,
          nowIso(),
          nowIso(),
        ],
      );

      await query("UPDATE users SET debt = debt + $1 WHERE id = $2", [totalPrice, Number(dealer.id)]);

      for (const item of items) {
        try {
          await query(
            "UPDATE materials SET stock_quantity = GREATEST(0, stock_quantity - $1) WHERE id = $2",
            [item.sqm, Number(item.material_id)],
          );
        } catch {
          // ignore individual stock errors
        }
      }

      cache.invalidate("orders", "stats", "reports", "materials", "alerts", "dealers");
      return ok(safeOrder(row));
    }

    if (slug[0] === "orders" && method === "GET" && slug.length === 1) {
      const user = await getUserFromRequest(request);
      return ok(await listOrdersForUser(user));
    }

    if (slug[0] === "orders" && method === "GET" && slug.length === 2) {
      const user = await getUserFromRequest(request);
      const row = await queryOne("SELECT * FROM orders WHERE id = $1", [Number(slug[1])]);
      if (!row) return fail("Not found", 404);
      if (user.role === "dealer" && String(row.dealer_id) !== user.id) {
        return fail("Forbidden", 403);
      }
      return ok(safeOrder(row));
    }

    if (slug[0] === "orders" && slug[2] === "status" && method === "PUT") {
      await requireRole(request, "admin");
      const body = await request.json();
      const valid = ["kutilmoqda", "tasdiqlangan", "tayyorlanmoqda", "tayyor", "yetkazilmoqda", "yetkazildi", "rad_etilgan"];
      if (!valid.includes(body.status)) return fail("Invalid status");
      if (body.status === "rad_etilgan") {
        await query("UPDATE orders SET status = $1, rejection_reason = $2, updated_at = $3 WHERE id = $4", [
          body.status,
          body.rejection_reason || "",
          nowIso(),
          Number(slug[1]),
        ]);
      } else {
        await query("UPDATE orders SET status = $1, updated_at = $2 WHERE id = $3", [
          body.status,
          nowIso(),
          Number(slug[1]),
        ]);
      }
      cache.invalidate("orders", "stats", "reports");
      return ok(safeOrder(await queryOne("SELECT * FROM orders WHERE id = $1", [Number(slug[1])])));
    }

    if (slug[0] === "orders" && slug[2] === "items" && slug[4] === "assign" && method === "PUT") {
      await requireRole(request, "admin");
      const body = await request.json();
      const order = await queryOne("SELECT * FROM orders WHERE id = $1", [Number(slug[1])]);
      if (!order) return fail("Order not found", 404);
      const items = parseJson<any[]>(order.items) || [];
      const itemIndex = Number(slug[3]);
      if (itemIndex >= items.length) return fail("Invalid item index");
      const worker = await queryOne("SELECT * FROM users WHERE id = $1 AND role = 'worker'", [Number(body.worker_id)]);
      if (!worker) return fail("Worker not found", 404);
      items[itemIndex].assigned_worker_id = String(body.worker_id);
      items[itemIndex].assigned_worker_name = worker.name;
      items[itemIndex].worker_status = "assigned";
      await query("UPDATE orders SET items = $1 WHERE id = $2", [JSON.stringify(items), Number(slug[1])]);
      cache.invalidate("orders");
      return ok(safeOrder(await queryOne("SELECT * FROM orders WHERE id = $1", [Number(slug[1])])));
    }

    if (slug[0] === "worker" && slug[1] === "tasks" && method === "GET" && slug.length === 2) {
      const user = await requireRole(request, "worker");
      const rows = await query("SELECT * FROM orders WHERE status IN ('tasdiqlangan','tayyorlanmoqda')");
      const tasks: any[] = [];
      for (const row of rows.rows) {
        const items = parseJson<any[]>(row.items) || [];
        items.forEach((item, index) => {
          if (item.assigned_worker_id === user.id) {
            tasks.push({
              order_id: asId(row.id),
              order_code: row.order_code,
              dealer_name: row.dealer_name,
              item_index: index,
              material_name: item.material_name,
              width: item.width,
              height: item.height,
              sqm: item.sqm,
              notes: item.notes || "",
              worker_status: item.worker_status || "assigned",
              created_at: row.created_at,
            });
          }
        });
      }
      return ok(tasks);
    }

    if (slug[0] === "worker" && slug[1] === "tasks" && slug[4] === "complete" && method === "PUT") {
      const user = await requireRole(request, "worker");
      const order = await queryOne("SELECT * FROM orders WHERE id = $1", [Number(slug[2])]);
      if (!order) return fail("Not found", 404);
      const items = parseJson<any[]>(order.items) || [];
      const itemIndex = Number(slug[3]);
      if (itemIndex >= items.length) return fail("Invalid item index");
      if (items[itemIndex].assigned_worker_id !== user.id) return fail("Not your task", 403);
      if (items[itemIndex].worker_status !== "completed") {
        items[itemIndex].worker_status = "completed";
        await query("UPDATE orders SET items = $1, updated_at = $2 WHERE id = $3", [
          JSON.stringify(items),
          nowIso(),
          Number(slug[2]),
        ]);

        const allDone = items
          .filter((item) => item.assigned_worker_id)
          .every((item) => item.worker_status === "completed");

        if (allDone) {
          await query("UPDATE orders SET status = 'tayyor', updated_at = $1 WHERE id = $2", [
            nowIso(),
            Number(slug[2]),
          ]);
          const admin = await queryOne("SELECT id, name FROM users WHERE role = 'admin' LIMIT 1");
          if (admin && order.dealer_id) {
            await query(
              "INSERT INTO messages (sender_id, sender_name, sender_role, receiver_id, text, read, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)",
              [
                admin.id,
                admin.name || "Admin",
                "admin",
                order.dealer_id,
                `Buyurtma #${order.order_code} tayyor! Barcha ishlar tugallandi.`,
                false,
                nowIso(),
              ],
            );
          }
        } else {
          const admin = await queryOne("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
          if (admin) {
            const completedCount = items.filter((item) => item.worker_status === "completed").length;
            const totalAssigned = items.filter((item) => item.assigned_worker_id).length;
            await query(
              "INSERT INTO messages (sender_id, sender_name, sender_role, receiver_id, text, read, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)",
              [
                Number(user.id),
                user.name,
                "worker",
                admin.id,
                `#${order.order_code}: ${items[itemIndex].material_name} tayyor (${completedCount}/${totalAssigned})`,
                false,
                nowIso(),
              ],
            );
          }
        }
      }
      cache.invalidate("orders", "stats", "reports");
      return ok(safeOrder(await queryOne("SELECT * FROM orders WHERE id = $1", [Number(slug[2])])));
    }

    if (slug[0] === "orders" && slug[2] === "delivery" && method === "PUT") {
      await requireRole(request, "admin");
      const body = await request.json();
      const existing = await queryOne("SELECT id FROM orders WHERE id = $1", [Number(slug[1])]);
      if (!existing) return fail("Buyurtma topilmadi", 404);
      await query("UPDATE orders SET delivery_info = $1, status = 'yetkazilmoqda', updated_at = $2 WHERE id = $3", [
        JSON.stringify({
          driver_name: body.driver_name,
          driver_phone: body.driver_phone,
          plate_number: body.plate_number || "",
        }),
        nowIso(),
        Number(slug[1]),
      ]);
      cache.invalidate("orders", "stats");
      return ok(safeOrder(await queryOne("SELECT * FROM orders WHERE id = $1", [Number(slug[1])])));
    }

    if (slug[0] === "orders" && slug[2] === "confirm-delivery" && method === "PUT") {
      await requireRole(request, "admin");
      const existing = await queryOne("SELECT id FROM orders WHERE id = $1", [Number(slug[1])]);
      if (!existing) return fail("Buyurtma topilmadi", 404);
      await query("UPDATE orders SET status = 'yetkazildi', updated_at = $1 WHERE id = $2", [
        nowIso(),
        Number(slug[1]),
      ]);
      cache.invalidate("orders", "stats", "reports");
      return ok(safeOrder(await queryOne("SELECT * FROM orders WHERE id = $1", [Number(slug[1])])));
    }

    if (slug[0] === "messages" && method === "POST" && slug.length === 1) {
      const user = await getUserFromRequest(request);
      const body = await request.json();
      const row = await queryOne(
        "INSERT INTO messages (sender_id, sender_name, sender_role, receiver_id, text, read, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",
        [Number(user.id), user.name, user.role, Number(body.receiver_id), body.text, false, nowIso()],
      );
      cache.invalidate("chat");
      return ok(safeMessage(row));
    }

    if (slug[0] === "messages" && method === "GET" && slug.length === 2) {
      const user = await getUserFromRequest(request);
      const rows = await query(
        "SELECT * FROM messages WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1) ORDER BY created_at ASC",
        [Number(user.id), Number(slug[1])],
      );
      await query("UPDATE messages SET read = TRUE WHERE sender_id = $1 AND receiver_id = $2 AND read = FALSE", [
        Number(slug[1]),
        Number(user.id),
      ]);
      return ok(rows.rows.map(safeMessage));
    }

    if (slug[0] === "chat" && slug[1] === "partners" && method === "GET") {
      const user = await getUserFromRequest(request);
      if (user.role === "admin") {
        const dealers = await query("SELECT * FROM users WHERE role = 'dealer' ORDER BY name");
        const partners = [];
        for (const row of dealers.rows) {
          const lastMessage = await queryOne(
            "SELECT text, created_at FROM messages WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1) ORDER BY created_at DESC LIMIT 1",
            [Number(user.id), row.id],
          );
          const unreadCount = Number(
            await queryValue("SELECT COUNT(*)::int AS count FROM messages WHERE sender_id = $1 AND receiver_id = $2 AND read = FALSE", [row.id, Number(user.id)]),
          );
          partners.push({
            ...safeUser(row),
            last_message: lastMessage?.text || "",
            last_message_time: lastMessage?.created_at || "",
            unread_count: unreadCount || 0,
          });
        }
        return ok(partners);
      }

      const admin = await queryOne("SELECT * FROM users WHERE role = 'admin' LIMIT 1");
      if (!admin) return ok([]);
      const lastMessage = await queryOne(
        "SELECT text, created_at FROM messages WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1) ORDER BY created_at DESC LIMIT 1",
        [Number(user.id), admin.id],
      );
      const unreadCount = Number(
        await queryValue("SELECT COUNT(*)::int AS count FROM messages WHERE sender_id = $1 AND receiver_id = $2 AND read = FALSE", [admin.id, Number(user.id)]),
      );
      return ok([
        {
          ...safeUser(admin),
          last_message: lastMessage?.text || "",
          last_message_time: lastMessage?.created_at || "",
          unread_count: unreadCount || 0,
        },
      ]);
    }

    if (slug[0] === "upload-image" && method === "POST") {
      await requireRole(request, "admin");
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) return fail("Fayl topilmadi");
      if (!file.type.startsWith("image/")) return fail("Faqat rasm fayllari ruxsat etiladi");
      const bytes = Buffer.from(await file.arrayBuffer());
      const imageUrl = `data:${file.type};base64,${bytes.toString("base64")}`;
      return ok({ image_url: imageUrl });
    }

    if (slug[0] === "statistics" && method === "GET") {
      await requireRole(request, "admin");
      const cached = cache.get("stats_all");
      if (cached) return ok(cached);
      const totalRevenue = Number(await queryValue("SELECT COALESCE(SUM(total_price), 0) AS value FROM orders WHERE status IN ('tasdiqlangan','tayyorlanmoqda','tayyor','yetkazilmoqda','yetkazildi')"));
      const result = {
        total_orders: Number(await queryValue("SELECT COUNT(*)::int AS count FROM orders")),
        pending_orders: Number(await queryValue("SELECT COUNT(*)::int AS count FROM orders WHERE status = 'kutilmoqda'")),
        approved_orders: Number(await queryValue("SELECT COUNT(*)::int AS count FROM orders WHERE status = 'tasdiqlangan'")),
        preparing_orders: Number(await queryValue("SELECT COUNT(*)::int AS count FROM orders WHERE status = 'tayyorlanmoqda'")),
        ready_orders: Number(await queryValue("SELECT COUNT(*)::int AS count FROM orders WHERE status = 'tayyor'")),
        delivering_orders: Number(await queryValue("SELECT COUNT(*)::int AS count FROM orders WHERE status = 'yetkazilmoqda'")),
        delivered_orders: Number(await queryValue("SELECT COUNT(*)::int AS count FROM orders WHERE status = 'yetkazildi'")),
        rejected_orders: Number(await queryValue("SELECT COUNT(*)::int AS count FROM orders WHERE status = 'rad_etilgan'")),
        total_dealers: Number(await queryValue("SELECT COUNT(*)::int AS count FROM users WHERE role = 'dealer'")),
        total_workers: Number(await queryValue("SELECT COUNT(*)::int AS count FROM users WHERE role = 'worker'")),
        total_materials: Number(await queryValue("SELECT COUNT(*)::int AS count FROM materials")),
        total_revenue: Number(totalRevenue.toFixed(2)),
      };
      cache.set("stats_all", result, 120);
      return ok(result);
    }

    if (slug[0] === "reports" && method === "GET" && slug.length === 1) {
      await requireRole(request, "admin");
      const cached = cache.get("reports_all");
      if (cached) return ok(cached);

      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const weeklyRevenue = Number(await queryValue("SELECT COALESCE(SUM(total_price), 0) AS value FROM orders WHERE created_at >= $1 AND status NOT IN ('rad_etilgan')", [weekAgo]));
      const monthlyRevenue = Number(await queryValue("SELECT COALESCE(SUM(total_price), 0) AS value FROM orders WHERE created_at >= $1 AND status NOT IN ('rad_etilgan')", [monthAgo]));
      const totalRevenue = Number(await queryValue("SELECT COALESCE(SUM(total_price), 0) AS value FROM orders WHERE status NOT IN ('rad_etilgan')"));
      const weeklyOrders = Number(await queryValue("SELECT COUNT(*)::int AS count FROM orders WHERE created_at >= $1", [weekAgo]));
      const monthlyOrders = Number(await queryValue("SELECT COUNT(*)::int AS count FROM orders WHERE created_at >= $1", [monthAgo]));
      const totalOrders = Number(await queryValue("SELECT COUNT(*)::int AS count FROM orders"));

      const orderRows = await query("SELECT items FROM orders WHERE status NOT IN ('rad_etilgan') LIMIT 1000");
      const materialStats: Record<string, { name: string; total_sqm: number; total_price: number; count: number }> = {};
      for (const row of orderRows.rows) {
        const items = parseJson<any[]>(row.items) || [];
        for (const item of items) {
          const name = item.material_name || "Noma'lum";
          if (!materialStats[name]) {
            materialStats[name] = { name, total_sqm: 0, total_price: 0, count: 0 };
          }
          materialStats[name].total_sqm += Number(item.sqm || 0);
          materialStats[name].total_price += Number(item.price || 0);
          materialStats[name].count += 1;
        }
      }
      const topMaterials = Object.values(materialStats)
        .sort((a, b) => b.total_price - a.total_price)
        .slice(0, 5);

      const dealerRows = await query(`
        SELECT u.name, COUNT(o.id)::int AS order_count, COALESCE(SUM(o.total_price), 0) AS revenue
        FROM orders o
        JOIN users u ON o.dealer_id = u.id
        WHERE o.status NOT IN ('rad_etilgan')
        GROUP BY u.name
        ORDER BY revenue DESC
        LIMIT 5
      `);

      const topDealers = dealerRows.rows.map((row) => ({
        name: row.name,
        orders: Number(row.order_count || 0),
        revenue: Number(Number(row.revenue || 0).toFixed(2)),
      }));

      const daily = [];
      for (let dayOffset = 6; dayOffset >= 0; dayOffset -= 1) {
        const day = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000);
        const dayStart = new Date(day);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(day);
        dayEnd.setHours(23, 59, 59, 999);
        const count = Number(await queryValue("SELECT COUNT(*)::int AS count FROM orders WHERE created_at >= $1 AND created_at <= $2", [dayStart.toISOString(), dayEnd.toISOString()]));
        const revenue = Number(await queryValue("SELECT COALESCE(SUM(total_price), 0) AS value FROM orders WHERE created_at >= $1 AND created_at <= $2 AND status NOT IN ('rad_etilgan')", [dayStart.toISOString(), dayEnd.toISOString()]));
        daily.push({
          day: `${String(day.getDate()).padStart(2, "0")}.${String(day.getMonth() + 1).padStart(2, "0")}`,
          orders: count,
          revenue: Number(revenue.toFixed(2)),
        });
      }

      const result = {
        weekly_revenue: Number(weeklyRevenue.toFixed(2)),
        monthly_revenue: Number(monthlyRevenue.toFixed(2)),
        total_revenue: Number(totalRevenue.toFixed(2)),
        weekly_orders: weeklyOrders,
        monthly_orders: monthlyOrders,
        total_orders: totalOrders,
        top_materials: topMaterials,
        top_dealers: topDealers,
        daily,
      };

      cache.set("reports_all", result, 60);
      return ok(result);
    }

    if (slug[0] === "alerts" && slug[1] === "low-stock" && method === "GET") {
      await requireRole(request, "admin");
      const cached = cache.get("alerts_low_stock");
      if (cached) return ok(cached);
      const rows = await query("SELECT * FROM materials WHERE stock_quantity < 10 ORDER BY stock_quantity ASC");
      const data = rows.rows.map(safeMaterial);
      cache.set("alerts_low_stock", data, 60);
      return ok(data);
    }

    if (slug[0] === "reports" && slug[1] === "export-orders" && method === "GET") {
      await requireRole(request, "admin");
      const rows = await query("SELECT * FROM orders ORDER BY created_at DESC LIMIT 500");
      const buffer = buildOrdersWorkbook(rows.rows.map(safeOrder));
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename=orders_${new Date().toISOString().slice(0, 10)}.xlsx`,
        },
      });
    }

    return fail("Endpoint topilmadi", 404);
  } catch (error: any) {
    const message = String(error?.message || error || "Server xatoligi");
    if (message === "Not authenticated" || message === "Invalid token") {
      return fail("Not authenticated", 401);
    }
    if (message === "Forbidden") {
      return fail("Forbidden", 403);
    }
    return fail(message, 400);
  }
}

export async function GET(request: NextRequest, context: { params: Promise<{ slug?: string[] }> }) {
  const { slug = [] } = await context.params;
  return routeRequest(request, slug);
}

export async function POST(request: NextRequest, context: { params: Promise<{ slug?: string[] }> }) {
  const { slug = [] } = await context.params;
  return routeRequest(request, slug);
}

export async function PUT(request: NextRequest, context: { params: Promise<{ slug?: string[] }> }) {
  const { slug = [] } = await context.params;
  return routeRequest(request, slug);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ slug?: string[] }> }) {
  const { slug = [] } = await context.params;
  return routeRequest(request, slug);
}
