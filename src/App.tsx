/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { DetectionProvider } from './context/DetectionContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import DataIngest from './pages/DataIngest';
import AlertCenter from './pages/AlertCenter';
import EntityProfile from './pages/EntityProfile';
import ModelLogic from './pages/ModelLogic';
import SystemConfig from './pages/SystemConfig';

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="h-full"
      >
        <Routes location={location}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/ingest" element={<DataIngest />} />
          <Route path="/alerts" element={<AlertCenter />} />
          <Route path="/profiles" element={<EntityProfile />} />
          <Route path="/model" element={<ModelLogic />} />
          <Route path="/config" element={<SystemConfig />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <DetectionProvider>
        <Router>
          <Layout>
            <AnimatedRoutes />
          </Layout>
        </Router>
      </DetectionProvider>
    </ThemeProvider>
  );
}
