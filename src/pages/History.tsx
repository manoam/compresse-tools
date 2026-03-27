import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchHistory, type HistoryRecord } from '../lib/api';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function History() {
  const { token } = useAuth();
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetchHistory(token)
      .then(setRecords)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Historique des compressions</h1>
        <p className="text-gray-500 text-sm mt-1">Vos 100 dernieres compressions</p>
      </div>

      {loading && (
        <div className="text-center py-12 text-gray-500">Chargement...</div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && records.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          Aucune compression pour le moment.
        </div>
      )}

      {!loading && records.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Fichier</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Original</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Compresse</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Reduction</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Date</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => {
                const ratio = r.original_size > 0
                  ? Math.round((1 - r.compressed_size / r.original_size) * 100)
                  : 0;
                return (
                  <tr key={r.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900 truncate max-w-[200px]" title={r.filename}>
                      {r.filename}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        r.compression_type === 'pdf'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {r.compression_type.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">{formatSize(r.original_size)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{formatSize(r.compressed_size)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-medium ${ratio > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                        {ratio > 0 ? `-${ratio}%` : '0%'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500 whitespace-nowrap">
                      {r.created_at ? formatDate(r.created_at) : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
