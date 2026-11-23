import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { SlidesProvider } from './context/SlidesContext';
import { AuthProvider } from './context/AuthContext';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')).render(
  <AuthProvider>
    <SlidesProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </SlidesProvider>
  </AuthProvider>
);
