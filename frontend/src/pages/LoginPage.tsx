import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { LoginRequest, APIError } from "../types"; 
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { FiEye, FiEyeOff } from 'react-icons/fi';

interface AxiosError {
    response?: {
        data?: APIError;
    };
}

function isAxiosError(error: unknown): error is AxiosError {
    return (
        typeof error === 'object' && 
        error !== null && 
        'response' in error
    );
}

export const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState<LoginRequest>({
    identifier: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(formData);
      navigate("/");
    } 
    catch (err: unknown) { 
      if (isAxiosError(err)) {
        console.error("Login error:", err.response?.data);
        
        const errorData = err.response?.data?.error || err.response?.data;
        const details = (typeof errorData === 'object' && errorData !== null) ? errorData.details : undefined;

        if (details?.identifier || details?.password) {
          const errors = [];
          if (details.identifier) errors.push(details.identifier[0]);
          if (details.password) errors.push(details.password[0]);
          setError(errors.join(" "));
        } else if (details?.non_field_errors) {
          setError(details.non_field_errors[0]);
        } else {
          const message = typeof errorData === 'object' && errorData !== null ? (errorData.message || errorData.detail) : undefined;
          setError(message || "Login failed. Please try again.");
        }
      } else {
          setError("An unexpected error occurred.");
          console.error("An unexpected error occurred:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    console.log("Starting Google Sign-In process...");
  };


  const EyeIcon = showPassword ? (
      <FiEye className="w-5 h-5" /> 
  ) : (
      <FiEyeOff className="w-5 h-5" /> 
  );

  const formMarginClass = error ? "mb-20" : "mb-6";


  return (
    <div className="min-h-screen flex items-center justify-center bg-black py-12 px-4 sm:px-6 lg:px-8 relative">
   
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-center z-0">
          <div className="flex items-center space-x-3 w-full"> 
              <div className="flex-grow border-t border-pink" />
              <span className="text-white text-sm font-medium bg-black px-4 z-10">OR</span>
              <div className="flex-grow border-t border-pink" />
          </div>
      </div>
      
    
      <div className="max-w-xs w-full text-center space-y-6 z-10 mb-25"> 
        
        <div>
          <h1 className="text-8xl font-family-impact font-bold tracking-tight text-white uppercase mb-2">
            POLLS
          </h1>
          <h2 className="text-xl font-medium text-white mb-2">
            SIGN IN
          </h2>
          <p className="text-sm text-white/70">
            Don't have an account?{" "}
            <Link to="/signup" className="font-medium text-pink hover:text-pink/80 transition-colors">
              Sign Up
            </Link>
          </p>
        </div>

        <form className={`space-y-4 ${formMarginClass}`} onSubmit={handleSubmit}> 
          
          {error && (
            <div className="rounded-3xl bg-red-800/20 border border-red-800 p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <Input
            id="identifier"
            label="Email or Username"
            type="text"
            placeholder="Email address or username"
            value={formData.identifier}
            onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
          />
          
          <Input
            id="password"
            label="Password"
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
            hasIcon={true}
            onIconClick={() => setShowPassword(prev => !prev)}
            icon={EyeIcon}
          />

          <Button 
            variant="outline" 
            size="md" 
            fullWidth
            onClick={handleGoogleSignIn}
            className="border-white/50 text-white hover:bg-white/10 hover:text-white mt-15 flex justify-center items-center"
        >
            {/* SVG для Google */}
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.0003 4.8C14.7603 4.8 17.0603 5.76 18.8203 7.32L21.4603 4.68C19.0603 2.52 16.0003 1.2 12.0003 1.2C7.27031 1.2 3.19031 3.24 0.990312 6.36L3.84031 8.64C4.56031 6.84 6.18031 5.76 8.04031 5.76L12.0003 5.76V4.8Z" fill="#EA4335"/>
                <path d="M12.0003 22.8C15.7703 22.8 18.8603 21.36 20.6703 19.32L17.8103 17.04C16.6303 18.42 14.5403 19.32 12.0003 19.32C9.43031 19.32 7.15031 18.24 5.67031 16.32L2.83031 18.57C4.69031 21.06 8.10031 22.8 12.0003 22.8Z" fill="#34A853"/>
                <path d="M11.9999 9.18002C13.5186 9.18002 14.8817 9.81423 15.9069 10.7497L18.5469 8.1097C16.7869 6.4897 14.4869 5.5197 11.9999 5.5197C9.3599 5.5197 7.0799 6.5497 5.2599 8.2497L2.8199 6.3697C3.1599 5.9197 4.0999 5.0497 5.2499 4.3897C6.3999 3.7297 7.9199 3.4797 9.1799 3.4797C10.7499 3.4797 12.0099 3.9297 13.0499 4.7997L14.4599 6.0997C15.2499 6.7797 15.7799 7.6297 15.8999 8.3997L14.4599 9.8797C13.7899 9.5397 12.9399 9.1897 11.9999 9.18002Z" fill="#4285F4"/>
                <path d="M12.0003 14.28C11.1903 14.28 10.4303 14.15 9.77031 13.88L6.46031 16.51C8.08031 17.61 10.0503 18.24 12.0003 18.24C14.0703 18.24 16.0303 17.51 17.5403 16.14L14.7703 13.84C13.9103 14.18 12.9803 14.28 12.0003 14.28Z" fill="#FBBC04"/>
            </svg>
            Sign in with Google
        </Button>
          
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            disabled={loading}
            className="mt-6"
          >
            {loading ? "Signing in..." : "Next"}
          </Button>

          <div className="pt-2 text-sm">
             <Link 
                to="/forgot-password" 
                className="font-medium text-pink hover:text-pink/80 transition-colors"
             >
                Forgot Password?
             </Link>
          </div>
        </form>
        
      </div>
    </div>
  );
};