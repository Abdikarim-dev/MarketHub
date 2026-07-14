import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product } from "@/types/api";

interface WishlistState {
  items: Product[];
  toggle: (product: Product) => void;
  has: (productId: number) => boolean;
  remove: (productId: number) => void;
  clear: () => void;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      toggle: (product) => {
        const exists = get().items.some((p) => p.id === product.id);
        set({
          items: exists
            ? get().items.filter((p) => p.id !== product.id)
            : [...get().items, product],
        });
      },
      has: (productId) => get().items.some((p) => p.id === productId),
      remove: (productId) =>
        set({ items: get().items.filter((p) => p.id !== productId) }),
      clear: () => set({ items: [] }),
    }),
    { name: "mh-wishlist" },
  ),
);
