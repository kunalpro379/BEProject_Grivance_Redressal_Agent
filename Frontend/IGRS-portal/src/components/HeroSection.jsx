import { Button } from "./ui/button";
import { ArrowRight, Play, Star, HelpCircle } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const HeroSection = () => {
  const navigate = useNavigate();
  const { user, loading, getCurrentProfile } = useAuth();
  const [isMarathi, setIsMarathi] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const logoRef = useRef(null);
  const sectionRef = useRef(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsMarathi(prev => !prev);
    }, 4000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      observer.disconnect();
    };
  }, []);

  const content = {
    english: {
      trustBadge: "Trusted by 1M+ Citizens",
      mainTitle: "Ready to Experience the Future of Governance?",
      subtitle: "Join thousands of citizens and officials already using our platform to create transparent, efficient governance solutions.",
      description: "AI-powered citizen grievance resolution platform for transparent and efficient governance",
      totalGrievances: "Total Grievances",
      resolvedCases: "Resolved Cases", 
      avgTime: "Avg Resolution Time"
    },
    marathi: {
      trustBadge: "१० लाख+ नागरिकांचा विश्वास",
      mainTitle: "तक्रार निवारणासाठी स्मार्ट प्रणाली",
      subtitle: "****", 
      description: "पारदर्शी आणि कार्यक्षम प्रशासनासाठी एआय-संचालित नागरिक तक्रार निराकरण व्यासपीठ",
      totalGrievances: "एकूण तक्रारी",
      resolvedCases: "सोडवलेली प्रकरणे",
      avgTime: "सरासरी निराकरण वेळ"
    }
  };

  const currentContent = isMarathi ? content.marathi : content.english;

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
    <>
      <section ref={sectionRef} className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20 md:pt-24">
      {/* Indian flag inspired gradient with fine white grid */}
      <div className="absolute inset-0 z-0">
        {/* Soft tri-color gradient (saffron → white → green) */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,153,51,0.32) 0%, rgba(255,255,255,0.86) 45%, rgba(19,136,8,0.32) 100%)",
          }}
        />
        {/* Dense white grid overlay (more visible) */}
        <div
          className="absolute inset-0 opacity-90"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(255,255,255,0.36) 0, rgba(255,255,255,0.36) 2px, transparent 2px, transparent 16px), repeating-linear-gradient(90deg, rgba(255,255,255,0.36) 0, rgba(255,255,255,0.36) 2px, transparent 2px, transparent 16px)",
            backgroundSize: "16px 16px, 16px 16px",
          }}
        />
        {/* Vignette for depth */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/0 to-black/10" />
      </div>

      {/* Floating Elements with scroll-based animation */}
      <div 
        className="absolute top-20 left-10 opacity-30 animate-bounce"
        style={{ transform: `translateY(${scrollY * 0.1}px)` }}
      >
        <div className="w-16 h-16 bg-yellow-400/40 rounded-full blur-xl"></div>
      </div>
      <div 
        className="absolute bottom-32 right-16 opacity-30 animate-bounce" 
        style={{ 
          animationDelay: '2s',
          transform: `translateY(${-scrollY * 0.1}px)`
        }}
      >
        <div className="w-24 h-24 bg-green-400/40 rounded-full blur-xl"></div>
      </div>
      <div 
        className="absolute top-1/3 right-20 opacity-30 animate-bounce" 
        style={{ 
          animationDelay: '4s',
          transform: `translateX(${scrollY * 0.05}px)`
        }}
      >
        <div className="w-12 h-12 bg-orange-400/40 rounded-full blur-xl"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">

        {/* Trust Badge with scroll animation */}
        <div 
          className={`inline-flex items-center space-x-2 bg-yellow-100 text-yellow-800 rounded-full px-4 py-2 text-sm font-semibold mb-8 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
          }`}
          style={{ transitionDelay: '200ms' }}
        >
          <Star className="h-4 w-4 fill-current" />
          <span className="transition-all duration-500">{currentContent.trustBadge}</span>
        </div>

        {/* Main Heading with scroll animation */}
        <h1 
          className={`text-4xl md:text-6xl font-bold text-gray-900 mb-6 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
          style={{ transitionDelay: '400ms' }}
        >
          <span className="bg-gradient-to-r from-yellow-500 to-yellow-600 bg-clip-text text-transparent transition-all duration-500">
            {currentContent.mainTitle}
          </span>
        </h1>

        {/* Question Marks with animation */}
        <div 
          className={`flex justify-center items-center gap-2 mb-4 transition-all duration-700 ${
            isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
          }`}
          style={{ transitionDelay: '600ms' }}
        >
          <HelpCircle className="w-8 h-8 text-yellow-600 animate-bounce" style={{ animationDelay: '0s' }} />
          <HelpCircle className="w-8 h-8 text-yellow-600 animate-bounce" style={{ animationDelay: '0.2s' }} />
        </div>

        {/* Subtitle with scroll animation */}
        <p 
          className={`text-xs md:text-sm text-gray-600 mb-8 max-w-4xl mx-auto transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
          style={{ transitionDelay: '800ms' }}
        >
          {isMarathi ? (
            <span dangerouslySetInnerHTML={{ __html: currentContent.subtitle.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold">$1</strong>') }} />
          ) : (
            currentContent.subtitle
          )}
        </p>

        {/* Statistics Row with scroll animation */}
        <div 
          className={`flex flex-wrap justify-center gap-8 mb-12 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
          style={{ transitionDelay: '1000ms' }}
        >
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-600">12,345</div>
            <div className="text-sm text-gray-600 transition-all duration-500">{currentContent.totalGrievances}</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">10,890</div>
            <div className="text-sm text-gray-600 transition-all duration-500">{currentContent.resolvedCases}</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600">48h</div>
            <div className="text-sm text-gray-600 transition-all duration-500">{currentContent.avgTime}</div>
          </div>
        </div>

        {/* Action Buttons with scroll animation */}
        <div 
          className={`flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
          style={{ transitionDelay: '1200ms' }}
        >
          <Button className="bg-yellow-500 hover:bg-yellow-600 text-white px-8 py-4 text-lg rounded-xl group hover:scale-105 transition-all duration-300" onClick={handleCitizenClick}>
            Get Started as Citizen
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform ml-2" />
          </Button>
          <Button variant="outline" className="px-8 py-4 text-lg rounded-xl group hover:scale-105 transition-all duration-300" onClick={handleOfficialClick}>
            <Play className="h-5 w-5 mr-2" />
            Access Officials Portal
          </Button>
        </div>

        {/* Features Preview with scroll animation */}
        <div 
          className={`grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
          style={{ transitionDelay: '1400ms' }}
        >
          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="text-3xl mb-3">📱</div>
            <h3 className="font-semibold text-gray-900 mb-2">Easy Submission</h3>
            <p className="text-sm text-gray-600">Submit grievances anytime, anywhere with photos and location</p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="text-3xl mb-3">🔍</div>
            <h3 className="font-semibold text-gray-900 mb-2">Real-time Tracking</h3>
            <p className="text-sm text-gray-600">Track your grievance status with live updates and timeline</p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="text-3xl mb-3">🤖</div>
            <h3 className="font-semibold text-gray-900 mb-2">Smart AI Assistant</h3>
            <p className="text-sm text-gray-600">Get instant answers about your grievance status 24/7</p>
          </div>
        </div>
      </div>
    </section>
    </>
  );
};

export default HeroSection;
