import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App';
import '@/index.css';
import { AuthProvider } from '@/contexts/SupabaseAuthContext';
import { Toaster } from '@/components/ui/toaster';

ReactDOM.createRoot(document.getElementById('root')).render(
  // Eliminado <React.StrictMode> para evitar doble renderizado que podría causar problemas con efectos de terceros.
  <AuthProvider>
    <App />
    <Toaster />
  </AuthProvider>
);