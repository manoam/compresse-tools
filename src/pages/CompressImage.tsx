import { useState } from 'react';
import DropZone from '../components/DropZone';
import FilePreview from '../components/FilePreview';
import CompressionResult from '../components/CompressionResult';
import { useCompression } from '../hooks/useCompression';
import { compressImage } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function CompressImage() {
  const { token } = useAuth();
  const [quality] = useState(90);
  const { file, setFile, compressing, result, error, compress, download, reset } =
    useCompression({ compressFn: compressImage, token });

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Compresser Image</h1>
        <p className="text-gray-600 mt-2">JPG, PNG, WebP - jusqu'a 50 MB</p>
      </div>

      {!file && !result && (
        <DropZone
          accept=".jpg,.jpeg,.png,.webp"
          label="Deposez votre image ici"
          sublabel="ou cliquez pour parcourir (JPG, PNG, WebP)"
          icon={
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          }
          onFile={setFile}
        />
      )}

      {file && !result && (
        <div className="space-y-5">
          <FilePreview file={file} onRemove={reset} />

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={() => compress(quality)}
            disabled={compressing}
            className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white font-medium py-3.5 px-6 rounded-xl transition-colors cursor-pointer"
          >
            {compressing ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Compression en cours...
              </span>
            ) : (
              'Compresser l\'image'
            )}
          </button>
        </div>
      )}

      {result && (
        <CompressionResult
          originalSize={result.originalSize}
          compressedSize={result.compressedSize}
          onDownload={download}
          onReset={reset}
        />
      )}
    </div>
  );
}
