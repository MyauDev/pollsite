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
    <div className="min-h-screen flex flex-col items-center justify-center bg-black py-12">
      {/* Header and Google Button Section */}
      <div className="max-w-xs w-full text-center space-y-6 px-4 sm:px-6 lg:px-8">

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

        {/* Google Sign In Button */}
        <Button
          variant="outline"
          size="md"
          fullWidth
          onClick={handleGoogleSignIn}
          className="border-white/50 text-white hover:bg-white/10 hover:text-white flex justify-center items-center"
        >
          Sign in with Google
        </Button>
      </div>

      {/* OR Divider - Full Width */}
      <div className="w-full flex items-center space-x-3 my-6 px-4 sm:px-6 lg:px-8">
        <div className="flex-grow border-t border-pink" />
        <span className="text-white text-sm font-medium bg-black px-4">OR</span>
        <div className="flex-grow border-t border-pink" />
      </div>

      {/* Form Section */}
      <div className="max-w-xs w-full px-4 sm:px-6 lg:px-8">
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