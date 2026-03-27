import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchHistory, type HistoryRecord, type HistoryResponse } from '../lib/api';
import { Search, ChevronLeft, ChevronRight, Filter } from 'lucide-react';

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

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const perPage = 20;

  const [typeFilter, setTypeFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const loadHistory = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res: HistoryResponse = await fetchHistory(token, {
        page,
        per_page: perPage,
        type: typeFilter || undefined,
        search: searchQuery || undefined,
      });
      setRecords(res.data);
      setTotalPages(res.total_pages);
      setTotal(res.total);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token, page, typeFilter, searchQuery]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [typeFilter, searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Historique des compressions</h1>
        <p className="text-gray-500 text-sm mt-1">{total} compression{total !== 1 ? 's' : ''} au total</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Rechercher par nom de fichier..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </form>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="py-2 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          >
            <option value="">Tous les types</option>
            <option value="pdf">PDF</option>
            <option value="image">Image</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm mb-5">
          {error}
        </div>
      )}

      {loading && (
        <div className="text-center py-12 text-gray-500">Chargement...</div>
      )}

      {!loading && !error && records.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          {searchQuery || typeFilter ? 'Aucun resultat pour ces filtres.' : 'Aucune compression pour le moment.'}
        </div>
      )}

      {!loading && records.length > 0 && (
        <>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
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
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">
                Page {page} sur {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Precedent
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Suivant
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
