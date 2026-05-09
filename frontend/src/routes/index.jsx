import { Route, Routes } from 'react-router-dom';
import Football from '../pages/Football';
import Landing from '../pages/Landing.jsx';
import NotFound from '../pages/NotFound.jsx';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/football" element={<Football />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
