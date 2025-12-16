import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Missions from './pages/Missions';
import Progress from './pages/Progress';
import Story from './pages/Story';
import Settings from './pages/Settings';
import Finances from './pages/Finances';
import { FinanceProvider } from './finance/FinanceContext';

const App: React.FC = () => {
  return (
    <HashRouter>
      <FinanceProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/missions" element={<Missions />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/story" element={<Story />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/finances" element={<Finances />} />
            {/* Fallback route redirecting to Home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </FinanceProvider>
    </HashRouter>
  );
};

export default App;