import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { SlidesProvider } from './context/SlidesContext';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')).render(
  <SlidesProvider>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </SlidesProvider>
);
