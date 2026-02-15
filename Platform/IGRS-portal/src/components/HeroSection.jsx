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

  const handleCitizenClick = async () => {
    if (loading) return;
    if (user) {
      const profile = await getCurrentProfile();
      navigate("/citizen-portal/dashboard");
    } else {
      navigate("/citizen-portal/authentication");
    }
  };

  const handleOfficialClick = async () => {
    if (loading) return;
    if (user) {
      const profile = await getCurrentProfile();
      navigate("/officials-portal/dashboard");
    } else {
      navigate("/officials-portal/authentication");
    }
  };

  return (
    <section ref={sectionRef} className="relative min-h-screen flex items-center justify-center overflow-hidden pt-24 pb-20">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50" />
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgb(120 113 108 / 0.15) 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
        {/* Trust Badge */}
        <div 
          className={`inline-flex items-center space-x-2 bg-white/80 backdrop-blur-sm text-gray-900 rounded-full px-6 py-3 text-sm font-bold mb-8 border-2 border-gray-900 shadow-lg transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
          }`}
          style={{ transitionDelay: '200ms' }}
        >
          <CheckCircle2 className="h-5 w-5" />
          <span>Trusted by 1M+ Citizens Nationwide</span>
        </div>

        {/* Main Heading */}
        <h1 
          className={`text-5xl md:text-7xl font-black text-gray-900 mb-6 leading-tight transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
          style={{ transitionDelay: '400ms' }}
        >
          Intelligent Grievance
          <br />
          <span className="text-gray-900">Redressal System</span>
        </h1>

        {/* Subtitle */}
        <p 
          className={`text-xl md:text-2xl text-gray-700 font-semibold mb-12 max-w-3xl mx-auto leading-relaxed transition-all duration-700 ${
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
            <div className="text-4xl font-black text-gray-900 mb-1">12,345</div>
            <div className="text-sm text-gray-700 font-bold">Total Grievances</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-black text-gray-900 mb-1">10,890</div>
            <div className="text-sm text-gray-700 font-bold">Resolved Cases</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-black text-gray-900 mb-1">48h</div>
            <div className="text-sm text-gray-700 font-bold">Avg Resolution Time</div>
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
            className="bg-gray-900 hover:bg-gray-800 text-white px-10 py-7 text-lg font-bold rounded-xl group transition-all duration-300 shadow-2xl hover:shadow-3xl border-2 border-gray-900" 
            onClick={handleCitizenClick}
          >
            Get Started as Citizen
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform ml-2" />
          </Button>
          <Button 
            variant="outline" 
            className="bg-white hover:bg-gray-50 text-gray-900 px-10 py-7 text-lg font-bold rounded-xl group transition-all duration-300 border-2 border-gray-900 shadow-xl hover:shadow-2xl" 
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
          <div className="text-center p-6 bg-white/60 backdrop-blur-sm rounded-2xl border-2 border-gray-900 shadow-lg">
            <div className="w-14 h-14 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-7 w-7 text-white" />
            </div>
            <h3 className="font-black text-gray-900 mb-2 text-lg">Easy Submission</h3>
            <p className="text-gray-700 font-semibold">Submit grievances anytime with photos and location</p>
          </div>
          <div className="text-center p-6 bg-white/60 backdrop-blur-sm rounded-2xl border-2 border-gray-900 shadow-lg">
            <div className="w-14 h-14 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-7 w-7 text-white" />
            </div>
            <h3 className="font-black text-gray-900 mb-2 text-lg">Real-time Tracking</h3>
            <p className="text-gray-700 font-semibold">Track status with live updates and timeline</p>
          </div>
          <div className="text-center p-6 bg-white/60 backdrop-blur-sm rounded-2xl border-2 border-gray-900 shadow-lg">
            <div className="w-14 h-14 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-7 w-7 text-white" />
            </div>
            <h3 className="font-black text-gray-900 mb-2 text-lg">AI-Powered</h3>
            <p className="text-gray-700 font-semibold">Smart routing and instant status updates</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
