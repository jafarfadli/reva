"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { MenuSection } from "@prisma/client";
import {
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
} from "@/app/actions/menu";

type MenuItemRow = {
  id: string;
  name: string;
  price: number;
  section: MenuSection;
  stock: number;
  isAvailable: boolean;
};

type Props = {
  items: MenuItemRow[];
};

const SECTIONS: { value: MenuSection; label: string }[] = [
  { value: "FOOD", label: "Makanan" },
  { value: "DRINK", label: "Minuman" },
  { value: "DESSERT", label: "Dessert" },
  { value: "SNACK", label: "Snack" },
];

const sectionLabel = (s: MenuSection) =>
  SECTIONS.find((x) => x.value === s)?.label ?? s;

const formatRupiah = (n: number) =>
  "Rp " + n.toLocaleString("id-ID");

export default function MenuManager({ items }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Group by section
  const grouped = SECTIONS.map((s) => ({
    section: s,
    items: items.filter((i) => i.section === s.value),
  })).filter((g) => g.items.length > 0 || showAddForm);

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Hapus menu "${name}"?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteMenuItem(id);
      if (!result.ok) {
        setError(result.error);
        router.refresh(); // refresh karena mungkin jadi soft-delete
      } else {
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <p className="text-sm text-mocha">
          <span className="font-semibold text-espresso">{items.length}</span> menu
          total
        </p>
        <button
          type="button"
          onClick={() => setShowAddForm((s) => !s)}
          className="px-4 py-2.5 bg-terracotta text-white rounded-md font-medium hover:bg-terracotta-dark transition shadow-sm text-sm"
        >
          {showAddForm ? "Tutup form" : "+ Tambah Menu"}
        </button>
      </div>

      {error && (
        <div className="text-sm text-clay-dark bg-clay-subtle border border-clay/30 rounded-md p-3">
          {error}
        </div>
      )}

      {showAddForm && (
        <AddMenuForm
          onDone={() => {
            setShowAddForm(false);
            router.refresh();
          }}
          onError={setError}
        />
      )}

      {grouped.map((group) => (
        <section key={group.section.value}>
          <h2 className="font-serif text-lg text-espresso font-semibold mb-2">
            {group.section.label}{" "}
            <span className="text-sm text-mocha font-normal">
              ({group.items.length})
            </span>
          </h2>
          <div className="space-y-2">
            {group.items.map((item) =>
              editingId === item.id ? (
                <EditMenuRow
                  key={item.id}
                  item={item}
                  onDone={() => {
                    setEditingId(null);
                    router.refresh();
                  }}
                  onCancel={() => setEditingId(null)}
                  onError={setError}
                />
              ) : (
                <MenuRow
                  key={item.id}
                  item={item}
                  onEdit={() => setEditingId(item.id)}
                  onDelete={() => handleDelete(item.id, item.name)}
                  isPending={isPending}
                />
              ),
            )}
          </div>
        </section>
      ))}
    </div>
  );
}

function MenuRow({
  item,
  onEdit,
  onDelete,
  isPending,
}: {
  item: MenuItemRow;
  onEdit: () => void;
  onDelete: () => void;
  isPending: boolean;
}) {
  const lowStock = item.stock <= 5;

  return (
    <div
      className={`bg-white border rounded-lg p-4 flex items-center justify-between gap-3 flex-wrap shadow-sm ${
        item.isAvailable ? "border-border-warm" : "border-border-warm opacity-60"
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-espresso">{item.name}</span>
          {!item.isAvailable && (
            <span className="text-xs px-1.5 py-0.5 bg-cream-dark text-mocha rounded">
              Tidak tersedia
            </span>
          )}
          {item.isAvailable && item.stock === 0 && (
            <span className="text-xs px-1.5 py-0.5 bg-clay-subtle text-clay-dark rounded">
              Habis
            </span>
          )}
          {item.isAvailable && item.stock > 0 && lowStock && (
            <span className="text-xs px-1.5 py-0.5 bg-caramel-subtle text-cocoa rounded">
              Stok menipis
            </span>
          )}
        </div>
        <div className="text-sm text-mocha mt-0.5">
          {formatRupiah(item.price)} · Stok: {item.stock}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onEdit}
          disabled={isPending}
          className="px-3 py-1.5 text-sm border border-border-warm text-cocoa rounded-md hover:bg-cream-dark transition font-medium disabled:opacity-50"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={isPending}
          className="px-3 py-1.5 text-sm border border-clay/30 text-clay-dark rounded-md hover:bg-clay-subtle transition font-medium disabled:opacity-50"
        >
          Hapus
        </button>
      </div>
    </div>
  );
}

function AddMenuForm({
  onDone,
  onError,
}: {
  onDone: () => void;
  onError: (e: string | null) => void;
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [section, setSection] = useState<MenuSection>("FOOD");
  const [stock, setStock] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    onError(null);
    if (!name.trim()) {
      onError("Nama menu wajib diisi.");
      return;
    }
    startTransition(async () => {
      const result = await createMenuItem({
        name,
        price: parseInt(price) || 0,
        section,
        stock: parseInt(stock) || 0,
      });
      if (result.ok) {
        onDone();
      } else {
        onError(result.error);
      }
    });
  };

  return (
    <div className="bg-cream-light border border-border-warm rounded-lg p-4 space-y-3">
      <h3 className="font-medium text-espresso text-sm">Tambah Menu Baru</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-mocha uppercase tracking-wide mb-1">
            Nama
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-border-warm rounded-md text-espresso text-sm focus:outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/20"
            placeholder="mis. Nasi Goreng Spesial"
            disabled={isPending}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-mocha uppercase tracking-wide mb-1">
            Harga (Rp)
          </label>
          <input
            type="number"
            inputMode="numeric"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-border-warm rounded-md text-espresso text-sm focus:outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/20"
            placeholder="25000"
            disabled={isPending}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-mocha uppercase tracking-wide mb-1">
            Stok
          </label>
          <input
            type="number"
            inputMode="numeric"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-border-warm rounded-md text-espresso text-sm focus:outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/20"
            placeholder="50"
            disabled={isPending}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-mocha uppercase tracking-wide mb-1">
            Section
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {SECTIONS.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setSection(s.value)}
                disabled={isPending}
                className={`px-3 py-2 text-sm rounded-md border transition font-medium ${
                  section === s.value
                    ? "border-terracotta bg-terracotta-subtle text-terracotta-dark"
                    : "border-border-warm text-cocoa hover:bg-white"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="px-4 py-2 text-sm bg-terracotta text-white rounded-md hover:bg-terracotta-dark transition font-medium disabled:opacity-50"
        >
          {isPending ? "Menyimpan..." : "Simpan Menu"}
        </button>
      </div>
    </div>
  );
}

function EditMenuRow({
  item,
  onDone,
  onCancel,
  onError,
}: {
  item: MenuItemRow;
  onDone: () => void;
  onCancel: () => void;
  onError: (e: string | null) => void;
}) {
  const [name, setName] = useState(item.name);
  const [price, setPrice] = useState(String(item.price));
  const [section, setSection] = useState<MenuSection>(item.section);
  const [stock, setStock] = useState(String(item.stock));
  const [isAvailable, setIsAvailable] = useState(item.isAvailable);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    onError(null);
    if (!name.trim()) {
      onError("Nama tidak boleh kosong.");
      return;
    }
    startTransition(async () => {
      const result = await updateMenuItem({
        id: item.id,
        name,
        price: parseInt(price) || 0,
        section,
        stock: parseInt(stock) || 0,
        isAvailable,
      });
      if (result.ok) {
        onDone();
      } else {
        onError(result.error);
      }
    });
  };

  return (
    <div className="bg-cream-light border border-terracotta/40 rounded-lg p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-mocha uppercase tracking-wide mb-1">
            Nama
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-border-warm rounded-md text-espresso text-sm focus:outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/20"
            disabled={isPending}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-mocha uppercase tracking-wide mb-1">
            Harga (Rp)
          </label>
          <input
            type="number"
            inputMode="numeric"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-border-warm rounded-md text-espresso text-sm focus:outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/20"
            disabled={isPending}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-mocha uppercase tracking-wide mb-1">
            Stok
          </label>
          <input
            type="number"
            inputMode="numeric"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-border-warm rounded-md text-espresso text-sm focus:outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/20"
            disabled={isPending}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-mocha uppercase tracking-wide mb-1">
            Section
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {SECTIONS.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setSection(s.value)}
                disabled={isPending}
                className={`px-3 py-2 text-sm rounded-md border transition font-medium ${
                  section === s.value
                    ? "border-terracotta bg-terracotta-subtle text-terracotta-dark"
                    : "border-border-warm text-cocoa hover:bg-white"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div className="sm:col-span-2">
          <label className="flex items-center gap-2 text-sm text-cocoa cursor-pointer">
            <input
              type="checkbox"
              checked={isAvailable}
              onChange={(e) => setIsAvailable(e.target.checked)}
              disabled={isPending}
              className="accent-terracotta w-4 h-4"
            />
            Menu tersedia untuk dipesan
          </label>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="px-4 py-2 text-sm border border-border-warm text-cocoa rounded-md hover:bg-white transition font-medium disabled:opacity-50"
        >
          Batal
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="px-4 py-2 text-sm bg-terracotta text-white rounded-md hover:bg-terracotta-dark transition font-medium disabled:opacity-50"
        >
          {isPending ? "Menyimpan..." : "Simpan"}
        </button>
      </div>
    </div>
  );
}