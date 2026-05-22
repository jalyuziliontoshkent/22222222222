import { hashPassword, verifyPassword } from "@/server/auth";
import { query, queryOne, queryValue } from "@/server/db";

declare global {
  // eslint-disable-next-line no-var
  var __curtainBootstrap: Promise<void> | undefined;
}

function nowIso() {
  return new Date().toISOString();
}

async function createTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL DEFAULT '',
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'dealer',
      phone TEXT DEFAULT '',
      address TEXT DEFAULT '',
      credit_limit FLOAT DEFAULT 0,
      debt FLOAT DEFAULT 0,
      specialty TEXT DEFAULT '',
      created_at TEXT DEFAULT ''
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      image_url TEXT DEFAULT '',
      created_at TEXT DEFAULT ''
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS materials (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT '',
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      price_per_sqm FLOAT NOT NULL DEFAULT 0,
      stock_quantity FLOAT NOT NULL DEFAULT 0,
      unit TEXT DEFAULT 'kv.m',
      description TEXT DEFAULT '',
      image_url TEXT DEFAULT '',
      created_at TEXT DEFAULT ''
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      order_code TEXT DEFAULT '',
      dealer_id INTEGER REFERENCES users(id),
      dealer_name TEXT DEFAULT '',
      items TEXT DEFAULT '[]',
      total_sqm FLOAT DEFAULT 0,
      total_price FLOAT DEFAULT 0,
      status TEXT DEFAULT 'kutilmoqda',
      notes TEXT DEFAULT '',
      rejection_reason TEXT DEFAULT '',
      delivery_info TEXT,
      created_at TEXT DEFAULT '',
      updated_at TEXT DEFAULT ''
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      sender_id INTEGER REFERENCES users(id),
      sender_name TEXT DEFAULT '',
      sender_role TEXT DEFAULT '',
      receiver_id INTEGER REFERENCES users(id),
      text TEXT DEFAULT '',
      read BOOLEAN DEFAULT FALSE,
      created_at TEXT DEFAULT ''
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      dealer_id INTEGER REFERENCES users(id),
      amount FLOAT NOT NULL DEFAULT 0,
      note TEXT DEFAULT '',
      created_at TEXT DEFAULT ''
    )
  `);

  const migrations = [
    "ALTER TABLE materials ADD COLUMN IF NOT EXISTS stock_quantity FLOAT DEFAULT 0",
    "ALTER TABLE materials ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'kv.m'",
    "ALTER TABLE materials ADD COLUMN IF NOT EXISTS description TEXT DEFAULT ''",
    "ALTER TABLE materials ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT ''",
    "ALTER TABLE materials ADD COLUMN IF NOT EXISTS created_at TEXT DEFAULT ''",
    "ALTER TABLE materials ADD COLUMN IF NOT EXISTS category TEXT DEFAULT ''",
    "ALTER TABLE materials ADD COLUMN IF NOT EXISTS price_per_sqm FLOAT DEFAULT 0",
    "ALTER TABLE materials ADD COLUMN IF NOT EXISTS name TEXT DEFAULT ''",
    "ALTER TABLE materials ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS credit_limit FLOAT DEFAULT 0",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS debt FLOAT DEFAULT 0",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS specialty TEXT DEFAULT ''",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT DEFAULT ''",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT ''",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT DEFAULT ''",
    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_code TEXT DEFAULT ''",
    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_sqm FLOAT DEFAULT 0",
    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS rejection_reason TEXT DEFAULT ''",
    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_info TEXT",
    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TEXT DEFAULT ''",
    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS dealer_name TEXT DEFAULT ''",
    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT ''",
  ];

  for (const statement of migrations) {
    try {
      await query(statement);
    } catch {
      // ignore idempotent migration errors
    }
  }

  const indexes = [
    "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)",
    "CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)",
    "CREATE INDEX IF NOT EXISTS idx_orders_dealer_id ON orders(dealer_id)",
    "CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)",
    "CREATE INDEX IF NOT EXISTS idx_materials_category_id ON materials(category_id)",
    "CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver ON messages(sender_id, receiver_id)",
    "CREATE INDEX IF NOT EXISTS idx_payments_dealer_id ON payments(dealer_id)",
  ];

  for (const statement of indexes) {
    try {
      await query(statement);
    } catch {
      // ignore
    }
  }
}

async function seedData() {
  const email = process.env.ADMIN_EMAIL || "admin@curtain.uz";
  const password = process.env.ADMIN_PASSWORD || "admin123";
  const now = nowIso();

  const existingAdmin = await queryOne("SELECT * FROM users WHERE email = $1", [email]);
  if (!existingAdmin) {
    await query(
      "INSERT INTO users (name, email, password_hash, role, phone, address, credit_limit, debt, specialty, created_at) VALUES ($1,$2,$3,$4,'','',0,0,'',$5)",
      ["Admin", email, hashPassword(password), "admin", now],
    );
  } else if (!verifyPassword(password, existingAdmin.password_hash)) {
    await query("UPDATE users SET password_hash = $1 WHERE email = $2", [
      hashPassword(password),
      email,
    ]);
  }

  const categoryCount = Number(await queryValue("SELECT COUNT(*)::int AS count FROM categories"));
  if (!categoryCount) {
    for (const item of [
      ["Parda", "Har xil parda turlari"],
      ["Jalyuzi", "Gorizontal va vertikal jalyuzilar"],
      ["Aksessuar", "Karniz, gardina va boshqa aksessuarlar"],
    ]) {
      await query(
        "INSERT INTO categories (name, description, created_at) VALUES ($1, $2, $3)",
        [item[0], item[1], now],
      );
    }
  }

  const materialCount = Number(await queryValue("SELECT COUNT(*)::int AS count FROM materials"));
  if (!materialCount) {
    const pardaId = await queryValue("SELECT id FROM categories WHERE name = 'Parda'");
    const jalyuziId = await queryValue("SELECT id FROM categories WHERE name = 'Jalyuzi'");

    const materials = [
      ["Blackout Parda", "Parda", pardaId, 7.0, 500, "kv.m", "Yorug'lik o'tkazmaydigan parda", "https://images.pexels.com/photos/4814070/pexels-photo-4814070.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"],
      ["Tull Parda", "Parda", pardaId, 3.5, 800, "kv.m", "Shaffof tull parda", "https://images.unsplash.com/photo-1574197635162-68e4b468e4e9?w=600"],
      ["Roller Jalyuzi", "Jalyuzi", jalyuziId, 10.0, 300, "kv.m", "Zamonaviy roller jalyuzi", "https://images.pexels.com/photos/19166538/pexels-photo-19166538.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"],
      ["Gorizontal Jalyuzi", "Jalyuzi", jalyuziId, 8.0, 400, "kv.m", "Alyuminiy gorizontal jalyuzi", "https://images.unsplash.com/photo-1603299938527-d035bc6fc2c8?w=600"],
      ["Vertikal Jalyuzi", "Jalyuzi", jalyuziId, 6.0, 350, "kv.m", "Ofis uchun vertikal jalyuzi", "https://images.pexels.com/photos/8955198/pexels-photo-8955198.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"],
      ["Rimskaya Parda", "Parda", pardaId, 9.0, 200, "kv.m", "Premium rimskaya parda", "https://images.unsplash.com/photo-1729277980958-092c5e9e2ea4?w=600"],
    ];

    for (const item of materials) {
      await query(
        "INSERT INTO materials (name, category, category_id, price_per_sqm, stock_quantity, unit, description, image_url, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)",
        [...item, now],
      );
    }
  }

  const dealer = await queryOne("SELECT id FROM users WHERE email = 'dealer@test.uz'");
  if (!dealer) {
    await query(
      "INSERT INTO users (name, email, password_hash, role, phone, address, credit_limit, debt, specialty, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,0,'',$8)",
      [
        "Test Diler",
        "dealer@test.uz",
        hashPassword("dealer123"),
        "dealer",
        "+998901234567",
        "Toshkent, Yunusobod",
        5000,
        now,
      ],
    );
  }

  const worker = await queryOne("SELECT id FROM users WHERE email = 'worker@test.uz'");
  if (!worker) {
    await query(
      "INSERT INTO users (name, email, password_hash, role, phone, address, credit_limit, debt, specialty, created_at) VALUES ($1,$2,$3,$4,$5,'',$6,0,$7,$8)",
      [
        "Aziz Ishchi",
        "worker@test.uz",
        hashPassword("worker123"),
        "worker",
        "+998901112233",
        0,
        "Jalyuzi o'rnatish",
        now,
      ],
    );
  }
}

export async function ensureDatabase() {
  if (!global.__curtainBootstrap) {
    global.__curtainBootstrap = (async () => {
      await createTables();
      await seedData();
    })();
  }
  return global.__curtainBootstrap;
}
