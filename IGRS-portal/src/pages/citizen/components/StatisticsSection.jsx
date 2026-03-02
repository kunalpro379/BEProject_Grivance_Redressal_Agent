import { TrendingUp, Clock, Users, CheckCircle, Award, Target } from "lucide-react";
import dashboardPreview from "../../../assets/dashboard-preview.jpg";

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
    <section id="statistics" className="py-24 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center space-x-2 bg-white/80 text-black rounded-full px-5 py-2.5 text-sm font-bold mb-6 border border-gray-200">
            <TrendingUp className="h-4 w-4" />
            <span>Platform Impact</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-black mb-6">
            Driving Real{" "}
            <span className="text-gray-700 font-black">
              Impact & Results
            </span>
          </h2>
          <p className="text-xl text-gray-700 font-bold max-w-3xl mx-auto">
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
                  className="bg-white/80 p-8 rounded-xl border border-gray-200 hover:border-black hover:shadow-lg transition-all duration-300"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="inline-flex p-2 rounded-lg bg-black text-white">
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <div className={`flex items-center text-sm font-bold ${
                      stat.trendUp ? 'text-black' : 'text-gray-600'
                    }`}>
                      <TrendingUp className="h-4 w-4 mr-1" />
                      {stat.trend}
                    </div>
                  </div>
                  <div className="text-3xl font-black text-black mb-1">{stat.number}</div>
                  <div className="text-sm font-bold text-gray-700 mb-1">{stat.label}</div>
                  <div className="text-xs font-semibold text-gray-600">{stat.description}</div>
                </div>
              );
            })}
          </div>

          {/* Dashboard Preview */}
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-white p-2">
              <img 
                src={dashboardPreview} 
                alt="Dashboard preview showing analytics and charts" 
                className="w-full h-auto rounded-xl"
              />
              {/* Overlay Elements */}
              <div className="absolute top-6 left-6 bg-white rounded-xl p-4 shadow-lg border border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-black rounded-full animate-pulse"></div>
                  <span className="text-sm font-bold text-black">Live Dashboard</span>
                </div>
                <div className="text-xs font-semibold text-gray-700 mt-1">Real-time updates</div>
              </div>
              
              <div className="absolute bottom-6 right-6 bg-white rounded-xl p-4 shadow-lg border border-gray-200">
                <div className="text-2xl font-black text-black">98.5%</div>
                <div className="text-xs font-bold text-gray-700">Resolution Rate</div>
              </div>
            </div>

            {/* Floating Badges */}
            <div className="absolute -top-4 -right-4 bg-black text-white p-4 rounded-2xl shadow-xl">
              <div className="text-2xl font-black">24/7</div>
              <div className="text-xs font-bold opacity-90">Active Monitoring</div>
            </div>
            
            <div className="absolute -bottom-4 -left-4 bg-black text-white p-4 rounded-2xl shadow-xl">
              <div className="text-2xl font-black">AI</div>
              <div className="text-xs font-bold opacity-90">Powered</div>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <p className="text-gray-700 font-bold mb-4">
            Join the digital governance revolution today
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <div className="bg-white/80 px-6 py-3 rounded-full text-sm font-bold text-black border border-gray-200">
              Government Approved
            </div>
            <div className="bg-white/80 px-6 py-3 rounded-full text-sm font-bold text-black border border-gray-200">
              Secure & Private
            </div>
            <div className="bg-white/80 px-6 py-3 rounded-full text-sm font-bold text-black border border-gray-200">
              AI-Powered
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StatisticsSection;
