import FloatingNavbar from "../components/FloatingNavbar";
import HeroSection from "../components/HeroSection";
import FeaturesSection from "../components/FeaturesSection";
import FeaturesShowcase from "../components/FeaturesShowcase";
import PricingSection from "../components/PricingSection";
import StatisticsSection from "./citizen/components/StatisticsSection";
import Footer from "../components/Footer";

const Landing = () => {
  return (
    <div className="min-h-screen bg-cream-gradient">
      <FloatingNavbar />
      <HeroSection />
      <FeaturesSection />
      <StatisticsSection />
      <FeaturesShowcase />
      <PricingSection />
      <Footer />
    </div>
  );
};

export default Landing;
