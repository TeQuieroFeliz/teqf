import { User } from 'firebase/auth';
import {
  getDownloadURL,
  getStorage,
  ref,
  uploadBytesResumable,
} from 'firebase/storage';
import { UserType } from './types';

export const imageUpload = async (
  image: File,
  user: UserType
): Promise<string> => {
  try {
    const storage = getStorage();
    const fileName = `${user.id}-${new Date().getTime()}-${image.name}`;
    const storageRef = ref(storage, 'images/' + fileName);

    const uploadTask = uploadBytesResumable(storageRef, image);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log('Upload is ' + progress + '% done');
        },
        (error) => {
          console.error('Upload error:', error);
          reject(error);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          } catch (error) {
            console.error('Error getting download URL:', error);
            reject(error);
          }
        }
      );
    });
  } catch (error) {
    console.error('Image upload failed:', error);
    throw error;
  }
};

export const multipleImageUpload = async (
  images: File[],
  user: UserType
): Promise<string[]> => {
  try {
    return Promise.all(
      images?.map((img) => {
        if (
          typeof img === 'string' &&
          (img as string).startsWith('https://firebasestorage.googleapis.com/')
        ) {
          return img as string;
        } else {
          return imageUpload(img, user);
        }
      })
    );
  } catch (err) {
    console.error('Multiple image upload failed:', err);
    throw err;
  }
};
