import { useEffect, useState } from 'react';
import { fetchConfig } from '../lib/api';

let cached: number | null = null;

export function useMaxUpload(): number | null {
  const [maxMb, setMaxMb] = useState<number | null>(cached);

  useEffect(() => {
    if (cached !== null) return;
    fetchConfig()
      .then((cfg) => {
        cached = cfg.max_upload_mb;
        setMaxMb(cfg.max_upload_mb);
      })
      .catch(() => {});
  }, []);

  return maxMb;
}
