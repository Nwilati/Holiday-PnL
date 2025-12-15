import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Bookings from './pages/Bookings';
import Expenses from './pages/Expenses';
import Properties from './pages/Properties';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/bookings" element={<Bookings />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/properties" element={<Properties />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
