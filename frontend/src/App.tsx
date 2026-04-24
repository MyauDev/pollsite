import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { Header } from "./components/Header";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { UserProfilePage } from "./pages/UserProfilePage";
import EditProfilePage from "./pages/EditProfilePage";
import CreatePollPage from "./pages/CreatePollPage";

const BACK_ROUTES = ["/user/", "/profile/edit", "/create"];

function AppContent() {
  const location = useLocation();
  const showBack = BACK_ROUTES.some((r) => location.pathname.startsWith(r));

  return (
    <div className="min-h-screen bg-black">
      <Header showBack={showBack} />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/create" element={<CreatePollPage />} />
        <Route path="/user/:username" element={<UserProfilePage />} />
        <Route path="/profile/edit" element={<EditProfilePage />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
