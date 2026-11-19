import QRCode from 'qrcode';
import jsQR from 'jsqr';

export interface QrOptions {
  margin?: number;
  width?: number;
  darkColor?: string;
  lightColor?: string;
}

/**
 * Generate a PNG Data URL for a given string (e.g. otpauth URI)
 */
export async function generateQrCodeDataUrl(
  text: string,
  options: QrOptions = {}
): Promise<string> {
  const {
    margin = 2,
    width = 280,
    darkColor = '#000000',
    lightColor = '#FFFFFF',
  } = options;

  return QRCode.toDataURL(text, {
    margin,
    width,
    color: {
      dark: darkColor,
      light: lightColor,
    },
    errorCorrectionLevel: 'M',
  });
}

/**
 * Decode QR code data from an ImageData object
 */
export function decodeQrCodeFromImageData(imageData: ImageData): string | null {
  const result = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: 'attemptBoth',
  });
  return result ? result.data : null;
}

/**
 * Decode QR code from an Image element
 */
export function decodeQrCodeFromImageElement(img: HTMLImageElement): string | null {
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  if (!width || !height) return null;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return decodeQrCodeFromImageData(imageData);
}

/**
 * Decode QR code from a File object (e.g. uploaded file or pasted image blob)
 */
export function decodeQrCodeFromFile(file: File | Blob): Promise<string | null> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.URL) {
      return reject(new Error('Browser environment required to process images'));
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      try {
        const decoded = decodeQrCodeFromImageElement(img);
        URL.revokeObjectURL(objectUrl);
        resolve(decoded);
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image file'));
    };

    img.src = objectUrl;
  });
}

/**
 * Scan a single video frame from an active HTMLVideoElement (for webcam scanning)
 */
export function scanQrFromVideo(video: HTMLVideoElement): string | null {
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    return null;
  }

  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) {
    return null;
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return decodeQrCodeFromImageData(imageData);
}
