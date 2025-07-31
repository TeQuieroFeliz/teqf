import z from 'zod';
import { timeToMinutes } from '../utils';

export const SubEventFormSchema = z
  .object({
    subEventName: z.string().min(2, 'Name must be at least 2 characters.'),
    date: z.date({ error: 'A date is required.' }),
    city: z.string().min(2, 'City is required.'),
    address: z.string().min(5, 'Address must be at least 5 characters.'),
    startTime: z.string({ error: 'Start time is required.' }),
    finishTime: z.string({ error: 'Finish time is required.' }),
    colorName: z.string().optional(),
    colorCode: z.string().optional(),
  })
  .refine(
    (data) => {
      // Ensure finish time is strictly after start time
      return timeToMinutes(data.finishTime) > timeToMinutes(data.startTime);
    },
    {
      message: 'End time must be after the start time.',
      path: ['finishTime'], // Point the error to the finishTime field
    }
  );

export type Item = {
  id: string;
  name: string;
  image: string;
  categoryId: string;
  categoryName: string;
  colors?: {
    code: string;
    name: string;
    quantity: number;
  }[];
  description?: string;
};

export type SubEventDb = {
  subEventName: string;
  date: Date; // ISO string, use `Date` if you convert it
  city: string;
  address: string;
  startTime: string; // e.g. "01:30 PM"
  finishTime: string; // e.g. "10:30 PM"
  eventId: string;
  colorCode?: string;
  colorName?: string;
  items: Item[];
};

export type SubEventDBWithId = { id: string } & SubEventDb;
