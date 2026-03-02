import { Button } from "./ui/button";
import { ArrowRight, Mail, Phone, MapPin, Facebook, Twitter, Linkedin } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-black text-white py-16">
      <div className="max-w-7xl mx-auto px-6">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-3 mb-6">
              <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center">
                <span className="text-black font-black">GS</span>
              </div>
              <div>
                <h3 className="font-black text-xl text-white">Grievance System</h3>
                <p className="text-gray-300 font-bold text-sm">Public Grievance Portal</p>
              </div>
            </div>
            <p className="text-gray-300 font-bold mb-6 max-w-md leading-relaxed">
              AI-powered citizen grievance resolution platform for transparent and efficient governance. 
              Empowering citizens and officials to build better communities together.
            </p>
            <div className="flex space-x-4">
              <button className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center transition-colors">
                <Facebook className="h-5 w-5 text-white" />
              </button>
              <button className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center transition-colors">
                <Twitter className="h-5 w-5 text-white" />
              </button>
              <button className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center transition-colors">
                <Linkedin className="h-5 w-5 text-white" />
              </button>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-black text-white text-lg mb-6">Quick Links</h4>
            <ul className="space-y-3">
              <li><a href="#features" className="text-gray-300 font-bold hover:text-white transition-colors">Platform Features</a></li>
              <li><a href="#statistics" className="text-gray-300 font-bold hover:text-white transition-colors">Impact & Statistics</a></li>
              <li><a href="#" className="text-gray-300 font-bold hover:text-white transition-colors">How It Works</a></li>
              <li><a href="#" className="text-gray-300 font-bold hover:text-white transition-colors">Success Stories</a></li>
              <li><a href="#" className="text-gray-300 font-bold hover:text-white transition-colors">Help & Support</a></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="font-black text-white text-lg mb-6">Contact Us</h4>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-white" />
                <span className="text-gray-300 font-bold">support@grievance.gov.in</span>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-white" />
                <span className="text-gray-300 font-bold">+91 1800-XXX-XXXX</span>
              </div>
              <div className="flex items-center space-x-3">
                <MapPin className="h-5 w-5 text-white" />
                <span className="text-gray-300 font-bold">Government Secretariat, UP</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="text-gray-300 font-bold text-sm mb-4 md:mb-0">
              © 2024 Grievance System. All rights reserved. | Government of Uttar Pradesh
            </div>
            <div className="flex space-x-6 text-sm">
              <a href="#" className="text-gray-300 font-bold hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="text-gray-300 font-bold hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="text-gray-300 font-bold hover:text-white transition-colors">Accessibility</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
