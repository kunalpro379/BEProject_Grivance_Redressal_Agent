import { TrendingUp, Clock, Users, CheckCircle, Award, Target } from "lucide-react";

const statistics = [
  {
    icon: Users,
    number: "12,345",
    label: "Total Grievances",
    trend: "+12%",
    trendUp: true,
    description: "Submitted this month"
  },
  {
    icon: CheckCircle,
    number: "10,890",
    label: "Resolved Cases",
    trend: "+8%",
    trendUp: true,
    description: "Successfully resolved"
  },
  {
    icon: Clock,
    number: "48h",
    label: "Avg Resolution Time",
    trend: "-25%",
    trendUp: true,
    description: "Faster than previous month"
  },
  {
    icon: Award,
    number: "94%",
    label: "Satisfaction Rate",
    trend: "+6%",
    trendUp: true,
    description: "Citizen satisfaction"
  },
  {
    icon: Target,
    number: "1M+",
    label: "Citizens Served",
    trend: "+15%",
    trendUp: true,
    description: "Across the platform"
  },
  {
    icon: TrendingUp,
    number: "99.8%",
    label: "Uptime",
    trend: "Stable",
    trendUp: true,
    description: "Platform reliability"
  }
];

const StatisticsSection = () => {
  return (
    <section id="statistics" className="py-24 bg-gradient-to-br from-cream-50 via-white to-cream-100">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center space-x-2 bg-black text-white rounded-full px-4 py-2 text-xs font-bold mb-5 shadow-lg">
            <TrendingUp className="h-3 w-3" />
            <span>Platform Impact</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-black mb-5">
            Driving Real{" "}
            <span className="bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent font-black">
              Impact & Results
            </span>
          </h2>
          <p className="text-base text-gray-700 font-bold max-w-3xl mx-auto">
            Our platform has transformed how citizens and officials interact, 
            creating a more transparent and efficient governance system.
          </p>
        </div>

        {/* Scrolling Stats Row */}
        <div className="mb-12 overflow-hidden">
          <div className="flex gap-6 animate-scroll-vertical">
            {[...statistics, ...statistics].map((stat, index) => {
              const IconComponent = stat.icon;
              return (
                <div 
                  key={index}
                  className="flex-shrink-0 bg-white px-6 py-4 rounded-xl border-2 border-cream-dark hover:border-black hover:shadow-xl transition-all duration-300 flex items-center gap-4 min-w-[300px]"
                >
                  <div className="inline-flex p-2 rounded-lg bg-black text-white">
                    <IconComponent className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="text-2xl font-black text-black">{stat.number}</div>
                      <div className={`flex items-center text-xs font-bold ${
                        stat.trendUp ? 'text-black' : 'text-gray-600'
                      }`}>
                        <TrendingUp className="h-3 w-3 mr-1" />
                        {stat.trend}
                      </div>
                    </div>
                    <div className="text-sm font-bold text-gray-700">{stat.label}</div>
                    <div className="text-xs font-semibold text-gray-600">{stat.description}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Large Dashboard Preview */}
        <div className="relative max-w-6xl mx-auto">
          <div className="relative rounded-2xl overflow-hidden border-2 border-cream-dark bg-white p-4 shadow-2xl">
            <img 
              src="/image.png" 
              alt="Dashboard preview showing analytics and charts" 
              className="w-full h-auto rounded-xl"
            />
            {/* Overlay Elements */}
            <div className="absolute top-8 left-8 bg-white rounded-xl p-5 shadow-xl border-2 border-cream-dark">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-black rounded-full animate-pulse"></div>
                <span className="text-base font-bold text-black">Live Dashboard</span>
              </div>
              <div className="text-sm font-semibold text-gray-700 mt-1">Real-time updates</div>
            </div>
            
            <div className="absolute bottom-8 right-8 bg-white rounded-xl p-5 shadow-xl border-2 border-cream-dark">
              <div className="text-3xl font-black text-black">98.5%</div>
              <div className="text-sm font-bold text-gray-700">Resolution Rate</div>
            </div>
          </div>

          {/* Floating Badges */}
          <div className="absolute -top-6 -right-6 bg-black text-cream border-2 border-cream-dark p-6 rounded-2xl shadow-xl">
            <div className="text-3xl font-black">24/7</div>
            <div className="text-sm font-bold opacity-90">Active Monitoring</div>
          </div>
          
          <div className="absolute -bottom-6 -left-6 bg-black text-cream border-2 border-cream-dark p-6 rounded-2xl shadow-xl">
            <div className="text-3xl font-black">AI</div>
            <div className="text-sm font-bold opacity-90">Powered</div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <p className="text-gray-700 font-bold mb-4">
            Join the digital governance revolution today
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <div className="bg-white px-6 py-3 rounded-full text-sm font-bold text-black border-2 border-cream-dark">
              Government Approved
            </div>
            <div className="bg-white px-6 py-3 rounded-full text-sm font-bold text-black border-2 border-cream-dark">
              Secure & Private
            </div>
            <div className="bg-white px-6 py-3 rounded-full text-sm font-bold text-black border-2 border-cream-dark">
              AI-Powered
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes scroll-vertical {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        
        .animate-scroll-vertical {
          animation: scroll-vertical 30s linear infinite;
        }
        
        .animate-scroll-vertical:hover {
          animation-play-state: paused;
        }
      `}</style>
    </section>
  );
};

export default StatisticsSection;
