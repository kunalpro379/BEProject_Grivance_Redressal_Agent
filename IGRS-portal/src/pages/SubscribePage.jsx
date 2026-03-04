import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Building2, MapPin, Mail, Phone, User, CreditCard, CheckCircle } from 'lucide-react';
import { createSubscription, getPricingPlans } from '../services/subscription.service';
import './SubscribePage.css';

const SubscribePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const planType = searchParams.get('plan') || 'yearly';

  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Form, 2: Review, 3: Payment, 4: Success

  const [formData, setFormData] = useState({
    organizationName: '',
    cityName: '',
    stateName: '',
    contactPerson: '',
    email: '',
    phone: '',
    extraUsers: 0,
    billingCycle: planType,
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadPricingPlans();
  }, []);

  useEffect(() => {
    if (plans.length > 0) {
      const plan = plans.find(p => p.plan_type === planType);
      setSelectedPlan(plan);
      setFormData(prev => ({ ...prev, billingCycle: planType }));
    }
  }, [plans, planType]);

  const loadPricingPlans = async () => {
    try {
      const response = await getPricingPlans();
      if (response.success) {
        setPlans(response.data);
      }
    } catch (error) {
      console.error('Failed to load pricing plans:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.organizationName.trim()) {
      newErrors.organizationName = 'Organization name is required';
    }
    if (!formData.cityName.trim()) {
      newErrors.cityName = 'City name is required';
    }
    if (!formData.stateName.trim()) {
      newErrors.stateName = 'State name is required';
    }
    if (!formData.contactPerson.trim()) {
      newErrors.contactPerson = 'Contact person name is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Phone number must be 10 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateForm()) {
      setStep(2);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    if (!selectedPlan) return;

    setLoading(true);
    try {
      const subscriptionData = {
        organizationName: formData.organizationName,
        cityName: formData.cityName,
        stateName: formData.stateName,
        pricingPlanId: selectedPlan.id,
        billingCycle: formData.billingCycle,
        extraUsers: parseInt(formData.extraUsers) || 0,
        metadata: {
          contactPerson: formData.contactPerson,
          email: formData.email,
          phone: formData.phone,
        },
      };

      const response = await createSubscription(subscriptionData);
      
      if (response.success) {
        setStep(4);
        // In a real app, redirect to payment gateway here
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    } catch (error) {
      console.error('Failed to create subscription:', error);
      alert('Failed to create subscription. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    if (!selectedPlan) return 0;
    const extraUserCost = (parseInt(formData.extraUsers) || 0) * selectedPlan.extra_user_price;
    return selectedPlan.base_price + extraUserCost;
  };

  if (!selectedPlan) {
    return (
      <div className="subscribe-page">
        <div className="loading-state">Loading pricing information...</div>
      </div>
    );
  }

  return (
    <div className="subscribe-page">
      <div className="subscribe-container">
        {/* Header */}
        <div className="subscribe-header">
          <h1>Subscribe to AI Governance</h1>
          <p>Transform your city's grievance management with AI</p>
        </div>

        {/* Progress Steps */}
        <div className="progress-steps">
          <div className={`step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
            <div className="step-number">1</div>
            <div className="step-label">Details</div>
          </div>
          <div className={`step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
            <div className="step-number">2</div>
            <div className="step-label">Review</div>
          </div>
          <div className={`step ${step >= 3 ? 'active' : ''} ${step > 3 ? 'completed' : ''}`}>
            <div className="step-number">3</div>
            <div className="step-label">Payment</div>
          </div>
          <div className={`step ${step >= 4 ? 'active' : ''}`}>
            <div className="step-number">4</div>
            <div className="step-label">Complete</div>
          </div>
        </div>

        {/* Step Content */}
        <div className="step-content">
          {step === 1 && (
            <div className="form-step">
              <h2>Organization Details</h2>
              
              <div className="form-group">
                <label>
                  <Building2 size={18} />
                  Organization Name *
                </label>
                <input
                  type="text"
                  name="organizationName"
                  value={formData.organizationName}
                  onChange={handleInputChange}
                  placeholder="Enter your organization name"
                  className={errors.organizationName ? 'error' : ''}
                />
                {errors.organizationName && <span className="error-text">{errors.organizationName}</span>}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>
                    <MapPin size={18} />
                    City *
                  </label>
                  <input
                    type="text"
                    name="cityName"
                    value={formData.cityName}
                    onChange={handleInputChange}
                    placeholder="City name"
                    className={errors.cityName ? 'error' : ''}
                  />
                  {errors.cityName && <span className="error-text">{errors.cityName}</span>}
                </div>

                <div className="form-group">
                  <label>
                    <MapPin size={18} />
                    State *
                  </label>
                  <input
                    type="text"
                    name="stateName"
                    value={formData.stateName}
                    onChange={handleInputChange}
                    placeholder="State name"
                    className={errors.stateName ? 'error' : ''}
                  />
                  {errors.stateName && <span className="error-text">{errors.stateName}</span>}
                </div>
              </div>

              <h3>Contact Information</h3>

              <div className="form-group">
                <label>
                  <User size={18} />
                  Contact Person *
                </label>
                <input
                  type="text"
                  name="contactPerson"
                  value={formData.contactPerson}
                  onChange={handleInputChange}
                  placeholder="Full name"
                  className={errors.contactPerson ? 'error' : ''}
                />
                {errors.contactPerson && <span className="error-text">{errors.contactPerson}</span>}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>
                    <Mail size={18} />
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="email@example.com"
                    className={errors.email ? 'error' : ''}
                  />
                  {errors.email && <span className="error-text">{errors.email}</span>}
                </div>

                <div className="form-group">
                  <label>
                    <Phone size={18} />
                    Phone *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="10-digit mobile number"
                    className={errors.phone ? 'error' : ''}
                  />
                  {errors.phone && <span className="error-text">{errors.phone}</span>}
                </div>
              </div>

              <div className="form-group">
                <label>Extra Users (Optional)</label>
                <input
                  type="number"
                  name="extraUsers"
                  value={formData.extraUsers}
                  onChange={handleInputChange}
                  min="0"
                  placeholder="Additional users beyond 20 included"
                />
                <small>₹1,000 per additional user</small>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="review-step">
              <h2>Review Your Subscription</h2>

              <div className="review-section">
                <h3>Plan Details</h3>
                <div className="review-item">
                  <span>Plan:</span>
                  <strong>{selectedPlan.plan_name}</strong>
                </div>
                <div className="review-item">
                  <span>Billing Cycle:</span>
                  <strong>{formData.billingCycle === 'monthly' ? 'Monthly' : 'Yearly'}</strong>
                </div>
                <div className="review-item">
                  <span>Included Users:</span>
                  <strong>1 Admin + 20 Users</strong>
                </div>
                {formData.extraUsers > 0 && (
                  <div className="review-item">
                    <span>Extra Users:</span>
                    <strong>{formData.extraUsers}</strong>
                  </div>
                )}
              </div>

              <div className="review-section">
                <h3>Organization</h3>
                <div className="review-item">
                  <span>Name:</span>
                  <strong>{formData.organizationName}</strong>
                </div>
                <div className="review-item">
                  <span>Location:</span>
                  <strong>{formData.cityName}, {formData.stateName}</strong>
                </div>
              </div>

              <div className="review-section">
                <h3>Contact</h3>
                <div className="review-item">
                  <span>Person:</span>
                  <strong>{formData.contactPerson}</strong>
                </div>
                <div className="review-item">
                  <span>Email:</span>
                  <strong>{formData.email}</strong>
                </div>
                <div className="review-item">
                  <span>Phone:</span>
                  <strong>{formData.phone}</strong>
                </div>
              </div>

              <div className="price-summary">
                <div className="price-item">
                  <span>Base Price:</span>
                  <strong>₹{selectedPlan.base_price.toLocaleString()}</strong>
                </div>
                {formData.extraUsers > 0 && (
                  <div className="price-item">
                    <span>Extra Users ({formData.extraUsers}):</span>
                    <strong>₹{(formData.extraUsers * selectedPlan.extra_user_price).toLocaleString()}</strong>
                  </div>
                )}
                <div className="price-item total">
                  <span>Total:</span>
                  <strong>₹{calculateTotal().toLocaleString()}</strong>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="success-step">
              <div className="success-icon">
                <CheckCircle size={64} />
              </div>
              <h2>Subscription Created Successfully!</h2>
              <p>Your subscription has been created. Please check your email for payment instructions and account activation details.</p>
              <p className="redirect-text">Redirecting to login page...</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="step-actions">
          {step > 1 && step < 4 && (
            <button className="btn-secondary" onClick={handleBack} disabled={loading}>
              Back
            </button>
          )}
          {step === 1 && (
            <button className="btn-primary" onClick={handleNext}>
              Next
            </button>
          )}
          {step === 2 && (
            <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Creating...' : 'Proceed to Payment'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubscribePage;
