import QRCode from 'qrcode';
import jsQR from 'jsqr';

export interface QrOptions {
  margin?: number;
  width?: number;
  darkColor?: string;
  lightColor?: string;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
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
    errorCorrectionLevel = 'M',
  } = options;

  return QRCode.toDataURL(text, {
    margin,
    width,
    color: {
      dark: darkColor,
      light: lightColor,
    },
    errorCorrectionLevel,
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
 * Decode QR code from an Image element (with white-background fill and multi-scale fallback
 * for dense Google Authenticator migration screenshots)
 */
export function decodeQrCodeFromImageElement(img: HTMLImageElement): string | null {
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  if (!width || !height) return null;

  const tryDecodeAtSize = (targetW: number, targetH: number, smooth: boolean): string | null => {
    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, targetW, targetH);
    ctx.imageSmoothingEnabled = smooth;
    ctx.drawImage(img, 0, 0, targetW, targetH);
    const imageData = ctx.getImageData(0, 0, targetW, targetH);
    return decodeQrCodeFromImageData(imageData);
  };

  const direct = tryDecodeAtSize(width, height, true);
  if (direct) return direct;

  const maxDim = Math.max(width, height);
  if (maxDim > 1200) {
    const scale = 1000 / maxDim;
    const downscaled = tryDecodeAtSize(
      Math.round(width * scale),
      Math.round(height * scale),
      true
    );
    if (downscaled) return downscaled;
  } else if (maxDim < 360) {
    const upscaled = tryDecodeAtSize(width * 2, height * 2, false);
    if (upscaled) return upscaled;
  }

  return null;
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
