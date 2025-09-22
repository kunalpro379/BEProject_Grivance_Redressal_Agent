import { TrendingUp, Clock, Users, CheckCircle, Award, Target } from "lucide-react";
import dashboardPreview from "../assets/dashboard-preview.jpg";

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
    <section id="statistics" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center space-x-2 bg-green-100 text-green-800 rounded-full px-4 py-2 text-sm font-medium mb-6">
            <TrendingUp className="h-4 w-4" />
            <span>Platform Impact</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Driving Real{" "}
            <span className="bg-gradient-to-r from-green-500 to-green-600 bg-clip-text text-transparent">
              Impact & Results
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Our platform has transformed how citizens and officials interact, 
            creating a more transparent and efficient governance system.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Statistics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {statistics.map((stat, index) => {
              const IconComponent = stat.icon;
              return (
                <div 
                  key={index}
                  className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl hover:scale-105 transition-all duration-300"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="inline-flex p-2 rounded-lg bg-yellow-100 text-yellow-600">
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <div className={`flex items-center text-sm font-medium ${
                      stat.trendUp ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      <TrendingUp className="h-4 w-4 mr-1" />
                      {stat.trend}
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-1">{stat.number}</div>
                  <div className="text-sm font-medium text-gray-600 mb-1">{stat.label}</div>
                  <div className="text-xs text-gray-500">{stat.description}</div>
                </div>
              );
            })}
          </div>

          {/* Dashboard Preview */}
          <div className="relative">
            <div className="relative rounded-3xl overflow-hidden shadow-xl border border-gray-200 bg-white p-2">
              <img 
                src={dashboardPreview} 
                alt="Dashboard preview showing analytics and charts" 
                className="w-full h-auto rounded-2xl"
              />
              {/* Overlay Elements */}
              <div className="absolute top-6 left-6 bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-gray-900">Live Dashboard</span>
                </div>
                <div className="text-xs text-gray-600 mt-1">Real-time updates</div>
              </div>
              
              <div className="absolute bottom-6 right-6 bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-gray-200">
                <div className="text-2xl font-bold text-green-600">98.5%</div>
                <div className="text-xs text-gray-600">Resolution Rate</div>
              </div>
            </div>

            {/* Floating Cards */}
            <div className="absolute -top-4 -right-4 bg-yellow-500 text-white p-4 rounded-2xl shadow-xl animate-bounce">
              <div className="text-2xl font-bold">24/7</div>
              <div className="text-xs opacity-90">Active Monitoring</div>
            </div>
            
            <div className="absolute -bottom-4 -left-4 bg-green-500 text-white p-4 rounded-2xl shadow-xl animate-bounce" style={{ animationDelay: '3s' }}>
              <div className="text-2xl font-bold">AI</div>
              <div className="text-xs opacity-90">Powered</div>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <p className="text-gray-600 mb-4">
            Join the digital governance revolution today
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <div className="bg-white px-4 py-2 rounded-full text-sm font-medium text-gray-900 shadow-lg border border-gray-200">
              🏛️ Government Approved
            </div>
            <div className="bg-white px-4 py-2 rounded-full text-sm font-medium text-gray-900 shadow-lg border border-gray-200">
              🔐 Secure & Private
            </div>
            <div className="bg-white px-4 py-2 rounded-full text-sm font-medium text-gray-900 shadow-lg border border-gray-200">
              🚀 AI-Powered
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StatisticsSection;
