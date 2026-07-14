export type UserRole = "CUSTOMER" | "SELLER" | "ADMIN";

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginResponse extends AuthTokens {
  user: User;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  product_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: number;
  seller: number;
  seller_username: string;
  category: number;
  category_name: string;
  name: string;
  description: string;
  price: string;
  stock: number;
  image: string | null;
  is_active: boolean;
  in_stock: boolean;
  created_at: string;
  updated_at: string;
}

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";

export interface OrderItem {
  id: number;
  product: number;
  product_name: string;
  quantity: number;
  price: string;
  subtotal: string;
}

export interface Order {
  id: number;
  customer: number;
  customer_username: string;
  status: OrderStatus;
  total_price: string;
  is_paid: boolean;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: number;
  user: number;
  user_username: string;
  product: number;
  rating: number;
  comment: string;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: number;
  order: number;
  amount: string;
  currency: string;
  status: "PENDING" | "SUCCESS" | "FAILED";
  transaction_id: string;
  created_at: string;
  updated_at: string;
}

export interface InventoryTransaction {
  id: number;
  product: number;
  product_name: string;
  transaction_type: "STOCK_IN" | "SALE" | "RETURN" | "DAMAGE";
  quantity: number;
  note: string;
  created_by: number | null;
  created_at: string;
}

export interface ApiErrorBody {
  error?: {
    type?: string;
    status_code?: number;
    detail?: unknown;
  };
  detail?: string;
}
