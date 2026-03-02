import FloatingNavbar from "../components/FloatingNavbar";
import HeroSection from "../components/HeroSection";
import FeaturesSection from "../components/FeaturesSection";
import StatisticsSection from "./citizen/components/StatisticsSection";
import Footer from "../components/Footer";

const Landing = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-amber-50 to-yellow-100">
      <FloatingNavbar />
      <HeroSection />
      <FeaturesSection />
      <StatisticsSection />
      <Footer />
    </div>
  );
};

export default Landing;
