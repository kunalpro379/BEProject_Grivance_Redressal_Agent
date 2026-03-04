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
    <section ref={sectionRef} id="features" className="relative py-24 bg-white">
      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div 
          className={`text-center mb-16 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="inline-flex items-center space-x-2 bg-black text-white rounded-full px-4 py-2 text-xs font-bold mb-5 shadow-lg">
            <CheckCircle className="h-3 w-3" />
            <span>Platform Features</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-black mb-5">
            Everything You Need for{" "}
            <span className="bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent font-black">
              Effective Governance
            </span>
          </h2>
          <p className="text-base text-gray-700 font-bold max-w-3xl mx-auto">
            Our AI-powered platform provides comprehensive tools for citizens and officials 
            to ensure transparent, efficient grievance resolution.
          </p>
        </div>

        {/* Features - No Cards, Black & White Theme */}
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
                <div className="inline-flex p-3 rounded-full bg-black mb-3 shadow-xl">
                  <IconComponent className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-black text-black mb-2 text-lg">{feature.title}</h3>
                <p className="text-gray-700 font-semibold text-sm leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </div>

        {/* Call to Action */}
        <div 
          className={`text-center bg-cream-light rounded-2xl p-12 shadow-2xl border-2 border-cream-dark transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
          style={{ transitionDelay: '1000ms' }}
        >
          <h3 className="text-2xl font-black text-black mb-3">
            Ready to Experience the Future of Governance?
          </h3>
          <p className="text-gray-700 font-bold mb-6 max-w-2xl mx-auto text-sm">
            Join thousands of citizens and officials already using our platform 
            to create transparent, efficient governance solutions.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              className="bg-black hover:bg-gray-800 text-white font-bold px-7 py-5 text-sm rounded-lg group transition-all duration-300 shadow-lg" 
              onClick={() => window.location.href = '/citizen-portal/authentication'}
            >
              Get Started as Citizen
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform ml-2" />
            </Button>
            <Button 
              variant="outline" 
              className="px-7 py-5 text-sm font-bold rounded-lg transition-all duration-300 border-2 border-black text-black hover:bg-black hover:text-white" 
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
