export type UserRole = "admin" | "dealer" | "worker";

export type ThemeMode = "dark" | "light";
export type CurrencyMode = "USD" | "UZS";

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  address?: string;
  specialty?: string;
  credit_limit?: number;
  debt?: number;
  created_at?: string;
};

export type Category = {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  material_count?: number;
  created_at?: string;
};

export type Material = {
  id: string;
  name: string;
  category?: string;
  category_id?: string;
  category_name?: string;
  price_per_sqm: number;
  stock_quantity: number;
  unit?: string;
  description?: string;
  image_url?: string;
  created_at?: string;
};

export type DeliveryInfo = {
  driver_name: string;
  driver_phone: string;
  plate_number?: string;
};

export type OrderItem = {
  material_id: string;
  material_name: string;
  width: number;
  height: number;
  quantity: number;
  raw_area?: number;
  sqm: number;
  price_per_sqm: number;
  price: number;
  notes?: string;
  assigned_worker_id?: string;
  assigned_worker_name?: string;
  worker_status?: "pending" | "assigned" | "completed";
};

export type Order = {
  id: string;
  order_code: string;
  dealer_id: string;
  dealer_name: string;
  items: OrderItem[];
  total_sqm: number;
  total_price: number;
  status: string;
  notes?: string;
  rejection_reason?: string;
  delivery_info?: DeliveryInfo | null;
  created_at: string;
  updated_at?: string;
};

export type WorkerTask = {
  order_id: string;
  order_code: string;
  dealer_name: string;
  item_index: number;
  material_name: string;
  width: number;
  height: number;
  sqm: number;
  notes?: string;
  worker_status: string;
  created_at: string;
};

export type ChatPartner = {
  id: string;
  name: string;
  email?: string;
  role?: UserRole;
  last_message?: string;
  last_message_time?: string;
  unread_count?: number;
};

export type Message = {
  id: string;
  sender_id: string;
  sender_name?: string;
  sender_role?: UserRole;
  receiver_id: string;
  text: string;
  read?: boolean;
  created_at: string;
};

export type Payment = {
  id: string;
  dealer_id: string;
  amount: number;
  note?: string;
  created_at: string;
};
