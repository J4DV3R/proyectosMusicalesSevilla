import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

const App = lazy(() => import('./App.jsx'));
const AdminPanel = lazy(() => import('./pages/AdminPanel.jsx'));
const EditNotice = lazy(() => import('./pages/EditNotice.jsx'));
const UserProfile = lazy(() => import('./pages/UserProfile.jsx'));
import { CategoryProvider } from './context/CategoryContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <CategoryProvider>
        <BrowserRouter>
          <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--neon-green)', fontFamily: 'monospace', fontSize: '1.2rem', backgroundColor: 'var(--bg-color, #0a0a0a)' }}>[ INICIANDO SISTEMA . . . ]</div>}>
            <Routes>
              <Route path="/" element={<App />} />
              <Route path="/edit/:token" element={<EditNotice />} />
              <Route path="/profile/:id" element={<UserProfile />} />
              <Route path="/admin" element={<AdminPanel />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </CategoryProvider>
    </ThemeProvider>
  </React.StrictMode>
);
