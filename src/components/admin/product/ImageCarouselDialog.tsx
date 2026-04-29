import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

function ImageCarouselDialog({
  open,
  images,
  onClose,
}: {
  open: boolean;
  images: string[];
  onClose: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const prev = () =>
    setCurrentIndex((i) => (i === 0 ? images?.length - 1 : i - 1));
  const next = () =>
    setCurrentIndex((i) => (i === images?.length - 1 ? 0 : i + 1));

  const currentSrc = (images || [])?.[currentIndex];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg w-full">
        <DialogHeader>
          <DialogTitle>Product Images</DialogTitle>
        </DialogHeader>
        <div className="relative w-full h-96 flex items-center justify-center">
          {currentSrc ? (
            <Image
              src={currentSrc}
              alt={`Image ${currentIndex + 1}`}
              fill
              sizes="100vw"
              className="object-cover rounded-md absolute"
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full text-gray-500">
              No image available
            </div>
          )}

          {/* Navigation Buttons */}
          {images?.length > 1 && (
            <>
              <div className="absolute top-1/2 -translate-y-1/2 left-2">
                <Button variant="outline" size="sm" onClick={prev}>
                  ‹
                </Button>
              </div>
              <div className="absolute top-1/2 -translate-y-1/2 right-2">
                <Button variant="outline" size="sm" onClick={next}>
                  ›
                </Button>
              </div>
            </>
          )}
        </div>
        <DialogClose asChild>
          <Button className="mt-4 w-full">Close</Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}

export default ImageCarouselDialog;
