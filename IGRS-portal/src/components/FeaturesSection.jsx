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
    description: "Submit grievances anytime, anywhere with photos and location",
    color: "text-blue-600",
    bgColor: "bg-blue-50"
  },
  {
    icon: Search,
    title: "Real-time Tracking",
    description: "Track your grievance status with live updates and timeline",
    color: "text-green-600",
    bgColor: "bg-green-50"
  },
  {
    icon: Bot,
    title: "Smart Chatbot",
    description: "Get instant answers about your grievance status 24/7",
    color: "text-purple-600",
    bgColor: "bg-purple-50"
  },
  {
    icon: BarChart,
    title: "Community Dashboard",
    description: "View resolved issues and community impact in your area",
    color: "text-orange-600",
    bgColor: "bg-orange-50"
  },
  {
    icon: Megaphone,
    title: "Voice Your Opinion",
    description: "Participate in polls and surveys for better governance",
    color: "text-pink-600",
    bgColor: "bg-pink-50"
  },
  {
    icon: Star,
    title: "Feedback System",
    description: "Rate and review the resolution process",
    color: "text-yellow-600",
    bgColor: "bg-yellow-50"
  },
  {
    icon: Bell,
    title: "Smart Notifications",
    description: "Get timely updates at every step of resolution",
    color: "text-indigo-600",
    bgColor: "bg-indigo-50"
  },
  {
    icon: Users,
    title: "Community Support",
    description: "Connect with others facing similar issues",
    color: "text-teal-600",
    bgColor: "bg-teal-50"
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
    <section ref={sectionRef} id="features" className="relative py-24 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div 
          className={`text-center mb-16 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="inline-flex items-center space-x-2 bg-white/80 text-black rounded-full px-5 py-2.5 text-sm font-bold mb-6 border border-gray-200 backdrop-blur-sm">
            <CheckCircle className="h-4 w-4" />
            <span>Platform Features</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-black mb-6">
            Everything You Need for{" "}
            <span className="text-gray-700 font-black">
              Effective Governance
            </span>
          </h2>
          <p className="text-xl text-gray-700 font-bold max-w-3xl mx-auto">
            Our AI-powered platform provides comprehensive tools for citizens and officials 
            to ensure transparent, efficient grievance resolution.
          </p>
        </div>

        {/* Features Grid */}
        <div 
          className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
          style={{ transitionDelay: '200ms' }}
        >
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <div 
                key={index}
                className={`bg-white/80 p-8 rounded-xl border border-gray-200 hover:border-black hover:bg-white backdrop-blur-sm transition-all duration-300 ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                }`}
                style={{ 
                  transitionDelay: `${300 + (index * 100)}ms`,
                  animationDelay: `${index * 0.1}s` 
                }}
              >
                <div className="inline-flex p-3 rounded-lg bg-black mb-4">
                  <IconComponent className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-bold text-black mb-2 text-lg">{feature.title}</h3>
                <p className="text-gray-700 font-semibold text-sm leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </div>

        {/* Call to Action */}
        <div 
          className={`text-center bg-white/80 rounded-2xl p-12 border border-gray-200 backdrop-blur-sm transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
          style={{ transitionDelay: '1000ms' }}
        >
          <h3 className="text-3xl font-black text-black mb-4">
            Ready to Experience the Future of Governance?
          </h3>
          <p className="text-gray-700 font-bold mb-8 max-w-2xl mx-auto">
            Join thousands of citizens and officials already using our platform 
            to create transparent, efficient governance solutions.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              className="bg-black hover:bg-gray-800 text-white font-bold px-8 py-6 text-lg rounded-lg group transition-all duration-300 shadow-lg" 
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
