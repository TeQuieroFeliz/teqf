const MAX_SIDE = 1200;
const JPEG_QUALITY = 0.72;

export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file;

  try {
    const timeout = new Promise<File>((resolve) =>
      setTimeout(() => resolve(file), 8000)
    );

    const compress = new Promise<File>((resolve) => {
      const img = new window.Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);
        try {
          let { width, height } = img;
          if (width <= MAX_SIDE && height <= MAX_SIDE) {
            resolve(file);
            return;
          }

          const ratio = Math.min(MAX_SIDE / width, MAX_SIDE / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) { resolve(file); return; }
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (!blob) { resolve(file); return; }
              resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
            },
            'image/jpeg',
            JPEG_QUALITY,
          );
        } catch {
          resolve(file);
        }
      };

      img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });

    return Promise.race([compress, timeout]);
  } catch {
    return file;
  }
}
