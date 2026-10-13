import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import InstallOffer from './components/InstallOffer';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <InstallOffer />
    <App />
  </StrictMode>,
);
