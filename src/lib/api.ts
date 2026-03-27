export interface CompressionResult {
  blob: Blob;
  originalSize: number;
  compressedSize: number;
  filename: string;
}

export interface HistoryRecord {
  id: number;
  filename: string;
  original_size: number;
  compressed_size: number;
  compression_type: string;
  username: string;
  user_id: string;
  created_at: string;
}

export interface HistoryUser {
  user_id: string;
  username: string;
}

export async function compressImage(
  file: File,
  quality: number,
  format?: string,
  token?: string | null
): Promise<CompressionResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('quality', quality.toString());
  if (format) formData.append('format', format);

  const headers: HeadersInit = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch('/api/compress/image/', {
    method: 'POST',
    body: formData,
    headers,
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
  quality: number,
  _format?: string,
  token?: string | null
): Promise<CompressionResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('quality', quality.toString());

  const headers: HeadersInit = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch('/api/compress/pdf/', {
    method: 'POST',
    body: formData,
    headers,
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

export interface HistoryResponse {
  data: HistoryRecord[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  is_admin: boolean;
}

export async function fetchHistory(
  token: string,
  params: { page?: number; per_page?: number; type?: string; search?: string; user_id?: string } = {}
): Promise<HistoryResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page.toString());
  if (params.per_page) query.set('per_page', params.per_page.toString());
  if (params.type) query.set('type', params.type);
  if (params.search) query.set('search', params.search);
  if (params.user_id) query.set('user_id', params.user_id);

  const res = await fetch(`/api/history/?${query.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to load history');
  return res.json();
}

export async function fetchHistoryUsers(token: string): Promise<HistoryUser[]> {
  const res = await fetch('/api/history/users', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  return res.json();
}
