import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Landing from './routes/Landing';
import Privacy from './routes/Privacy';
import Terms from './routes/Terms';
import Support from './routes/Support';
import NotFound from './routes/NotFound';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/support" element={<Support />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
