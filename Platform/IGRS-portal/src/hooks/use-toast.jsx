import { useState, useCallback } from 'react';

// Simple toast implementation
export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback(({ title, description, variant = 'default', duration = 5000 }) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast = {
      id,
      title,
      description,
      variant,
      duration
    };

    setToasts(prev => [...prev, newToast]);

    // Auto remove toast after duration
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, duration);

    return id;
  }, []);

  const dismiss = useCallback((toastId) => {
    setToasts(prev => prev.filter(toast => toast.id !== toastId));
  }, []);

  return {
    toast,
    dismiss,
    toasts
  };
};

// Toast component for rendering
export const Toast = ({ toast, onDismiss }) => {
  const variantStyles = {
    default: 'bg-white border-gray-200',
    destructive: 'bg-red-50 border-red-200 text-red-800'
  };

  return (
    <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg border shadow-lg ${variantStyles[toast.variant] || variantStyles.default} max-w-sm`}>
      <div className="flex justify-between items-start">
        <div>
          {toast.title && <div className="font-semibold mb-1">{toast.title}</div>}
          {toast.description && <div className="text-sm">{toast.description}</div>}
        </div>
        <button 
          onClick={() => onDismiss(toast.id)}
          className="ml-2 text-gray-400 hover:text-gray-600"
        >
          ×
        </button>
      </div>
    </div>
  );
};

// Toast container component
export const Toaster = () => {
  const { toasts, dismiss } = useToast();

  return (
    <div>
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} onDismiss={dismiss} />
      ))}
    </div>
  );
};


