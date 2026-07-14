import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product } from "@/types/api";

export interface CartItem {
  product: Product;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: number) => void;
  setQuantity: (productId: number, quantity: number) => void;
  clear: () => void;
  totalItems: () => number;
  subtotal: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product, quantity = 1) => {
        set((state) => {
          const existing = state.items.find((i) => i.product.id === product.id);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.product.id === product.id
                  ? {
                      ...i,
                      quantity: Math.min(
                        i.quantity + quantity,
                        Math.max(product.stock, 1),
                      ),
                    }
                  : i,
              ),
            };
          }
          return {
            items: [
              ...state.items,
              { product, quantity: Math.min(quantity, Math.max(product.stock, 1)) },
            ],
          };
        });
      },
      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((i) => i.product.id !== productId),
        })),
      setQuantity: (productId, quantity) =>
        set((state) => ({
          items: state.items
            .map((i) =>
              i.product.id === productId
                ? {
                    ...i,
                    quantity: Math.max(
                      1,
                      Math.min(quantity, Math.max(i.product.stock, 1)),
                    ),
                  }
                : i,
            )
            .filter((i) => i.quantity > 0),
        })),
      clear: () => set({ items: [] }),
      totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      subtotal: () =>
        get().items.reduce(
          (sum, i) => sum + Number(i.product.price) * i.quantity,
          0,
        ),
    }),
    { name: "mh-cart" },
  ),
);
