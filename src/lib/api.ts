export interface CompressionResult {
  blob: Blob;
  originalSize: number;
  compressedSize: number;
  filename: string;
}

export async function compressImage(
  file: File,
  quality: number,
  format?: string
): Promise<CompressionResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('quality', quality.toString());
  if (format) formData.append('format', format);

  const res = await fetch('/api/compress/image/', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Compression failed');
  }

  const blob = await res.blob();
  const originalSize = parseInt(res.headers.get('X-Original-Size') || '0');
  const compressedSize = parseInt(res.headers.get('X-Compressed-Size') || '0');
  const disposition = res.headers.get('Content-Disposition') || '';
  const filenameMatch = disposition.match(/filename="(.+)"/);
  const filename = filenameMatch ? filenameMatch[1] : 'compressed-image';

  return { blob, originalSize, compressedSize, filename };
}

export async function compressPdf(
  file: File,
  quality: number
): Promise<CompressionResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('quality', quality.toString());

  const res = await fetch('/api/compress/pdf/', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Compression failed');
  }

  const blob = await res.blob();
  const originalSize = parseInt(res.headers.get('X-Original-Size') || '0');
  const compressedSize = parseInt(res.headers.get('X-Compressed-Size') || '0');
  const disposition = res.headers.get('Content-Disposition') || '';
  const filenameMatch = disposition.match(/filename="(.+)"/);
  const filename = filenameMatch ? filenameMatch[1] : 'compressed.pdf';

  return { blob, originalSize, compressedSize, filename };
}
