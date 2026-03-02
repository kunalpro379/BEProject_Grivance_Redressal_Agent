import { Button } from "./ui/button";
import { ArrowRight, Play, CheckCircle2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const HeroSection = () => {
  const navigate = useNavigate();
  const { user, loading, getCurrentProfile } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleCitizenClick = () => {
    if (loading) return;
    if (user && user.role === 'citizen') {
      // Already logged in as citizen, go to their dashboard
      navigate(`/citizen/${user.id}/dashboard`);
    } else {
      // Not logged in or is official, go to auth page
      navigate("/citizen-portal/authentication");
    }
  };

  const handleOfficialClick = () => {
    if (loading) return;
    if (user && user.role !== 'citizen') {
      // Already logged in as official, go to their dashboard
      navigate(`/government/${user.id}/dashboard`);
    } else {
      // Not logged in or is citizen, go to auth page
      navigate("/officials-portal/authentication");
    }
  };

  return (
    <section ref={sectionRef} className="relative min-h-screen flex items-center justify-center overflow-hidden pt-24 pb-20">
      {/* Smooth cream gradient background */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-yellow-50 via-amber-50 to-yellow-100" />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
        {/* Trust Badge */}
        <div 
          className={`inline-flex items-center space-x-2 bg-gradient-to-r from-yellow-300 to-yellow-400 text-black rounded-full px-6 py-3 text-sm font-bold mb-8 shadow-lg transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
          }`}
          style={{ transitionDelay: '200ms' }}
        >
          <CheckCircle2 className="h-5 w-5" />
          <span>Trusted by 1M+ Citizens Nationwide</span>
        </div>

        {/* Main Heading */}
        <h1 
          className={`text-5xl md:text-7xl font-black text-black mb-6 leading-tight transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
          style={{ transitionDelay: '400ms' }}
        >
          Intelligent Grievance
          <br />
          <span className="bg-gradient-to-r from-yellow-500 to-yellow-600 bg-clip-text text-transparent">Redressal System</span>
        </h1>

        {/* Subtitle */}
        <p 
          className={`text-xl md:text-2xl text-gray-800 font-semibold mb-12 max-w-3xl mx-auto leading-relaxed transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
          style={{ transitionDelay: '600ms' }}
        >
          AI-powered platform for transparent and efficient governance. 
          Submit, track, and resolve citizen grievances seamlessly.
        </p>

        {/* Statistics Row */}
        <div 
          className={`flex flex-wrap justify-center gap-12 mb-12 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
          style={{ transitionDelay: '800ms' }}
        >
          <div className="text-center">
            <div className="text-4xl font-black bg-gradient-to-r from-yellow-500 to-yellow-600 bg-clip-text text-transparent mb-1">12,345</div>
            <div className="text-sm text-gray-800 font-bold">Total Grievances</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-black bg-gradient-to-r from-yellow-500 to-yellow-600 bg-clip-text text-transparent mb-1">10,890</div>
            <div className="text-sm text-gray-800 font-bold">Resolved Cases</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-black bg-gradient-to-r from-yellow-500 to-yellow-600 bg-clip-text text-transparent mb-1">48h</div>
            <div className="text-sm text-gray-800 font-bold">Avg Resolution Time</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div 
          className={`flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
          style={{ transitionDelay: '1000ms' }}
        >
          <Button 
            className="bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black px-10 py-7 text-lg font-bold rounded-xl group transition-all duration-300 shadow-2xl hover:shadow-3xl" 
            onClick={handleCitizenClick}
          >
            Get Started as Citizen
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform ml-2" />
          </Button>
          <Button 
            variant="outline" 
            className="bg-white hover:bg-gray-50 text-black px-10 py-7 text-lg font-bold rounded-xl group transition-all duration-300 border-2 border-black shadow-xl hover:shadow-2xl" 
            onClick={handleOfficialClick}
          >
            <Play className="h-5 w-5 mr-2" />
            Access Officials Portal
          </Button>
        </div>

        {/* Key Features */}
        <div 
          className={`grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
          style={{ transitionDelay: '1200ms' }}
        >
          <div className="text-center p-6 bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-gray-900 shadow-lg">
            <div className="w-14 h-14 bg-gradient-to-br from-yellow-300 to-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-7 w-7 text-black" />
            </div>
            <h3 className="font-black text-black mb-2 text-lg">Easy Submission</h3>
            <p className="text-gray-800 font-semibold">Submit grievances anytime with photos and location</p>
          </div>
          <div className="text-center p-6 bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-gray-900 shadow-lg">
            <div className="w-14 h-14 bg-gradient-to-br from-yellow-300 to-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-7 w-7 text-black" />
            </div>
            <h3 className="font-black text-black mb-2 text-lg">Real-time Tracking</h3>
            <p className="text-gray-800 font-semibold">Track status with live updates and timeline</p>
          </div>
          <div className="text-center p-6 bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-gray-900 shadow-lg">
            <div className="w-14 h-14 bg-gradient-to-br from-yellow-300 to-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-7 w-7 text-black" />
            </div>
            <h3 className="font-black text-black mb-2 text-lg">AI-Powered</h3>
            <p className="text-gray-800 font-semibold">Smart routing and instant status updates</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
