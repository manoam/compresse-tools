import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Home from './pages/Home';
import CompressPdf from './pages/CompressPdf';
import CompressImage from './pages/CompressImage';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/compress-pdf" element={<CompressPdf />} />
            <Route path="/compress-image" element={<CompressImage />} />
          </Routes>
        </main>
        <footer className="text-center py-6 text-sm text-gray-400 border-t border-gray-200 mt-auto">
          CompressTool &mdash; Compression gratuite de PDF et images
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;
