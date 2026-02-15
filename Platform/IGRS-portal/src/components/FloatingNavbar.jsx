import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { ArrowRight, Menu, X } from "lucide-react";

const FloatingNavbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-white/95 backdrop-blur-md shadow-md border-b border-gray-200"
          : "bg-gradient-to-r from-amber-50 via-orange-50 to-yellow-50 border-b border-gray-200"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center space-x-3">
            <img src="/logo.png" alt="IGRS logo" className="h-10 w-10 rounded-lg object-cover" />
            <div>
              <h1 className="font-black text-black text-xl">IGRS</h1>
              <p className="text-xs font-bold text-gray-700">Intelligent Grievance Redressal System</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-gray-700 hover:text-black transition-colors font-bold">
              Features
            </a>
            <a href="#statistics" className="text-gray-700 hover:text-black transition-colors font-bold">
              Statistics
            </a>
            <a href="#about" className="text-gray-700 hover:text-black transition-colors font-bold">
              About
            </a>
          </div>

          {/* Desktop Buttons */}
          <div className="hidden md:flex items-center space-x-3">
            <Button 
              variant="outline" 
              size="sm" 
              className="text-sm font-bold border-2 border-black text-black hover:bg-black hover:text-white" 
              onClick={() => window.location.href = '/citizen-portal/authentication'}
            >
              Citizen Portal
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
            <Button 
              size="sm" 
              className="bg-black hover:bg-gray-800 text-white font-bold text-sm" 
              onClick={() => window.location.href = '/officials-portal/authentication'}
            >
              Officials Portal
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-black hover:text-gray-700"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <div className="flex flex-col space-y-4">
              <a href="#features" className="text-gray-700 hover:text-black transition-colors font-bold">
                Features
              </a>
              <a href="#statistics" className="text-gray-700 hover:text-black transition-colors font-bold">
                Statistics
              </a>
              <a href="#about" className="text-gray-700 hover:text-black transition-colors font-bold">
                About
              </a>
              <div className="flex flex-col space-y-2 pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-center text-sm font-bold border-2 border-black text-black hover:bg-black hover:text-white" 
                  onClick={() => window.location.href = '/citizen-portal/authentication'}
                >
                  Citizen Portal
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
                <Button 
                  size="sm" 
                  className="w-full justify-center bg-black hover:bg-gray-800 text-white font-bold text-sm" 
                  onClick={() => window.location.href = '/officials-portal/authentication'}
                >
                  Officials Portal
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default FloatingNavbar;
