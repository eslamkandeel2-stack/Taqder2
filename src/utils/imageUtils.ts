/**
 * Utility functions for logo image processing:
 * - Smart background removal (turning white/light solid background to 100% transparent PNG)
 * - AI-assisted background removal
 * - Image color sampling
 */

/**
 * Removes white or near-white background from a base64 or image URL using HTML5 Canvas.
 * Corner pixels are sampled to detect true background color, then pixels matching the background
 * within threshold tolerance are converted to transparent PNG pixels.
 */
export function removeWhiteBackgroundCanvas(
  imageUrl: string,
  thresholdTolerance: number = 220
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Canvas context unavailable'));
        return;
      }

      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;

      // Sample corner pixels to determine background color
      const cornerSamples = [
        [0, 0],
        [canvas.width - 1, 0],
        [0, canvas.height - 1],
        [canvas.width - 1, canvas.height - 1]
      ];

      let avgR = 0, avgG = 0, avgB = 0;
      cornerSamples.forEach(([x, y]) => {
        const idx = (y * canvas.width + x) * 4;
        avgR += data[idx];
        avgG += data[idx + 1];
        avgB += data[idx + 2];
      });
      avgR = Math.round(avgR / 4);
      avgG = Math.round(avgG / 4);
      avgB = Math.round(avgB / 4);

      // Loop through all pixels and set alpha = 0 for pixels close to background color or near white
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Distance from sampled background color
        const distToBg = Math.sqrt((r - avgR) ** 2 + (g - avgG) ** 2 + (b - avgB) ** 2);
        
        // Is it pure white/light gray?
        const isNearWhite = r >= thresholdTolerance && g >= thresholdTolerance && b >= thresholdTolerance;

        if (isNearWhite || distToBg < 45) {
          data[i + 3] = 0; // Set Alpha to 0 (Transparent)
        } else if (r > thresholdTolerance - 20 && g > thresholdTolerance - 20 && b > thresholdTolerance - 20) {
          // Soft edge feathering
          const alphaFactor = Math.max(0, (255 - ((r + g + b) / 3)) / 35);
          data[i + 3] = Math.round(data[i + 3] * alphaFactor);
        }
      }

      ctx.putImageData(imgData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };

    img.onerror = (err) => {
      reject(err);
    };
  });
}

/**
 * AI-assisted background removal that calls the backend /api/ai-remove-background endpoint
 */
export async function removeBackgroundAi(imageUrl: string): Promise<{
  success: boolean;
  transparentDataUrl: string;
  explanation?: string;
}> {
  try {
    const res = await fetch('/api/ai-remove-background', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl }),
    });

    if (res.ok) {
      const result = await res.json();
      if (result.success && result.transparentDataUrl) {
        return {
          success: true,
          transparentDataUrl: result.transparentDataUrl,
          explanation: result.explanation || 'تم حذف خلفية الشعار بنجاح بالذكاء الاصطناعي وجعله شفافاً.',
        };
      }
    }
  } catch (e) {
    console.warn('AI bg removal API error, falling back to smart canvas removal:', e);
  }

  // Fallback to client-side smart canvas removal
  const fallbackUrl = await removeWhiteBackgroundCanvas(imageUrl, 215);
  return {
    success: true,
    transparentDataUrl: fallbackUrl,
    explanation: 'تم معالجة الشعار ذكائياً وإزالة الخلفية وتحويله إلى PNG شفاف بنجاح.',
  };
}
