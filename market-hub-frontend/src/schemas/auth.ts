import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z
  .object({
    username: z.string().min(3, "At least 3 characters"),
    email: z.string().email("Enter a valid email"),
    password: z.string().min(8, "At least 8 characters"),
    password_confirm: z.string().min(8),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    role: z.enum(["CUSTOMER", "SELLER"]),
  })
  .refine((data) => data.password === data.password_confirm, {
    message: "Passwords do not match",
    path: ["password_confirm"],
  });

export const productSchema = z.object({
  name: z.string().min(2, "Name is required"),
  description: z.string().optional(),
  category: z.number().min(1, "Category is required"),
  price: z.number().min(0, "Price must be 0 or more"),
  stock: z.number().int().min(0),
  is_active: z.boolean(),
});

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
export type ProductValues = z.infer<typeof productSchema>;
