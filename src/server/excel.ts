import * as XLSX from "xlsx";

export function buildOrdersWorkbook(orders: any[]) {
  const rows: Array<Record<string, any>> = [];
  let counter = 0;

  for (const order of orders) {
    const items = Array.isArray(order.items) ? order.items : JSON.parse(order.items || "[]");
    for (const item of items) {
      counter += 1;
      rows.push({
        "#": counter,
        "Buyurtma ID": order.order_code,
        Diler: order.dealer_name,
        Mahsulot: item.material_name,
        "Eni (m)": item.width,
        "Bo'yi (m)": item.height,
        Soni: item.quantity || 1,
        "Haqiqiy m2": item.raw_area ?? item.sqm,
        "Hisob m2": item.sqm,
        "Narx/m2": item.price_per_sqm,
        "Jami narx ($)": item.price,
        Status: order.status,
        Sana: String(order.created_at || "").slice(0, 16).replace("T", " "),
      });
    }
  }

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Buyurtmalar");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}
