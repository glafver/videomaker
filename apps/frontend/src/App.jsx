import { Suspense, lazy } from 'react';
import './assets/scss/App.scss';
import { Routes, Route } from 'react-router-dom';
import Navigation from './pages/partials/Navigation';
import Footer from './pages/partials/Footer';

// Pages are split into separate chunks so the first visit only downloads the
// page it lands on instead of the whole app.
const HomePage = lazy(() => import('./pages/HomePage'));
const CreatePage = lazy(() => import('./pages/CreatePage'));
const EditVideoPage = lazy(() => import('./pages/EditVideoPage'));
const VideoPage = lazy(() => import('./pages/VideoPage'));
const SharePage = lazy(() => import('./pages/SharePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const AccountPage = lazy(() => import('./pages/AccountPage'));
const ProjectPage = lazy(() => import('./pages/ProjectPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));

function App() {

  return (
    <div className="App">
      <Navigation />
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/create" element={<CreatePage />} />
          <Route path="/edit_video" element={<EditVideoPage />} />
          <Route path="/your_video" element={<VideoPage />} />
          <Route path="/share/:id/:order" element={<SharePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/account/project/:projectId" element={<ProjectPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </Suspense>
      <Footer />
    </div>
  );
}

export default App;
