"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { apiRequest } from "@/lib/api-client";
import { formatMoney } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";

export default function AdminInventoryPage() {
  const currency = useAppStore((state) => state.currency);
  const exchangeRate = useAppStore((state) => state.exchangeRate);
  const [categories, setCategories] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [categoryForm, setCategoryForm] = useState({ id: "", name: "", description: "" });
  const [materialForm, setMaterialForm] = useState({
    id: "",
    name: "",
    price_per_sqm: "",
    stock_quantity: "",
    description: "",
    image_url: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);

  function loadData() {
    Promise.all([apiRequest("/categories"), apiRequest("/materials")]).then(([cats, mats]) => {
      setCategories(cats);
      setMaterials(mats);
    });
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredMaterials = useMemo(() => {
    return materials.filter((item) => {
      const matchesCategory = selectedCategory === "all" || item.category_id === selectedCategory;
      const matchesSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [materials, selectedCategory, search]);

  async function saveCategory() {
    if (!categoryForm.name.trim()) return;
    if (categoryForm.id) {
      await apiRequest(`/categories/${categoryForm.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: categoryForm.name,
          description: categoryForm.description,
        }),
      });
    } else {
      await apiRequest("/categories", {
        method: "POST",
        body: JSON.stringify({
          name: categoryForm.name,
          description: categoryForm.description,
        }),
      });
    }
    setCategoryForm({ id: "", name: "", description: "" });
    loadData();
  }

  async function deleteCategory(id: string) {
    await apiRequest(`/categories/${id}`, { method: "DELETE" });
    if (selectedCategory === id) setSelectedCategory("all");
    loadData();
  }

  async function uploadImage() {
    if (!imageFile) return materialForm.image_url;
    const formData = new FormData();
    formData.append("file", imageFile);
    const result = await apiRequest<{ image_url: string }>("/upload-image", {
      method: "POST",
      body: formData,
    });
    return result.image_url;
  }

  async function saveMaterial() {
    if (!materialForm.name.trim() || selectedCategory === "all") return;
    const imageUrl = await uploadImage();
    const payload = {
      name: materialForm.name,
      category_id: selectedCategory,
      category: categories.find((item) => item.id === selectedCategory)?.name || "",
      price_per_sqm: Number(materialForm.price_per_sqm || 0),
      stock_quantity: Number(materialForm.stock_quantity || 0),
      description: materialForm.description,
      image_url: imageUrl || materialForm.image_url,
      unit: "kv.m",
    };
    if (materialForm.id) {
      await apiRequest(`/materials/${materialForm.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    } else {
      await apiRequest("/materials", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    }
    setMaterialForm({
      id: "",
      name: "",
      price_per_sqm: "",
      stock_quantity: "",
      description: "",
      image_url: "",
    });
    setImageFile(null);
    loadData();
  }

  return (
    <AppShell
      role="admin"
      title="Ombor va katalog"
      subtitle="Kategoriya va mahsulotlarni web paneldan boshqaring."
    >
      <div className="two-col">
        <div className="card">
          <h3 className="section-title">Kategoriya formasi</h3>
          <div className="grid">
            <input
              className="field"
              placeholder="Kategoriya nomi"
              value={categoryForm.name}
              onChange={(event) => setCategoryForm((state) => ({ ...state, name: event.target.value }))}
            />
            <textarea
              className="textarea"
              placeholder="Tavsif"
              value={categoryForm.description}
              onChange={(event) => setCategoryForm((state) => ({ ...state, description: event.target.value }))}
            />
            <div className="inline-actions">
              <button className="button" type="button" onClick={saveCategory}>
                {categoryForm.id ? "Yangilash" : "Kategoriya qo'shish"}
              </button>
              {categoryForm.id ? (
                <button
                  className="button-ghost"
                  type="button"
                  onClick={() => setCategoryForm({ id: "", name: "", description: "" })}
                >
                  Bekor qilish
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="section-title">Mahsulot formasi</h3>
          <div className="grid">
            <select
              className="select"
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
            >
              <option value="all">Avval kategoriyani tanlang</option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <input
              className="field"
              placeholder="Mahsulot nomi"
              value={materialForm.name}
              onChange={(event) => setMaterialForm((state) => ({ ...state, name: event.target.value }))}
            />
            <div className="two-col">
              <input
                className="field"
                placeholder="Narx / kv.m"
                value={materialForm.price_per_sqm}
                onChange={(event) => setMaterialForm((state) => ({ ...state, price_per_sqm: event.target.value }))}
              />
              <input
                className="field"
                placeholder="Qoldiq"
                value={materialForm.stock_quantity}
                onChange={(event) => setMaterialForm((state) => ({ ...state, stock_quantity: event.target.value }))}
              />
            </div>
            <input
              className="field"
              type="file"
              accept="image/*"
              onChange={(event) => setImageFile(event.target.files?.[0] || null)}
            />
            <textarea
              className="textarea"
              placeholder="Tavsif"
              value={materialForm.description}
              onChange={(event) => setMaterialForm((state) => ({ ...state, description: event.target.value }))}
            />
            <button className="button" type="button" onClick={saveMaterial} disabled={selectedCategory === "all"}>
              {materialForm.id ? "Yangilash" : "Mahsulot qo'shish"}
            </button>
          </div>
        </div>
      </div>

      <div className="toolbar" style={{ marginTop: 16 }}>
        <input
          className="field"
          style={{ maxWidth: 320 }}
          placeholder="Mahsulot qidirish"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        {categories.map((item) => (
          <button
            key={item.id}
            type="button"
            className={selectedCategory === item.id ? "button" : "button-ghost"}
            onClick={() => setSelectedCategory(item.id)}
          >
            {item.name}
          </button>
        ))}
        <button
          type="button"
          className={selectedCategory === "all" ? "button-secondary" : "button-ghost"}
          onClick={() => setSelectedCategory("all")}
        >
          Barchasi
        </button>
      </div>

      <div className="two-col">
        <div className="card">
          <h3 className="section-title">Kategoriyalar</h3>
          <div className="list-stack">
            {categories.map((item) => (
              <div key={item.id} className="dealer-card">
                <div className="split-row">
                  <div>
                    <strong>{item.name}</strong>
                    <div className="muted">{item.material_count || 0} mahsulot</div>
                  </div>
                  <div className="inline-actions">
                    <button className="button-ghost" type="button" onClick={() => setCategoryForm(item)}>
                      Tahrirlash
                    </button>
                    <button className="button-danger" type="button" onClick={() => deleteCategory(item.id)}>
                      O'chirish
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="section-title">Mahsulotlar</h3>
          <div className="list-stack">
            {filteredMaterials.map((item) => (
              <div key={item.id} className="material-card">
                <div className="split-row">
                  <div className="list-row">
                    {item.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.image_url}
                        alt={item.name}
                        style={{ width: 64, height: 64, borderRadius: 18, objectFit: "cover" }}
                      />
                    ) : (
                      <div className="avatar">M</div>
                    )}
                    <div>
                      <strong>{item.name}</strong>
                      <div className="muted">{item.category_name || item.category}</div>
                      <div className="muted">
                        {formatMoney(item.price_per_sqm, currency, exchangeRate)} · {item.stock_quantity} kv.m
                      </div>
                    </div>
                  </div>
                  <div className="inline-actions">
                    <button
                      className="button-ghost"
                      type="button"
                      onClick={() =>
                        setMaterialForm({
                          id: item.id,
                          name: item.name,
                          price_per_sqm: String(item.price_per_sqm),
                          stock_quantity: String(item.stock_quantity),
                          description: item.description || "",
                          image_url: item.image_url || "",
                        })
                      }
                    >
                      Tahrirlash
                    </button>
                    <button className="button-danger" type="button" onClick={() => apiRequest(`/materials/${item.id}`, { method: "DELETE" }).then(loadData)}>
                      O'chirish
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
