import FloatingNavbar from "../components/FloatingNavbar";
import HeroSection from "../components/HeroSection";
import FeaturesSection from "../components/FeaturesSection";
import AnimatedCard from "../components/AnimatedCard";
import StatisticsSection from "../components/StatisticsSection";
import Footer from "../components/Footer";

const Landing = () => {
  return (
    <div className="min-h-screen bg-white relative">
      {/* Soft patterned gradient background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-50 via-white to-green-50" />
        <div className="absolute inset-0 opacity-50" style={{
          backgroundImage: `radial-gradient(rgba(234,179,8,0.12) 1px, transparent 1px), radial-gradient(rgba(34,197,94,0.12) 1px, transparent 1px)`,
          backgroundSize: '24px 24px, 24px 24px',
          backgroundPosition: '0 0, 12px 12px'
        }} />
        <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-yellow-100/60 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-green-100/50 to-transparent" />
      </div>
      <FloatingNavbar />
      <HeroSection />
      <FeaturesSection />
      <AnimatedCard />
      <StatisticsSection />
      <Footer />
    </div>
  );
};

export default Landing;
