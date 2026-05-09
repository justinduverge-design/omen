import { Route, Routes } from 'react-router-dom';
import Landing from '../pages/Landing.jsx';
import NotFound from '../pages/NotFound.jsx';
import TradeAnalyzer from '../pages/TradeAnalyzer.jsx';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/trade-analyzer" element={<TradeAnalyzer />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
