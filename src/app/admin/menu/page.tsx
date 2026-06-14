import { getAllMenuItems } from "@/lib/availability";
import MenuManager from "@/components/admin/MenuManager";

export default async function AdminMenuPage() {
  const items = await getAllMenuItems();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl text-espresso font-semibold tracking-tight">
          Menu
        </h1>
        <p className="text-xs sm:text-sm text-mocha mt-1">
          Kelola daftar menu, harga, dan stok
        </p>
      </div>
      <MenuManager
        items={items.map((i) => ({
          id: i.id,
          name: i.name,
          price: i.price,
          section: i.section,
          stock: i.stock,
          isAvailable: i.isAvailable,
        }))}
      />
    </div>
  );
}