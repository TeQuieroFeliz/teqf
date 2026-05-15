const MAX_SIDE = 1200;
const JPEG_QUALITY = 0.72;

export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file;

  let normalizedFile = file;
  const isHeic =
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    /\.hei[cf]$/i.test(file.name);

  if (isHeic) {
    try {
      const heic2anyModule = await import('heic2any');
      const heic2any = heic2anyModule.default ?? heic2anyModule;
      const result = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.8 });
      const converted = Array.isArray(result) ? result[0] : result;
      if (converted instanceof Blob) {
        normalizedFile = new File(
          [converted],
          file.name.replace(/\.[^.]+$/, '.jpg'),
          { type: 'image/jpeg' }
        );
      }
    } catch (error) {
      console.warn('[compressImage] HEIC conversion fallita, si usa il file originale.', error);
    }
  }

  try {
    const timeout = new Promise<File>((resolve) =>
      setTimeout(() => resolve(normalizedFile), 8000)
    );

    const compress = new Promise<File>((resolve) => {
      const img = new window.Image();
      const url = URL.createObjectURL(normalizedFile);

      img.onload = () => {
        URL.revokeObjectURL(url);
        try {
          let { width, height } = img;
          if (width <= MAX_SIDE && height <= MAX_SIDE) {
            resolve(normalizedFile);
            return;
          }

          const ratio = Math.min(MAX_SIDE / width, MAX_SIDE / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) { resolve(normalizedFile); return; }
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (!blob) { resolve(normalizedFile); return; }
              resolve(new File([blob], normalizedFile.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
            },
            'image/jpeg',
            JPEG_QUALITY,
          );
        } catch {
          resolve(normalizedFile);
        }
      };

      img.onerror = () => { URL.revokeObjectURL(url); resolve(normalizedFile); };
      img.src = url;
    });

    return Promise.race([compress, timeout]);
  } catch {
    return normalizedFile;
  }
}
