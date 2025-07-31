'use client';
import {
  RegisterFormSchema,
  RegisterFormType,
} from '@/lib/schemas/AuthFormSchema';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../ui/form';
import { Input } from '../ui/input';
import { registerUser } from '@/actions/auth/register-user';
import { useAuthContext } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

function RegisterForm() {
  const auth = useAuthContext();
  const router = useRouter();
  const form = useForm<RegisterFormType>({
    resolver: zodResolver(RegisterFormSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const formSubmit = async (formData: RegisterFormType) => {
    try {
      const res = await registerUser(formData);
      if (res?.error) {
        toast.error('Error!', {
          description: res.message,
        });
        return;
      }
      toast.success('Registered!', {
        description: `${formData.name} registered successfully`,
      });
      await auth.signInWithEmail(formData.email, formData.password);
      router.refresh();
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <Card className="max-w-sm mx-auto">
      <CardHeader>
        <CardTitle className="font-semibold text-center text-2xl">
          Registeration Form
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(formSubmit)}>
            <fieldset
              disabled={form.formState.isSubmitting}
              className="space-y-3 flex flex-col"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} type="text" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input {...field} type="password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ConfirmPassword</FormLabel>
                    <FormControl>
                      <Input {...field} type="password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full">
                Submit
              </Button>
            </fieldset>
          </form>
        </Form>
      </CardContent>
      <Button asChild variant="link">
        <Link href="/login">Already have an account?</Link>
      </Button>
    </Card>
  );
}

export default RegisterForm;
