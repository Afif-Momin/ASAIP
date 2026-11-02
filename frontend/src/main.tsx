import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@xyflow/react/dist/style.css';
import './index.css';
import App from './App';
import { AppProvider } from './context/AppContext';
import { ToastProvider } from './components/ui/toast';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <AppProvider><App /></AppProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
