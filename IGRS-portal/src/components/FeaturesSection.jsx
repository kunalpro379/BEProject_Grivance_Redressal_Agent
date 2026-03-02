import { Button } from "./ui/button";
import { 
  Smartphone, 
  Search, 
  Bot, 
  BarChart, 
  Megaphone, 
  Star, 
  Bell, 
  Users,
  ArrowRight,
  CheckCircle
} from "lucide-react";
import { useState, useEffect, useRef } from "react";

const features = [
  {
    icon: Smartphone,
    title: "Easy Submission",
    description: "Submit grievances anytime with photos and location"
  },
  {
    icon: Search,
    title: "Real-time Tracking",
    description: "Track status with live updates and timeline"
  },
  {
    icon: Bot,
    title: "AI-Powered",
    description: "Smart routing and instant status updates"
  }
];

const FeaturesSection = () => {
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

  return (
    <section ref={sectionRef} id="features" className="relative py-24 bg-gradient-to-br from-amber-50 via-yellow-50 to-yellow-100">
      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div 
          className={`text-center mb-16 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-yellow-300 to-yellow-400 text-black rounded-full px-5 py-2.5 text-sm font-bold mb-6 shadow-lg">
            <CheckCircle className="h-4 w-4" />
            <span>Platform Features</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-black mb-6">
            Everything You Need for{" "}
            <span className="bg-gradient-to-r from-yellow-500 to-yellow-600 bg-clip-text text-transparent font-black">
              Effective Governance
            </span>
          </h2>
          <p className="text-xl text-gray-800 font-bold max-w-3xl mx-auto">
            Our AI-powered platform provides comprehensive tools for citizens and officials 
            to ensure transparent, efficient grievance resolution.
          </p>
        </div>

        {/* Features - No Cards, Light Golden Theme */}
        <div 
          className={`flex flex-col md:flex-row items-center justify-center gap-12 mb-16 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
          style={{ transitionDelay: '200ms' }}
        >
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <div 
                key={index}
                className={`flex flex-col items-center text-center max-w-xs transition-all duration-300 ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                }`}
                style={{ 
                  transitionDelay: `${300 + (index * 100)}ms`,
                  animationDelay: `${index * 0.1}s` 
                }}
              >
                <div className="inline-flex p-4 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-400 mb-4 shadow-xl">
                  <IconComponent className="h-8 w-8 text-black" />
                </div>
                <h3 className="font-black text-black mb-2 text-xl">{feature.title}</h3>
                <p className="text-gray-800 font-semibold text-base leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </div>

        {/* Call to Action */}
        <div 
          className={`text-center bg-white rounded-2xl p-12 shadow-2xl border border-gray-200 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
          style={{ transitionDelay: '1000ms' }}
        >
          <h3 className="text-3xl font-black text-black mb-4">
            Ready to Experience the Future of Governance?
          </h3>
          <p className="text-gray-800 font-bold mb-8 max-w-2xl mx-auto">
            Join thousands of citizens and officials already using our platform 
            to create transparent, efficient governance solutions.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              className="bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-bold px-8 py-6 text-lg rounded-lg group transition-all duration-300 shadow-lg" 
              onClick={() => window.location.href = '/citizen-portal/authentication'}
            >
              Get Started as Citizen
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform ml-2" />
            </Button>
            <Button 
              variant="outline" 
              className="px-8 py-6 text-lg font-bold rounded-lg transition-all duration-300 border-2 border-black text-black hover:bg-black hover:text-white" 
              onClick={() => window.location.href = '/officials-portal/authentication'}
            >
              Access Officials Portal
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
