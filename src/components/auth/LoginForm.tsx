'use client';
import { useAuthContext } from '@/context/AuthContext';
import { LoginFormSchema, LoginFormType } from '@/lib/schemas/AuthFormSchema';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  fetchSignInMethodsForEmail,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { FcGoogle } from 'react-icons/fc';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../ui/form';
import { Input } from '../ui/input';
import { Separator } from '../ui/separator';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '@/firebase/client';
import { handleGoogleSignIn } from '@/actions/auth/google-auth';
import { getUserById } from '@/actions/auth/get-user';

function LoginForm() {
  const { signInWithEmail, setCurrentUser } = useAuthContext();
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
      await signInWithEmail(formData.email, formData.password);
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
    <Card className="max-w-sm mx-auto my-9 shadow-md rounded-2xl">
      <CardHeader>
        <CardTitle className="font-semibold text-center text-2xl">
          Login Form
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(formSubmit)} className="space-y-4">
            <fieldset
              disabled={form.formState.isSubmitting}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="you@example.com"
                      />
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
                      <Input
                        {...field}
                        type="password"
                        placeholder="••••••••"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full">
                Sign In
              </Button>
            </fieldset>
          </form>
        </Form>

        {/* Separator */}
        <div className="relative">
          <Separator className="my-6" />
          <span className="absolute inset-x-0 -top-3 mx-auto w-fit bg-white px-2 text-sm text-muted-foreground">
            OR
          </span>
        </div>

        {/* Google Button */}
        <Button
          type="button"
          variant="outline"
          onClick={async () => {
            const { userId } = await handleGoogleSignIn();
            if (userId) {
              const { user: userFromDB } = await getUserById(userId);
              setCurrentUser(userFromDB);
              router.push('/status');
            }
            router.refresh();
          }}
          className="w-full flex items-center justify-center gap-2"
        >
          <FcGoogle size={20} />
          Continue with Google
        </Button>

        {/* Forgot password link */}
        <div className="text-center">
          <Button asChild variant="link" size="sm">
            <Link href="/forgot-password">Forgot Password?</Link>
          </Button>
        </div>

        {/* Register link */}
        <div className="text-center text-sm text-muted-foreground">
          Don’t have an account?{' '}
          <Link
            href="/register"
            className="font-medium text-primary hover:underline"
          >
            Register
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default LoginForm;
