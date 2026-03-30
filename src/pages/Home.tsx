import { Link } from 'react-router-dom';

const features = [
  {
    path: '/compress-pdf',
    title: 'Compresser PDF',
    description: 'Réduisez la taille de vos fichiers PDF sans perdre en qualité. Idéal pour les documents scannés.',
    color: 'bg-red-50 border-red-200',
    iconColor: 'bg-red-100',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <path d="M14 2v6h6" />
        <path d="M16 13H8M16 17H8M10 9H8" />
      </svg>
    ),
  },
  {
    path: '/compress-image',
    title: 'Compresser Image',
    description: 'Compressez vos images JPG, PNG et WebP. Ajustez la qualité selon vos besoins.',
    color: 'bg-blue-50 border-blue-200',
    iconColor: 'bg-blue-100',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
        <circle cx="9" cy="9" r="2" />
        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
      </svg>
    ),
  },
];

export default function Home() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          Compressez vos fichiers
          <span className="text-primary-600"> en un clic</span>
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Outil gratuit pour compresser vos PDF et images. Rapide, sécurisé, et directement dans votre navigateur.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {features.map((feature) => (
          <Link
            key={feature.path}
            to={feature.path}
            className={`block p-8 rounded-2xl border-2 ${feature.color} hover:shadow-lg transition-all duration-200 hover:-translate-y-1 no-underline`}
          >
            <div className={`w-16 h-16 ${feature.iconColor} rounded-2xl flex items-center justify-center mb-5`}>
              {feature.icon}
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h2>
            <p className="text-gray-600">{feature.description}</p>
            <div className="mt-4 text-primary-600 font-medium text-sm flex items-center gap-1">
              Commencer
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-16 text-center">
        <div className="flex items-center justify-center gap-8 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            100% Sécurisé
          </div>
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
            Ultra rapide
          </div>
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            Gratuit
          </div>
        </div>
      </div>
    </div>
  );
}
