// src/App.tsx
import { Navigate, Route, Routes } from 'react-router-dom';
import ErrorBoundary from './components/shared/ErrorBoundary';
import Layout from './components/shared/Layout';
import Board from './routes/board';
import Budget from './routes/budget';
import Outreach from './routes/outreach';
import Setup from './routes/setup';
import WhatIf from './routes/whatif';

export default function App() {
  return (
    <ErrorBoundary>
      <Layout>
        <Routes>
          <Route path="/setup" element={<Setup />} />
          <Route path="/board" element={<Board />} />
          <Route path="/whatif" element={<WhatIf />} />
          <Route path="/budget" element={<Budget />} />
          <Route path="/outreach" element={<Outreach />} />
          <Route path="*" element={<Navigate to="/setup" replace />} />
        </Routes>
      </Layout>
    </ErrorBoundary>
  );
}
