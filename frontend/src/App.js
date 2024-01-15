import './App.css';
import { BrowserRouter, Routes, Route, } from "react-router-dom";
import LoginPage from './pages/Login';
import PasswordResetPage from './pages/PasswordReset';
import UserHomePage from './pages/UserHome';
import UserRegistrationPage from './pages/UserRegistration';
import AdminHomePage from './pages/AdminHome';
import SuperAdminHomePage from './pages/SuperAdminHome';
import DashboardPage from './pages/Dashboard';
import ResultsPage from './pages/Results';
import AudioPage from './pages/Audio';
import VideoPage from './pages/Video';
import UserAccountPage from './pages/Account';

function App() {
  return (
    <div className="min-h-full h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/passwordreset" element={<PasswordResetPage />} />
            <Route path="/userhome" element={<UserHomePage />} />
            <Route path="/results" element={<ResultsPage />} />
            <Route path="/adminhome" element={<AdminHomePage />} />
            <Route path="/superadminhome" element={<SuperAdminHomePage />} />
            <Route path="/userregistration" element={<UserRegistrationPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/audio" element={<AudioPage />} />
            <Route path="/video" element={<VideoPage />} />
            <Route path="/account" element={<UserAccountPage />} />
          </Routes>
        </BrowserRouter>
      </div>
    </div>
  );
}

export default App;