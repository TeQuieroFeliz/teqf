'use client';
import { LoginFormSchema, LoginFormType } from '@/lib/schemas/AuthFormSchema';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
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
import { useAuthContext } from '@/context/AuthContext';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

function LoginForm() {
  const auth = useAuthContext();
  const router = useRouter();
  const form = useForm<LoginFormType>({
    resolver: zodResolver(LoginFormSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const formSubmit = async (formData: LoginFormType) => {
    try {
      await auth.signInWithEmail(formData.email, formData.password);
      router.refresh();
    } catch (error: any) {
      toast.error('Error!', {
        description:
          error.code === 'auth/invalid-credential'
            ? 'Incorrect credentials'
            : 'An error occurred',
      });
    }
  };

  return (
    <Card className="max-w-sm mx-auto">
      <CardHeader>
        <CardTitle className="font-semibold text-center text-2xl">
          Login Form
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(formSubmit)}>
            <fieldset
              disabled={form.formState.isSubmitting}
              className="space-y-2 flex flex-col"
            >
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
              <Button type="submit" className="w-full">
                Submit
              </Button>
            </fieldset>
          </form>
        </Form>
        <Button asChild variant={'link'} size={'sm'}>
          <Link href="/forgot-password">Forgot Password?</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default LoginForm;
