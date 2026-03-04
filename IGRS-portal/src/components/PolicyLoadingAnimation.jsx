import { useState, useEffect } from 'react';
import { Check, Loader } from 'lucide-react';

const PolicyLoadingAnimation = () => {
  const [currentStep, setCurrentStep] = useState(0);
  
  const steps = [
    { id: 1, label: 'Searching Knowledge Base', duration: 2000 },
    { id: 2, label: 'Querying Internet Sources', duration: 2500 },
    { id: 3, label: 'Retrieving Government Documents', duration: 2000 },
    { id: 4, label: 'Analyzing Policies', duration: 2500 },
    { id: 5, label: 'Extracting Guidelines', duration: 2000 },
    { id: 6, label: 'Compiling Circulars', duration: 2000 },
    { id: 7, label: 'Synthesizing Document', duration: 3000 }
  ];

  useEffect(() => {
    if (currentStep < steps.length) {
      const timer = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
      }, steps[currentStep]?.duration || 2000);
      
      return () => clearTimeout(timer);
    }
  }, [currentStep]);

  return (
    <div className="flex items-center justify-center py-24 bg-gradient-to-br from-stone-50 to-neutral-100 rounded-xl border-2 border-stone-300">
      <div className="max-w-md w-full px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-black to-gray-800 rounded-full mb-4 shadow-lg">
            <Loader className="w-8 h-8 text-white animate-spin" />
          </div>
          <h3 className="text-2xl font-bold text-black mb-2">
            Loading Policies
          </h3>
          <p className="text-stone-600 text-sm">
            AI-powered policy retrieval in progress...
          </p>
        </div>

        {/* Progress Steps */}
        <div className="space-y-3">
          {steps.map((step, index) => {
            const isCompleted = index < currentStep;
            const isActive = index === currentStep;
            const isPending = index > currentStep;

            return (
              <div
                key={step.id}
                className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all duration-500 ${
                  isCompleted
                    ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300 shadow-sm'
                    : isActive
                    ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-yellow-400 shadow-md scale-105'
                    : 'bg-white border-stone-200'
                }`}
              >
                {/* Checkbox/Loader */}
                <div
                  className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-all duration-300 ${
                    isCompleted
                      ? 'bg-green-600 border-green-600'
                      : isActive
                      ? 'bg-gradient-to-br from-amber-500 to-yellow-500 border-yellow-500 animate-pulse'
                      : 'bg-white border-stone-300'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4 text-white" strokeWidth={3} />
                  ) : isActive ? (
                    <Loader className="w-3 h-3 text-white animate-spin" />
                  ) : null}
                </div>

                {/* Label */}
                <span
                  className={`text-sm font-semibold transition-colors duration-300 ${
                    isCompleted
                      ? 'text-green-800'
                      : isActive
                      ? 'text-yellow-900'
                      : 'text-stone-400'
                  }`}
                >
                  {step.label}
                </span>

                {/* Status Indicator */}
                {isActive && (
                  <div className="ml-auto flex gap-1">
                    <div className="w-1.5 h-1.5 bg-yellow-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-yellow-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-yellow-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Progress Bar */}
        <div className="mt-6">
          <div className="flex justify-between text-xs text-stone-600 mb-2">
            <span>Progress</span>
            <span className="font-bold">{Math.round((currentStep / steps.length) * 100)}%</span>
          </div>
          <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-black via-amber-600 to-yellow-600 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${(currentStep / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-stone-500">
            Powered by Claude AI via Puter.js
          </p>
        </div>
      </div>
    </div>
  );
};

export default PolicyLoadingAnimation;
