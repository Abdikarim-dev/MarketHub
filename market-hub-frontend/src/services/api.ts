import { api } from "@/lib/api";
import type {
  Category,
  InventoryTransaction,
  LoginResponse,
  Order,
  Paginated,
  Payment,
  Product,
  Review,
  User,
} from "@/types/api";

export const authApi = {
  register: (payload: Record<string, unknown>) =>
    api.post<User>("/auth/register/", payload).then((r) => r.data),
  login: (payload: { username: string; password: string }) =>
    api.post<LoginResponse>("/auth/login/", payload).then((r) => r.data),
  profile: () => api.get<User>("/auth/profile/").then((r) => r.data),
  updateProfile: (payload: Partial<User>) =>
    api.patch<User>("/auth/profile/", payload).then((r) => r.data),
};

export const productsApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) =>
    api.get<Paginated<Product>>("/products/", { params }).then((r) => r.data),
  get: (id: number | string) =>
    api.get<Product>(`/products/${id}/`).then((r) => r.data),
  create: (payload: FormData | Record<string, unknown>) =>
    api
      .post<Product>("/products/", payload, {
        headers:
          payload instanceof FormData
            ? { "Content-Type": "multipart/form-data" }
            : undefined,
      })
      .then((r) => r.data),
  update: (id: number, payload: FormData | Record<string, unknown>) =>
    api
      .patch<Product>(`/products/${id}/`, payload, {
        headers:
          payload instanceof FormData
            ? { "Content-Type": "multipart/form-data" }
            : undefined,
      })
      .then((r) => r.data),
  remove: (id: number) => api.delete(`/products/${id}/`),
};

export const categoriesApi = {
  list: (params?: Record<string, string | number | undefined>) =>
    api.get<Paginated<Category>>("/categories/", { params }).then((r) => r.data),
  create: (payload: Partial<Category>) =>
    api.post<Category>("/categories/", payload).then((r) => r.data),
};

export const ordersApi = {
  list: (params?: Record<string, string | number | undefined>) =>
    api.get<Paginated<Order>>("/orders/", { params }).then((r) => r.data),
  get: (id: number | string) =>
    api.get<Order>(`/orders/${id}/`).then((r) => r.data),
  create: (items: { product: number; quantity: number }[]) =>
    api.post<Order>("/orders/", { items }).then((r) => r.data),
  setStatus: (id: number, status: string) =>
    api.patch<Order>(`/orders/${id}/status/`, { status }).then((r) => r.data),
};

export const paymentsApi = {
  createIntent: (order: number) =>
    api
      .post<{ client_secret: string; payment: Payment }>(
        "/payments/create-intent/",
        { order },
      )
      .then((r) => r.data),
  list: () => api.get<Paginated<Payment>>("/payments/").then((r) => r.data),
};

export const reviewsApi = {
  list: (params?: Record<string, string | number | undefined>) =>
    api.get<Paginated<Review>>("/reviews/", { params }).then((r) => r.data),
  create: (payload: { product: number; rating: number; comment?: string }) =>
    api.post<Review>("/reviews/", payload).then((r) => r.data),
};

export const inventoryApi = {
  list: (params?: Record<string, string | number | undefined>) =>
    api
      .get<Paginated<InventoryTransaction>>("/inventory/", { params })
      .then((r) => r.data),
  create: (payload: {
    product: number;
    transaction_type: string;
    quantity: number;
    note?: string;
  }) =>
    api.post<InventoryTransaction>("/inventory/", payload).then((r) => r.data),
};
