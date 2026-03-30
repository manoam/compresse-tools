import { useState, useEffect, useRef } from 'react';
import DropZone from '../components/DropZone';
import CompressionResult from '../components/CompressionResult';
import { useCompression } from '../hooks/useCompression';
import { compressImage } from '../lib/api';
import { useAuth } from '../context/AuthContext';

// Use cases with pre-configured quality + max dimension
const USE_CASES = [
  {
    id: 'web',
    label: 'Pour le web',
    desc: 'Sites, réseaux sociaux, emails',
    quality: 60,
    maxWidth: 1920,
    icon: '🌐',
  },
  {
    id: 'print',
    label: 'Pour l\'impression',
    desc: 'Flyers, affiches, documents',
    quality: 85,
    maxWidth: 3000,
    icon: '🖨️',
  },
  {
    id: 'light',
    label: 'Ultra léger',
    desc: 'Miniatures, vignettes, aperçus',
    quality: 40,
    maxWidth: 800,
    icon: '⚡',
  },
  {
    id: 'custom',
    label: 'Personnalisé',
    desc: 'Choisir moi-même',
    quality: 60,
    maxWidth: 0,
    icon: '⚙️',
  },
] as const;

type UseCaseId = typeof USE_CASES[number]['id'];

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function useImageInfo(file: File | null) {
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setWidth(0);
      setHeight(0);
      setOriginalUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setOriginalUrl(url);
    const img = new Image();
    img.onload = () => {
      setWidth(img.naturalWidth);
      setHeight(img.naturalHeight);
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return { width, height, originalUrl };
}

function usePreview(file: File | null, originalUrl: string | null, quality: number, maxWidth: number, imgWidth: number, imgHeight: number) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewSize, setPreviewSize] = useState(0);
  const [outputWidth, setOutputWidth] = useState(0);
  const [outputHeight, setOutputHeight] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!file || !originalUrl || !imgWidth) return;

    const img = new Image();
    img.onload = () => {
      if (!canvasRef.current) canvasRef.current = document.createElement('canvas');
      const canvas = canvasRef.current;

      let w = img.naturalWidth;
      let h = img.naturalHeight;

      // Resize if maxWidth is set and image is larger
      if (maxWidth > 0 && w > maxWidth) {
        const ratio = maxWidth / w;
        w = maxWidth;
        h = Math.round(h * ratio);
      }

      canvas.width = w;
      canvas.height = h;
      setOutputWidth(w);
      setOutputHeight(h);

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, w, h);

      const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      canvas.toBlob(
        (blob) => {
          if (blob) {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setPreviewUrl(URL.createObjectURL(blob));
            setPreviewSize(blob.size);
          }
        },
        mimeType,
        quality / 100
      );
    };
    img.src = originalUrl;
  }, [file, originalUrl, quality, maxWidth, imgWidth, imgHeight]);

  return { previewUrl, previewSize, outputWidth, outputHeight };
}

export default function CompressImage() {
  const { token } = useAuth();
  const [useCase, setUseCase] = useState<UseCaseId>('web');
  const [customQuality, setCustomQuality] = useState(60);
  const [customMaxWidth, setCustomMaxWidth] = useState(0);

  const selectedUseCase = USE_CASES.find(u => u.id === useCase)!;
  const quality = useCase === 'custom' ? customQuality : selectedUseCase.quality;
  const maxWidth = useCase === 'custom' ? customMaxWidth : selectedUseCase.maxWidth;

  const { file, setFile, compressing, result, error, compress, download, reset } =
    useCompression({ compressFn: compressImage, token });
  const { width: imgWidth, height: imgHeight, originalUrl } = useImageInfo(file);
  const { previewUrl, previewSize, outputWidth, outputHeight } = usePreview(file, originalUrl, quality, maxWidth, imgWidth, imgHeight);
  const [showOriginal, setShowOriginal] = useState(false);

  const isLargeImage = imgWidth > 2000 || imgHeight > 2000;
  const willResize = maxWidth > 0 && imgWidth > maxWidth;
  const estimatedReduction = file && previewSize > 0 ? Math.round((1 - previewSize / file.size) * 100) : 0;

  const handleReset = () => {
    reset();
    setUseCase('web');
    setCustomQuality(60);
    setCustomMaxWidth(0);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Compresser Image</h1>
        <p className="text-gray-600 mt-2">JPG, PNG, WebP - jusqu'à 50 MB</p>
      </div>

      {!file && !result && (
        <DropZone
          accept=".jpg,.jpeg,.png,.webp"
          label="Déposez votre image ici"
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
          {/* Image info banner */}
          {imgWidth > 0 && (
            <div className={`rounded-xl px-4 py-3 text-sm flex items-center justify-between ${
              isLargeImage ? 'bg-amber-50 border border-amber-200 text-amber-800' : 'bg-gray-50 border border-gray-200 text-gray-600'
            }`}>
              <div>
                <span className="font-medium">{file.name}</span>
                <span className="mx-2">·</span>
                <span>{imgWidth} × {imgHeight}px</span>
                <span className="mx-2">·</span>
                <span>{formatSize(file.size)}</span>
              </div>
              <button onClick={handleReset} className="text-red-500 hover:text-red-700 text-xs cursor-pointer">Supprimer</button>
            </div>
          )}

          {/* Large image suggestion */}
          {isLargeImage && useCase !== 'custom' && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
              <span className="font-medium">Image en haute résolution détectée.</span> Les dimensions seront automatiquement réduites selon l'usage choisi.
            </div>
          )}

          {/* Use case selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Pour quelle utilisation ?</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {USE_CASES.map((u) => (
                <button
                  key={u.id}
                  onClick={() => setUseCase(u.id as UseCaseId)}
                  className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                    useCase === u.id
                      ? 'border-primary-400 bg-primary-50 ring-2 ring-offset-1 ring-primary-300'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="text-lg mb-1">{u.icon}</div>
                  <div className={`text-sm font-semibold ${useCase === u.id ? 'text-primary-800' : 'text-gray-800'}`}>{u.label}</div>
                  <div className={`text-xs mt-0.5 ${useCase === u.id ? 'text-primary-600' : 'text-gray-500'}`}>{u.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom options */}
          {useCase === 'custom' && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Qualité : {customQuality}%
                </label>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={customQuality}
                  onChange={(e) => setCustomQuality(Number(e.target.value))}
                  className="w-full accent-primary-600"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>Plus compressé</span>
                  <span>Meilleure qualité</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Largeur maximale {customMaxWidth > 0 ? `: ${customMaxWidth}px` : ': aucune limite'}
                </label>
                <input
                  type="range"
                  min="0"
                  max={imgWidth || 4000}
                  step="100"
                  value={customMaxWidth}
                  onChange={(e) => setCustomMaxWidth(Number(e.target.value))}
                  className="w-full accent-primary-600"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>Plus petit</span>
                  <span>Dimensions originales</span>
                </div>
              </div>
            </div>
          )}

          {/* Output info */}
          {willResize && outputWidth > 0 && (
            <div className="text-xs text-gray-500 px-1">
              Dimensions de sortie : {outputWidth} × {outputHeight}px (redimensionné depuis {imgWidth} × {imgHeight}px)
            </div>
          )}

          {/* Live preview */}
          {originalUrl && previewUrl && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-gray-50">
                <button
                  onMouseDown={() => setShowOriginal(true)}
                  onMouseUp={() => setShowOriginal(false)}
                  onMouseLeave={() => setShowOriginal(false)}
                  onTouchStart={() => setShowOriginal(true)}
                  onTouchEnd={() => setShowOriginal(false)}
                  className="text-xs px-3 py-1 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition select-none cursor-pointer"
                >
                  {showOriginal ? 'Original' : 'Maintenir pour voir l\'original'}
                </button>
                <div className="text-xs text-gray-500">
                  {estimatedReduction > 0 ? (
                    <span className="text-green-600 font-medium">~{estimatedReduction}% de réduction estimée</span>
                  ) : (
                    <span>Aperçu en direct</span>
                  )}
                </div>
              </div>
              <div className="relative max-h-[400px] overflow-hidden flex items-center justify-center bg-[#f0f0f0]">
                <img
                  src={showOriginal ? originalUrl : previewUrl}
                  alt={showOriginal ? 'Original' : 'Aperçu compressé'}
                  className="max-w-full max-h-[400px] object-contain"
                />
                {showOriginal && (
                  <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                    Original
                  </div>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={() => compress(quality, undefined, maxWidth)}
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
          onReset={handleReset}
        />
      )}
    </div>
  );
}
