import { useCallback, useRef, useState } from 'react';

interface DropZoneProps {
  accept: string;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  onFile: (file: File) => void;
}

export default function DropZone({ accept, label, sublabel, icon, onFile }: DropZoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) onFile(file);
    },
    [onFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFile(file);
    },
    [onFile]
  );

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200 ${
        dragging
          ? 'border-primary-500 bg-primary-50 scale-[1.02]'
          : 'border-gray-300 bg-white hover:border-primary-400 hover:bg-primary-50/50'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />
      <div className="flex flex-col items-center gap-4">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${
          dragging ? 'bg-primary-100' : 'bg-gray-100'
        }`}>
          {icon}
        </div>
        <div>
          <p className="text-lg font-semibold text-gray-800">{label}</p>
          <p className="text-sm text-gray-500 mt-1">{sublabel}</p>
        </div>
      </div>
    </div>
  );
}
