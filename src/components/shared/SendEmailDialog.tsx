'use client';

import * as React from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { X, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { sendEventSummaryEmail } from '@/lib/sendEmail';
import { cn } from '@/lib/utils';
import ReactQuill from './ReacQuill';

const formSchema = z.object({
  from: z.email({ message: 'A valid "from" email is required.' }),
  to: z
    .array(z.email({ message: 'Please enter valid email addresses.' }))
    .min(1, { message: 'At least one recipient is required.' }),
  //   description: z
  //     .string()
  //     .min(10, { message: 'Description must be at least 10 characters.' }),
});

type EmailDialogProps = {
  event: any;
  subEvents: any;
};

export function SendEmailDialog({ event, subEvents }: EmailDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = React.useState(false);
  const [currentTo, setCurrentTo] = React.useState('');

  const form: any = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      from: process.env.NEXT_PUBLIC_COMPANY_EMAIL ?? '',
      to: [],
      //   description: '',
    },
  });

  const {
    control,
    formState: { errors },
    handleSubmit,
    watch,
    reset,
  } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'to',
  });

  const toEmails = watch('to') || [];

  const handleAddEmail = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const email = currentTo.trim();
      if (email) {
        if (z.string().email().safeParse(email).success) {
          if (!toEmails.includes(email)) {
            append(email);
          }
          setCurrentTo('');
        } else {
          toast.error(`"${email}" is not a valid email address.`);
        }
      }
    }
  };

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    let success: boolean = true;
    startTransition(async () => {
      try {
        await Promise.all(
          data.to.map(async (sendTo) => {
            const res = await sendEventSummaryEmail({
              to: sendTo,
              event,
              subEvents,
            });
            if (!res.success) {
              toast.error(res.message);
              success = false;
            }
          })
        );

        //   const res = await sendEventSummaryEmail({ to:'', event, subEvents });
        //   if (!res.success) {
        //     toast.error(res.message);
        //     return;
        //   }
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        success && toast.success('Event summary emails sent successfully.');
        reset();
        setOpen(false);
      } catch (error) {
        console.log(error);
        toast.error('An unexpected error occurred while sending the email.');
      }
    });
  };

  const quillModules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link'],
      ['clean'],
    ],
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Send className="mr-2 h-4 w-4" />
          Send Summary
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Send Event Summary</DialogTitle>
          <DialogDescription>
            Compose an email to send the event summary to recipients.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* ... Your 'From' and 'To' fields ... */}
          <div className="grid grid-cols-4 items-center gap-x-4 gap-y-2">
            <Label htmlFor="from" className="text-right">
              From
            </Label>
            <div className="col-span-3">
              <Input
                id="from"
                readOnly
                {...form.register('from')}
                placeholder="your-email@example.com"
              />
              {errors.from && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.from.message}
                </p>
              )}
            </div>

            <Label htmlFor="to" className="text-right self-start mt-2">
              To
            </Label>
            <div className="col-span-3">
              <div
                className={cn(
                  'flex flex-wrap items-center gap-2 rounded-md border border-input p-2 mb-2',
                  toEmails.length === 0 && 'hidden'
                )}
              >
                {fields.map((field, index) => (
                  <Badge key={field.id} variant="secondary">
                    {toEmails[index]}
                    <button
                      type="button"
                      className="ml-2 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      onClick={() => remove(index)}
                    >
                      <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                    </button>
                  </Badge>
                ))}
              </div>
              <Input
                id="to"
                value={currentTo}
                onChange={(e) => setCurrentTo(e.target.value)}
                onKeyDown={handleAddEmail}
                placeholder="Add recipients and press Enter or comma"
              />
              {errors.to && (
                <p className="text-sm text-red-500 mt-1">{errors.to.message}</p>
              )}
            </div>

            {/* <Label htmlFor="description" className="text-right self-start mt-2">
              Body
            </Label>
            <div className="col-span-3">
              <div className="quill-editor-container rounded-md border border-input ring-offset-background focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => (
                    <ReactQuill
                      value={field.value}
                      onChange={field.onChange}
                      modules={quillModules}
                      placeholder="Write your email body here..."
                    />
                  )}
                />
              </div>
              {errors.description && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.description.message}
                </p>
              )}
            </div> */}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              <Send className="mr-2 h-4 w-4" />
              {isPending ? 'Sending...' : 'Send Email'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
