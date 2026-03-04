import React, { useState } from 'react';
import { Check, Sparkles, Users, Zap, ArrowRight, Crown, Building2 } from 'lucide-react';
import './PricingSection.css';

const PricingSection = () => {
  const [billingCycle, setBillingCycle] = useState('yearly');

  const pricingPlans = [
    {
      id: 'starter',
      name: 'Starter',
      icon: Building2,
      monthlyPrice: '₹8,000',
      yearlyPrice: '₹80,000',
      description: 'Small cities',
      users: '10 Users',
      extraUserPrice: '₹800',
      features: [
        'AI Analysis',
        'Dashboard',
        'Auto Routing',
        'Multi-channel',
      ],
      highlighted: false,
    },
    {
      id: 'professional',
      name: 'Professional',
      icon: Crown,
      monthlyPrice: '₹15,000',
      yearlyPrice: '₹1,50,000',
      description: 'Growing cities',
      users: '25 Users',
      extraUserPrice: '₹1,000',
      features: [
        'All Starter',
        'Analytics',
        'Knowledge Base',
        'SLA & Escalation',
        'Priority Support',
      ],
      highlighted: true,
      savings: '₹30K',
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      icon: Sparkles,
      monthlyPrice: '₹25,000',
      yearlyPrice: '₹2,50,000',
      description: 'Large cities',
      users: '50 Users',
      extraUserPrice: '₹1,200',
      features: [
        'All Professional',
        'Custom Integration',
        'White-label',
        'Advanced AI',
        '24/7 Support',
      ],
      highlighted: false,
      savings: '₹50K',
    },
  ];

  const handleSubscribe = (planId) => {
    window.location.href = `/subscribe?plan=${planId}&billing=${billingCycle}`;
  };

  return (
    <section className="pricing-section" id="pricing">
      <div className="pricing-container">
        {/* Header */}
        <div className="pricing-header">
          <span className="pricing-badge">
            <Sparkles size={16} />
            Transparent Pricing
          </span>
          <h2 className="pricing-title">
            Choose Your Perfect Plan
          </h2>
          <p className="pricing-subtitle">
            Flexible pricing for cities of all sizes. Scale as you grow.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="billing-toggle">
          <button
            className={`toggle-btn ${billingCycle === 'monthly' ? 'active' : ''}`}
            onClick={() => setBillingCycle('monthly')}
          >
            Monthly
          </button>
          <button
            className={`toggle-btn ${billingCycle === 'yearly' ? 'active' : ''}`}
            onClick={() => setBillingCycle('yearly')}
          >
            Yearly
            <span className="savings-badge">Save up to 20%</span>
          </button>
        </div>

        {/* Pricing Cards Grid */}
        <div className="pricing-grid">
          {pricingPlans.map((plan, index) => {
            const IconComponent = plan.icon;
            return (
              <div
                key={plan.id}
                className={`pricing-card ${plan.highlighted ? 'highlighted' : ''}`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {plan.highlighted && (
                  <div className="recommended-badge">
                    <Zap size={14} />
                    Most Popular
                  </div>
                )}

                <div className="card-icon">
                  <IconComponent size={32} />
                </div>

                <div className="card-header">
                  <h3 className="plan-name">{plan.name}</h3>
                  <p className="plan-description">{plan.description}</p>
                </div>

                <div className="card-pricing">
                  <div className="price-wrapper">
                    <span className="price">
                      {billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice}
                    </span>
                    <span className="period">
                      {billingCycle === 'monthly' ? '/month' : '/year'}
                    </span>
                  </div>
                  {billingCycle === 'yearly' && plan.savings && (
                    <div className="savings-text">{plan.savings}</div>
                  )}
                </div>

                <div className="card-includes">
                  <div className="includes-item">
                    <Users size={14} />
                    <strong>{plan.users}</strong>
                  </div>
                  <div className="includes-item">
                    <span className="extra-price">{plan.extraUserPrice}/user extra</span>
                  </div>
                </div>

                <button
                  className={`subscribe-btn ${plan.highlighted ? 'primary' : ''}`}
                  onClick={() => handleSubscribe(plan.id)}
                >
                  Get Started
                  <ArrowRight size={18} />
                </button>

                <div className="features-list">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="feature-item">
                      <Check size={16} className="check-icon" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Trust Badges */}
        <div className="trust-badges">
          <div className="badge-item">
            <Zap size={24} />
            <span>Instant Setup</span>
          </div>
          <div className="badge-item">
            <Check size={24} />
            <span>No Hidden Fees</span>
          </div>
          <div className="badge-item">
            <Users size={24} />
            <span>24/7 Support</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
