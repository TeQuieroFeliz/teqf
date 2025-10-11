import { getUserById } from '@/actions/auth/get-user';
import { clsx, type ClassValue } from 'clsx';
import moment from 'moment';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const generateTimeSlots = (interval = 30) => {
  const slots = [];
  const day = moment();
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += interval) {
      slots.push(day.hour(hour).minute(minute).format('hh:mm A'));
    }
  }
  return slots;
};

export const timeToMinutes = (timeStr: string) => {
  const time = moment(timeStr, 'hh:mm A');
  return time.hours() * 60 + time.minutes();
};

export const isUniqueCategoryFunc = (categoryValue: string) => {
  return (
    categoryValue === 'Gazebo' ||
    categoryValue === 'Riser' ||
    categoryValue === 'Platoform'
  );
};

type Roles = 'admin' | 'client' | 'manager';

export const requireRole = async (id: string, allowed: Roles[]) => {
  const { user } = await getUserById(id);
  if (!user) {
    return { error: true, message: 'User not found' };
  }

  if (!allowed.includes(user.role)) {
    return { error: true, message: 'Unauthorized' };
  }

  return { error: false, message: 'Authorized' };
};

// NOTE:
// 1. "products" table don't has userId whereas "products-user" table has userId
