import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import Home from './pages/Home';
import CompressPdf from './pages/CompressPdf';
import CompressImage from './pages/CompressImage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/compress-pdf" element={<CompressPdf />} />
          <Route path="/compress-image" element={<CompressImage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
