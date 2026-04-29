'use client';

import { sendEventSummaryEmail } from '@/lib/sendEmail';
import { Button } from '../ui/button';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { Send } from 'lucide-react';

function SendEmailComp({ event, subEvents }: any) {
  const [isPending, startTransition] = useTransition();
  return (
    <div className="text-center">
      <Button
        disabled={isPending}
        type="button"
        className="bg-emerald-500 hover:bg-emerald-600 text-white mx-auto"
        onClick={() => {
          startTransition(async () => {
            const res = await sendEventSummaryEmail({ event, subEvents });
            if (!res.success) {
              toast.error(res.message);
              return;
            }
            toast.success(res.message);
          });
        }}
      >
        <Send />
        {isPending ? 'Submitting...' : 'Submit'}
      </Button>
    </div>
  );
}

export default SendEmailComp;
