import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { Header } from "./components/Header";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-black">
          <Header />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            {/* Add more routes as needed */}
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
