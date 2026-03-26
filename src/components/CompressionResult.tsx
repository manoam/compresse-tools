interface CompressionResultProps {
  originalSize: number;
  compressedSize: number;
  onDownload: () => void;
  onReset: () => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

export default function CompressionResult({
  originalSize,
  compressedSize,
  onDownload,
  onReset,
}: CompressionResultProps) {
  const saved = originalSize - compressedSize;
  const percent = originalSize > 0 ? Math.round((saved / originalSize) * 100) : 0;
  const ratio = originalSize > 0 ? (compressedSize / originalSize) * 100 : 100;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <div>
          <p className="text-lg font-semibold text-gray-900">Compression terminee !</p>
          <p className="text-sm text-gray-500">
            {percent > 0
              ? `${percent}% d'espace economise`
              : 'Le fichier est deja optimise'}
          </p>
        </div>
      </div>

      {/* Size bars */}
      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">Original</span>
            <span className="font-medium text-gray-800">{formatSize(originalSize)}</span>
          </div>
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gray-400 rounded-full" style={{ width: '100%' }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">Compresse</span>
            <span className="font-medium text-green-600">{formatSize(compressedSize)}</span>
          </div>
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.max(ratio, 5)}%` }}
            />
          </div>
        </div>
      </div>

      {saved > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-center">
          <span className="text-green-700 font-semibold text-lg">{formatSize(saved)}</span>
          <span className="text-green-600 text-sm ml-2">economises ({percent}%)</span>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onDownload}
          className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-6 rounded-xl transition-colors cursor-pointer"
        >
          Telecharger
        </button>
        <button
          onClick={onReset}
          className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
        >
          Nouveau fichier
        </button>
      </div>
    </div>
  );
}
