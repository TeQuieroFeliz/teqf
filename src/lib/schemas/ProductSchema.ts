import { z } from 'zod';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const HEX_COLOR_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

export const productSchema = (isEdit = false) =>
  z.object({
    name: z.string().min(1, 'Product name is required'),
    category: z.string().min(1, 'Category is required'),
    type: z.string().optional(),
    size: z.string().optional(),
    note: z.string().optional(),
    image: z
      .any()
      .refine((file) => isEdit || file instanceof File, {
        error: 'Image is required',
      })
      .refine(
        (file) =>
          (isEdit && typeof file === 'string') ||
          (file instanceof File && file.size <= MAX_FILE_SIZE),
        {
          error: 'Image must be less than 2MB',
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
  image: z.string().min(1, 'Image is required'),
});

export type ProductType = {
  id: string;
  name: string;
  image: string;
  categoryId: string;
  categoryName: string;
  colors: { name: string; code: string }[];
  type?: string;
  size?: string;
  note?: string;
};
