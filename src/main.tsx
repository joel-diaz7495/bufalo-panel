import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './estilos.css';

registerSW({ immediate: true });

createRoot(document.getElementById('raiz') as HTMLElement).render(<StrictMode><App /></StrictMode>);
