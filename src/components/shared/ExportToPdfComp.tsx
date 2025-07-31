'use client';

import { editEventt } from '@/actions/event/event-crud';
import { useAuthContext } from '@/context/AuthContext';
import { Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import SendEmailComp from './SendEmailComp';
import { usePathname } from 'next/navigation';

function ExportToPdfComp({ event, subEvents }: any) {
  const [text, setText] = useState('');
  const auth = useAuthContext();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);
  const isAdminPath = pathname.includes('admin');


  const handleExportPDF = async ({ event, subEvents }: any) => {
    try {
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ event, subEvents }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      // Download the PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${event.title}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export PDF. Please try again.');
    }
  };

  useEffect(() => {
    if (event) {
      setText(event.title);
    }
  }, [event]);

  useEffect(() => {
    if (text.trim().length) {
      const timeout = setTimeout(async () => {
        const token = await auth.currentUser!.getIdToken();
        await editEventt(event.id, { title: text }, token);
      }, 1000);

      return () => {
        clearTimeout(timeout);
      };
    }
  }, [text, event.id, auth.currentUser]);
  return (
    <div className="flex md:flex-row flex-col items-center justify-between gap-2 mb-5">
      {auth.currentUser?.uid === event.userId ? (
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="font-bold text-lg md:text-4xl max-w-lg p-2 border rounded-lg"
        />
      ) : (
        <h1 className="font-bold text-lg md:text-4xl">{event.title}</h1>
      )}

      {!!subEvents.length && (
        <div className="flex items-center justify-center gap-2">
          {auth.currentUser?.uid === event.userId && !isAdminPath && (
            <SendEmailComp event={event} subEvents={subEvents} />
          )}

          <Button
            disabled={isLoading}
            type="button"
            onClick={async () => {
              try {
                setIsLoading(true);
                await handleExportPDF({ event, subEvents });
              } catch (error) {
                console.log(error);
              } finally {
                setIsLoading(false);
              }
            }}
          >
            <Upload />
            {isLoading ? 'Exporting...' : 'Export to PDF'}
          </Button>
        </div>
      )}
    </div>
  );
}

export default ExportToPdfComp;
