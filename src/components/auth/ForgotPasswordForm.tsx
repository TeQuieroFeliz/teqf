'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { auth } from '@/firebase/client';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useState } from 'react';

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          setIsLoading(true);
          await sendPasswordResetEmail(auth, email);
        } catch (error) {
          console.log(error);
        } finally {
          setIsLoading(false);
        }
      }}
    >
      <fieldset className="flex flex-col gap-4" disabled={isLoading}>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Button className="w-full" type="submit">
          Reset Password
        </Button>
      </fieldset>
    </form>
  );
}
