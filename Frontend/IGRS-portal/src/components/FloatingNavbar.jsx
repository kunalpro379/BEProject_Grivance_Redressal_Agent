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
      className={`fixed left-1/2 -translate-x-1/2 z-50 transition-all duration-500 top-4 w-[96%] md:w-[90%] max-w-7xl ${
        isScrolled
          ? "bg-black/90 backdrop-blur-md shadow-2xl border border-gray-700"
          : "bg-black/80 backdrop-blur-sm shadow-xl border border-gray-700"
      } px-4 md:px-6 py-3 rounded-2xl`}
    >
      <div className="flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <img src="/logo.png" alt="IGRS logo" className="h-8 w-8 rounded-lg object-cover" />
          <h1 className="font-semibold text-white text-lg">IGRS</h1>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-6">
          <a href="#features" className="text-gray-200 hover:text-white transition-colors">
            Features
          </a>
          <a href="#statistics" className="text-gray-200 hover:text-white transition-colors">
            Statistics
          </a>
          <a href="#about" className="text-gray-200 hover:text-white transition-colors">
            About
          </a>
        </div>

        {/* Desktop Buttons */}
        <div className="hidden md:flex items-center space-x-3">
          <Button variant="outline" size="sm" className="text-sm border-gray-600 text-gray-200 hover:text-white" onClick={() => window.location.href = '/citizen-portal/auth'}>
            Citizen Portal
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
          <Button size="sm" className="bg-yellow-500 hover:bg-yellow-600 text-white text-sm" onClick={() => window.location.href = '/officials-portal/login'}>
            Officials Portal
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 text-gray-200 hover:text-white"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden mt-4 pt-4 border-t border-gray-700">
          <div className="flex flex-col space-y-4">
            <a href="#features" className="text-gray-200 hover:text-white transition-colors">
              Features
            </a>
            <a href="#statistics" className="text-gray-200 hover:text-white transition-colors">
              Statistics
            </a>
            <a href="#about" className="text-gray-200 hover:text-white transition-colors">
              About
            </a>
            <div className="flex flex-col space-y-2 pt-2">
              <Button variant="outline" size="sm" className="w-full justify-center text-sm border-gray-600 text-gray-200 hover:text-white" onClick={() => window.location.href = '/citizen-portal/auth'}>
                Citizen Portal
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
              <Button size="sm" className="w-full justify-center bg-yellow-500 hover:bg-yellow-600 text-white text-sm" onClick={() => window.location.href = '/officials-portal/login'}>
                Officials Portal
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default FloatingNavbar;
