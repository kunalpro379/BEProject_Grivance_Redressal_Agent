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
import featuresBackground from "../assets/features-background.jpg";
import { useState, useEffect, useRef } from "react";

const features = [
  {
    icon: Smartphone,
    title: "Easy Submission",
    description: "Submit grievances anytime, anywhere with photos and location",
    color: "text-yellow-600"
  },
  {
    icon: Search,
    title: "Real-time Tracking",
    description: "Track your grievance status with live updates and timeline",
    color: "text-green-600"
  },
  {
    icon: Bot,
    title: "Smart Chatbot",
    description: "Get instant answers about your grievance status 24/7",
    color: "text-orange-600"
  },
  {
    icon: BarChart,
    title: "Community Dashboard",
    description: "View resolved issues and community impact in your area",
    color: "text-yellow-600"
  },
  {
    icon: Megaphone,
    title: "Voice Your Opinion",
    description: "Participate in polls and surveys for better governance",
    color: "text-green-600"
  },
  {
    icon: Star,
    title: "Feedback System",
    description: "Rate and review the resolution process",
    color: "text-orange-600"
  },
  {
    icon: Bell,
    title: "Smart Notifications",
    description: "Get timely updates at every step of resolution",
    color: "text-yellow-600"
  },
  {
    icon: Users,
    title: "Community Support",
    description: "Connect with others facing similar issues",
    color: "text-green-600"
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
    <section ref={sectionRef} id="features" className="relative py-20 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <img 
          src={featuresBackground} 
          alt="Digital connectivity pattern" 
          className="w-full h-full object-cover opacity-5"
        />
        {/* Very light grid overlay for section only */}
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: 
              "repeating-linear-gradient(0deg, rgba(148,163,184,0.14) 0, rgba(148,163,184,0.14) 1px, transparent 1px, transparent 24px), repeating-linear-gradient(90deg, rgba(148,163,184,0.14) 0, rgba(148,163,184,0.14) 1px, transparent 1px, transparent 24px)",
            backgroundSize: '24px 24px, 24px 24px'
          }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div 
          className={`text-center mb-16 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="inline-flex items-center space-x-2 bg-green-100 text-green-800 rounded-full px-4 py-2 text-sm font-medium mb-6">
            <CheckCircle className="h-4 w-4" />
            <span>Platform Features</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Everything You Need for{" "}
            <span className="bg-gradient-to-r from-yellow-500 to-yellow-600 bg-clip-text text-transparent">
              Effective Governance
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Our AI-powered platform provides comprehensive tools for citizens and officials 
            to ensure transparent, efficient grievance resolution.
          </p>
        </div>

        {/* Features Grid */}
        <div 
          className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
          style={{ transitionDelay: '200ms' }}
        >
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <div 
                key={index}
                className={`bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl hover:scale-105 transition-all duration-300 group ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                }`}
                style={{ 
                  transitionDelay: `${300 + (index * 100)}ms`,
                  animationDelay: `${index * 0.1}s` 
                }}
              >
                <div className={`inline-flex p-3 rounded-xl bg-gray-50 shadow-sm mb-4 group-hover:scale-110 transition-transform ${feature.color}`}>
                  <IconComponent className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2 text-lg">{feature.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </div>

        {/* Call to Action */}
        <div 
          className={`text-center bg-white/80 backdrop-blur-sm rounded-3xl p-12 shadow-lg border border-gray-200 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
          style={{ transitionDelay: '1000ms' }}
        >
          <h3 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to Experience the Future of Governance?
          </h3>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            Join thousands of citizens and officials already using our platform 
            to create transparent, efficient governance solutions.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button className="bg-yellow-500 hover:bg-yellow-600 text-white px-8 py-4 text-lg rounded-xl group hover:scale-105 transition-all duration-300" onClick={() => window.location.href = '/citizen-portal/auth'}>
              Get Started as Citizen
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform ml-2" />
            </Button>
            <Button variant="outline" className="px-8 py-4 text-lg rounded-xl hover:scale-105 transition-all duration-300" onClick={() => window.location.href = '/officials-portal/login'}>
              Access Officials Portal
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
