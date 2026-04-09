import React from 'react';
import { Routes, Route } from 'react-router-dom';
import DashboardLayout from './ui/Layout/DashboardLayout';
import Home from './pages/Home/Home';
import Analysis from './pages/Analysis/Analysis';

function App() {
  return (
    <DashboardLayout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/analyzer" element={<Analysis />} />
      </Routes>
    </DashboardLayout>
  );
}

export default App;
