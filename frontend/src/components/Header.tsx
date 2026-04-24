import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "./Button";
import { useState, useRef, useEffect } from "react";

interface HeaderProps {
  showBack?: boolean;
}

export const Header = ({ showBack = false }: HeaderProps) => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  const handleLogout = async () => {
    await logout();
    setIsDropdownOpen(false);
  };

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      navigate(`/?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-black text-white shadow-lg border-b border-gray mx-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left Section - Back arrow or Search */}
          <div className="flex-1 flex items-center gap-4">
            {showBack ? (
              <button
                onClick={() => navigate(-1)}
                className="text-white hover:text-pink transition-colors text-xl leading-none"
              >
                ←
              </button>
            ) : (
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearch}
                placeholder="Search"
                className="bg-transparent border border-gray rounded-full px-3 py-1 text-sm text-white placeholder-gray w-40 focus:outline-none focus:border-pink transition-colors"
              />
            )}
          </div>

          {/* Center Section - Site Name */}
          <div className="flex-1 flex justify-center">
            <Link to="/" className="text-3xl font-family-impact font-bold tracking-tight hover:text-pink transition-colors uppercase">
              pollsite
            </Link>
          </div>

          {/* Right Section - Create Button + User Info */}
          <div className="flex-1 flex items-center justify-end space-x-6">
            {isAuthenticated && (
              <Link to="/create">
                <Button variant="outline" size="sm">
                  Create
                </Button>
              </Link>
            )}

            {isAuthenticated ? (
              <div className="flex items-center space-x-3 relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
                >
                  <div className="w-8 h-8 bg-pink rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-white">
                      {user?.username?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm font-medium hidden sm:block">
                    {user?.username}
                  </span>
                </button>

                {isDropdownOpen && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-black border-2 border-pink rounded-2xl shadow-lg py-2 z-50">
                    <Link
                      to={`/user/${user?.username}`}
                      onClick={() => setIsDropdownOpen(false)}
                      className="block px-4 py-2 text-white hover:bg-pink hover:text-black transition-colors"
                    >
                      Account
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-white hover:bg-pink hover:text-black transition-colors"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="text-white hover:bg-gray">
                    Login
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button variant="outline" size="sm" className="border-white text-white hover:bg-white hover:text-black">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
