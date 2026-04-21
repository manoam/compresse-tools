import { useState } from 'react';
import DropZone from '../components/DropZone';
import FilePreview from '../components/FilePreview';
import CompressionResult from '../components/CompressionResult';
import { useCompression } from '../hooks/useCompression';
import { compressPdf } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const PRESETS = [
  {
    id: 'screen',
    label: 'Pour le web',
    desc: 'Lecture écran, email (72 dpi)',
    quality: 20,
    icon: '🌐',
  },
  {
    id: 'ebook',
    label: 'Équilibré',
    desc: 'Bon compromis qualité/taille (150 dpi)',
    quality: 50,
    icon: '📄',
  },
  {
    id: 'printer',
    label: 'Pour l\'impression',
    desc: 'Haute qualité (300 dpi)',
    quality: 80,
    icon: '🖨️',
  },
] as const;

type PresetId = typeof PRESETS[number]['id'];

export default function CompressPdf() {
  const { token } = useAuth();
  const [preset, setPreset] = useState<PresetId>('ebook');
  const quality = PRESETS.find(p => p.id === preset)!.quality;
  const { file, setFile, compressing, result, error, compress, download, reset } =
    useCompression({ compressFn: compressPdf, token });

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
            <path d="M14 2v6h6" />
            <path d="M16 13H8M16 17H8M10 9H8" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Compresser PDF</h1>
        <p className="text-gray-600 mt-2">Réduisez la taille de vos PDF</p>
      </div>

      {!file && !result && (
        <DropZone
          accept=".pdf"
          label="Déposez votre PDF ici"
          sublabel="ou cliquez pour parcourir"
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

          {/* Preset selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Pour quelle utilisation ?</label>
            <div className="grid grid-cols-3 gap-3">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPreset(p.id as PresetId)}
                  className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                    preset === p.id
                      ? 'border-red-300 bg-red-50 ring-2 ring-offset-1 ring-red-300'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="text-lg mb-1">{p.icon}</div>
                  <div className={`text-sm font-semibold ${preset === p.id ? 'text-red-800' : 'text-gray-800'}`}>{p.label}</div>
                  <div className={`text-xs mt-0.5 ${preset === p.id ? 'text-red-600' : 'text-gray-500'}`}>{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={() => compress(quality)}
            disabled={compressing}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium py-3.5 px-6 rounded-xl transition-colors cursor-pointer"
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
              'Compresser le PDF'
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
