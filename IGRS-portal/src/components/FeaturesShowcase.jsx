import React from 'react';
import { 
  Brain, 
  LineChart, 
  Route, 
  MessageSquare, 
  Smartphone, 
  FileText, 
  BookOpen, 
  AlertTriangle, 
  TrendingUp, 
  DollarSign, 
  Shield, 
  Heart, 
  Search, 
  GitBranch, 
  Lock, 
  Monitor, 
  Bell, 
  Download, 
  Headphones, 
  Zap 
} from 'lucide-react';
import './FeaturesShowcase.css';

const FeaturesShowcase = () => {
  const allFeatures = [
    {
      icon: Brain,
      title: 'AI-Powered Grievance Analysis',
      description: 'Intelligent understanding and categorization of citizen complaints using advanced NLP'
    },
    {
      icon: LineChart,
      title: 'Real-time Dashboard & Analytics',
      description: 'Comprehensive insights and data visualization for informed decision-making'
    },
    {
      icon: Route,
      title: 'Automated Department Routing',
      description: 'Smart routing of grievances to the right department based on AI analysis'
    },
    {
      icon: MessageSquare,
      title: 'Citizen Feedback System',
      description: 'Collect and analyze citizen satisfaction scores and feedback'
    },
    {
      icon: Smartphone,
      title: 'Multi-channel Support',
      description: 'Seamless integration with Web, WhatsApp, and Telegram platforms'
    },
    {
      icon: FileText,
      title: 'Document Management & OCR',
      description: 'Automatic text extraction from images and document processing'
    },
    {
      icon: BookOpen,
      title: 'Policy Knowledge Base',
      description: 'Centralized repository of government policies and guidelines'
    },
    {
      icon: AlertTriangle,
      title: 'SLA & Escalation Management',
      description: 'Automatic escalation based on service level agreements and priorities'
    },
    {
      icon: TrendingUp,
      title: 'Progress Tracking & Reports',
      description: 'Detailed progress reports and performance metrics for all grievances'
    },
    {
      icon: DollarSign,
      title: 'Budget & Cost Estimation',
      description: 'AI-powered cost estimation and budget allocation for resolutions'
    },
    {
      icon: Shield,
      title: 'Fraud Detection & Pattern Analysis',
      description: 'Identify fraudulent grievances and detect patterns in complaints'
    },
    {
      icon: Heart,
      title: 'Sentiment Analysis',
      description: 'Understand citizen emotions and urgency through sentiment detection'
    },
    {
      icon: Search,
      title: 'Vector Search & Similarity Matching',
      description: 'Find similar past cases and leverage previous resolutions'
    },
    {
      icon: GitBranch,
      title: 'Custom Workflows',
      description: 'Flexible workflow configuration for different types of grievances'
    },
    {
      icon: Lock,
      title: 'Audit Logs & Compliance',
      description: 'Complete audit trail for transparency and regulatory compliance'
    },
    {
      icon: Monitor,
      title: 'Mobile Responsive Interface',
      description: 'Access from any device with responsive design'
    },
    {
      icon: Bell,
      title: 'Email & SMS Notifications',
      description: 'Real-time notifications for citizens and officials'
    },
    {
      icon: Download,
      title: 'Data Export & Reporting',
      description: 'Export data in multiple formats for analysis and reporting'
    },
    {
      icon: Headphones,
      title: 'Priority Support',
      description: '24/7 dedicated support for prompt issue resolution'
    },
    {
      icon: Zap,
      title: 'Regular AI Model Updates',
      description: 'Continuous improvements with latest AI models and features'
    }
  ];

  // Split features into three rows
  const row1Features = allFeatures.slice(0, 7);
  const row2Features = allFeatures.slice(7, 14);
  const row3Features = allFeatures.slice(14, 20);

  // Triple for infinite scroll
  const row1Infinite = [...row1Features, ...row1Features, ...row1Features];
  const row2Infinite = [...row2Features, ...row2Features, ...row2Features];
  const row3Infinite = [...row3Features, ...row3Features, ...row3Features];

  return (
    <section className="features-showcase">
      <div className="showcase-container">
        <div className="showcase-header">
          <span className="showcase-badge">
            <Zap size={16} />
            Powerful Features
          </span>
          <h2 className="showcase-title">
            Everything You Need for Smart Governance
          </h2>
          <p className="showcase-subtitle">
            Comprehensive AI-powered tools to transform your city's grievance management
          </p>
        </div>

        <div className="features-carousel-container">
          {/* Row 1 - Moving Left */}
          <div className="features-carousel-wrapper">
            <div className="features-carousel scroll-left">
              {row1Infinite.map((feature, index) => {
                const IconComponent = feature.icon;
                return (
                  <div key={index} className="feature-card">
                    <div className="feature-icon">
                      <IconComponent size={24} />
                    </div>
                    <div className="feature-content">
                      <h3 className="feature-title">{feature.title}</h3>
                      <p className="feature-description">{feature.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Row 2 - Moving Right */}
          <div className="features-carousel-wrapper">
            <div className="features-carousel scroll-right">
              {row2Infinite.map((feature, index) => {
                const IconComponent = feature.icon;
                return (
                  <div key={index} className="feature-card">
                    <div className="feature-icon">
                      <IconComponent size={24} />
                    </div>
                    <div className="feature-content">
                      <h3 className="feature-title">{feature.title}</h3>
                      <p className="feature-description">{feature.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Row 3 - Moving Left */}
          <div className="features-carousel-wrapper">
            <div className="features-carousel scroll-left">
              {row3Infinite.map((feature, index) => {
                const IconComponent = feature.icon;
                return (
                  <div key={index} className="feature-card">
                    <div className="feature-icon">
                      <IconComponent size={24} />
                    </div>
                    <div className="feature-content">
                      <h3 className="feature-title">{feature.title}</h3>
                      <p className="feature-description">{feature.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="scroll-gradient scroll-gradient-left"></div>
        <div className="scroll-gradient scroll-gradient-right"></div>
      </div>
    </section>
  );
};

export default FeaturesShowcase;
