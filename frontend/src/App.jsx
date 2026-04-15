import React from 'react';
import { Routes, Route } from 'react-router-dom';
import DashboardLayout from './ui/Layout/DashboardLayout';
import Home from './pages/Home/Home';
import Analysis from './pages/Analysis/Analysis';

import Customizar from './pages/Customizar/Customizar';

function App() {
  return (
    <DashboardLayout>
      <Routes>
        <Route path="/historical" element={<Home />} />
        <Route path="/analyzer" element={<Analysis />} />
        <Route path="/" element={<Customizar />} />
      </Routes>
    </DashboardLayout>
  );
}

export default App;
