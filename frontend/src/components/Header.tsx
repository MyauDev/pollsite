import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "./Button";

export const Header = () => {
   const { user, isAuthenticated, logout } = useAuth();

   return (
      <header className="sticky top-0 z-50 bg-black text-white shadow-lg border-b border-gray mx-10">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
               {/* Left Section - Empty for balance */}
               <div className="flex-1"></div>

               {/* Center Section - Site Name */}
               <div className="flex-1 flex justify-center">
                  <Link to="/" className="text-3xl font-family-impact font-bold tracking-tight hover:text-pink transition-colors uppercase">
                     Senya huesos
                  </Link>
               </div>

               {/* Right Section - Create Button + User Info */}
               <div className="flex-1 flex items-center justify-end space-x-6">
                  {isAuthenticated && (
                     <Link to="/polls/create">
                        <Button variant="primary" size="sm">
                           Create
                        </Button>
                     </Link>
                  )}

                  {isAuthenticated ? (
                     <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                           <div className="w-8 h-8 bg-pink rounded-full flex items-center justify-center">
                              <span className="text-sm font-semibold text-white">
                                 {user?.username?.charAt(0).toUpperCase()}
                              </span>
                           </div>
                           <span className="text-sm font-medium hidden sm:block">
                              {user?.username}
                           </span>
                        </div>

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
