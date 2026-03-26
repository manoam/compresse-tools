import { useState, useCallback } from 'react';
import type { CompressionResult } from '../lib/api';

interface UseCompressionOptions {
  compressFn: (file: File, quality: number, format?: string) => Promise<CompressionResult>;
}

export function useCompression({ compressFn }: UseCompressionOptions) {
  const [file, setFile] = useState<File | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [result, setResult] = useState<CompressionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const compress = useCallback(
    async (quality: number, format?: string) => {
      if (!file) return;
      setCompressing(true);
      setError(null);
      setResult(null);
      try {
        const res = await compressFn(file, quality, format);
        setResult(res);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Compression failed');
      } finally {
        setCompressing(false);
      }
    },
    [file, compressFn]
  );

  const download = useCallback(() => {
    if (!result) return;
    const url = URL.createObjectURL(result.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [result]);

  const reset = useCallback(() => {
    setFile(null);
    setResult(null);
    setError(null);
    setCompressing(false);
  }, []);

  return { file, setFile, compressing, result, error, compress, download, reset };
}
