// components/ImageCropper.tsx
'use client';

import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import type { Point, Area } from 'react-easy-crop';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import getCroppedImg from '@/lib/cropUtils';

interface ImageCropperProps {
  imageSrc: string | null;
  onCropComplete: (croppedImageFile: File) => void;
  onClose: () => void;
}

export default function ImageCropper({
  imageSrc,
  onCropComplete,
  onClose,
}: ImageCropperProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropFull = useCallback(
    (_croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const handleCrop = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    try {
      const fileName = `cropped-${Date.now()}.jpeg`;
      const croppedImageFile = await getCroppedImg(
        imageSrc,
        croppedAreaPixels,
        fileName
      );
      if (croppedImageFile) {
        onCropComplete(croppedImageFile);
      }
    } catch (e) {
      console.error('Error while cropping:', e);
    }
  };

  if (!imageSrc) return null;

  return (
    <Dialog open={!!imageSrc} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Crop Your Image</DialogTitle>
        </DialogHeader>
        <div className="relative w-full h-[50vh] bg-slate-800">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1} // Square aspect ratio. Change as needed.
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropFull}
          />
        </div>
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-4">
            <span>Zoom</span>
            <Slider
              value={[zoom]}
              min={1}
              max={3}
              step={0.1}
              onValueChange={(values) => setZoom(values[0])}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCrop}>Crop and Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
