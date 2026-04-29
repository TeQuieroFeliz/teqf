'use server';

import { auth, firestore } from '@/firebase/server';
import {
  RegisterFormSchema,
  RegisterFormType,
} from '@/lib/schemas/AuthFormSchema';

export const registerUser = async (formData: RegisterFormType) => {
  const validations = RegisterFormSchema.safeParse(formData);

  if (!validations.success) {
    return { error: true, message: 'Validations Failed' };
  }

  const { name, email, password } = validations.data;

  try {
    const userRecord = await auth.createUser({
      displayName: name,
      email,
      password,
    });
    await firestore.collection('users').doc(userRecord.uid).set({
      name,
      email,
      role: 'client',
      status: 'pending',
      avatar: '',
      createdAt: new Date(),
    });
  } catch (error: any) {
    console.log(error);
    return {
      error: true,
      message: error.message || 'Something went wrong while registering user',
    };
  }
};
