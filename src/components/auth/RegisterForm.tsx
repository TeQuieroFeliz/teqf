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
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth, db } from '@/firebase/client';
import { Separator } from '../ui/separator';
import { FcGoogle } from 'react-icons/fc';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { handleGoogleSignIn } from '@/actions/auth/google-auth';
import { getUserById } from '@/actions/auth/get-user';

function RegisterForm() {
  const { signInWithEmail, setCurrentUser } = useAuthContext();
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
      await signInWithEmail(formData.email, formData.password);
      router.refresh();
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <Card className="max-w-sm mx-auto my-5 shadow-md rounded-2xl">
      <CardHeader>
        <CardTitle className="font-semibold text-center text-2xl">
          Registration Form
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
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} type="text" placeholder="John Doe" />
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

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
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
                Register
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

        {/* Google Sign-in */}
        <Button
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
          type="button"
        >
          <FcGoogle size={20} />
          Continue with Google
        </Button>

        {/* Login link */}
        <div className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-medium text-primary hover:underline"
          >
            Login
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default RegisterForm;
