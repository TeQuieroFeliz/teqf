import z from 'zod';

export const RegisterFormSchema = z
  .object({
    name: z.string().min(1, 'Enter your name'),
    email: z.email('Enter a valid email address'),
    password: z.string().min(5, 'Password must be above 5 characters'),
    confirmPassword: z.string().min(1, 'Enter confirm password'),
  })
  .refine((val) => val.password === val.confirmPassword, {
    message: 'Passwords must match',
    path: ['confirmPassword'],
  });

export type RegisterFormType = z.infer<typeof RegisterFormSchema>;

export const LoginFormSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(5, 'Password must be above 5 characters'),
});

export type LoginFormType = z.infer<typeof LoginFormSchema>;
