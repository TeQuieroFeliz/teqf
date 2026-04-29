import { z } from 'zod';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 2MB
const MAX_IMAGES = 3;
const HEX_COLOR_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

export const productSchema = (isEdit = false) =>
  z.object({
    name: z.string().min(1, 'Product name is required'),
    category: z.string().optional(),
    location: z.string().optional(),
    type: z.string().optional(),
    size: z.string().optional(),
    note: z.string().optional(),
    estPrice: z.string().optional(),
    quantity: z.string().optional(),
    description: z.string().optional(),
    images: z
      .array(z.union([z.string(), z.instanceof(File)]))
      .min(1, 'At least one image is required')
      .max(MAX_IMAGES, `You can upload up to ${MAX_IMAGES} images`)
      .refine(
        (arr) =>
          arr.every(
            (v) =>
              typeof v === 'string' ||
              (v instanceof File && v.size <= MAX_FILE_SIZE)
          ),
        {
          message: `Each uploaded image must be less than ${MAX_FILE_SIZE / 1024 / 1024} MB`,
        }
      ),

    colors: z
      .array(
        z.object({
          name: z.string().min(1, 'Color name is required'),
          code: z
            .string()
            .min(1, 'Color code is required')
            .regex(
              HEX_COLOR_REGEX,
              'Invalid hex color code (e.g. #FFFFFF or #FFF)'
            ),
        })
      )
      .optional(),
  });
export type ProductSchemaType = z.infer<ReturnType<typeof productSchema>>;

export const productSchemaForServer = z.object({
  name: z.string().min(1, 'Product name is required'),
  category: z.string().min(1, 'Category is required'),
  images: z.array(z.string().url()).min(1, 'At least one image is required'),
});

export type ProductType = {
  id: string;
  name: string;
  images: string[];
  categoryId: string;
  categoryName: string;
  location: string;
  colors: { name: string; code: string }[];
  type?: string;
  size?: string;
  note?: string;
  estPrice?: number;
  quantity?: number;
  description?: string;
  createdAt?: string;
};
export type ProductUserSideType = {
  id: string;
  name: string;
  images: string[];
  categoryId: string;
  categoryName: string;
  location: string;
  colors: { name: string; code: string }[];
  type?: string;
  size?: string;
  note?: string;
  estPrice?: number;
  quantity?: number;
  description?: string;
  createdAt: string;
  addedByAdmin: boolean;
  userId?: string;
};
