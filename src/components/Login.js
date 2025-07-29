import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase/config';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Building2, Lock, Shield, TrendingUp, Package } from 'lucide-react';
import toast from 'react-hot-toast';

const Login = () => {
  const [selectedCentre, setSelectedCentre] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [animateLogo, setAnimateLogo] = useState(false);
  const navigate = useNavigate();

  const centres = [
    { name: 'Lucknow', email: 'lucknow@aaryavart.org', icon: '🏢' },
    { name: 'Gorakhpur', email: 'gorakhpur@aaryavart.org', icon: '🏢' },
    { name: 'Admin', email: 'admin@aaryavart.org', icon: '👨‍💼' }
  ];

  useEffect(() => {
    // Trigger logo animation after component mounts
    setTimeout(() => setAnimateLogo(true), 300);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!selectedCentre || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    
    try {
      const selectedCentreData = centres.find(c => c.name === selectedCentre);
      await signInWithEmailAndPassword(auth, selectedCentreData.email, password);
      
      toast.success(`Welcome to ${selectedCentre}!`);
      
      // Redirect based on role
      if (selectedCentre === 'Admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background-page via-primary-soft to-background-page flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-32 h-32 bg-primary/10 rounded-full animate-float"></div>
        <div className="absolute bottom-20 right-20 w-24 h-24 bg-accent-gold/10 rounded-full animate-float" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-accent-blue/10 rounded-full animate-bounce-gentle"></div>
        <div className="absolute top-1/3 right-1/4 w-20 h-20 bg-accent-green/10 rounded-full animate-pulse-gentle"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo and Welcome Section */}
        <div className="text-center mb-8 fade-in">
          <div className={`flex justify-center mb-6 transition-all duration-1000 ${animateLogo ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`}>
            <div className="relative">
              <img 
                src="/Logo-2024.png" 
                alt="Aaryavart Centre Logo" 
                className="w-24 h-24 object-contain drop-shadow-lg"
              />
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse-gentle"></div>
            </div>
          </div>
          
          <div className="slide-up" style={{ animationDelay: '0.3s' }}>
            <h1 className="text-4xl font-display font-bold gradient-text mb-3">
              Expense Manager
            </h1>
            <p className="text-text-secondary text-lg">
              Professional Financial Management System
            </p>
          </div>
        </div>

        {/* Login Form */}
        <div className="card-elevated glass-effect slide-up" style={{ animationDelay: '0.6s' }}>
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full mb-4">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-2xl font-display font-semibold text-text-primary">
              Secure Login
            </h2>
            <p className="text-text-secondary mt-2">
              Access your centre's management portal
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {/* Centre Selection */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-text-primary">
                Select Your Centre
              </label>
              <div className="relative">
                <Building2 className="absolute left-4 top-1/2 transform -translate-y-1/2 text-text-secondary w-5 h-5" />
                <select
                  value={selectedCentre}
                  onChange={(e) => setSelectedCentre(e.target.value)}
                  className="input-field pl-12 appearance-none"
                  required
                >
                  <option value="">Choose your centre...</option>
                  {centres.map((centre) => (
                    <option key={centre.name} value={centre.name}>
                      {centre.icon} {centre.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Email Display */}
            {selectedCentre && (
              <div className="space-y-2 scale-in">
                <label className="block text-sm font-medium text-text-primary">
                  Email Address
                </label>
                <div className="input-field bg-gray-50 text-text-secondary border-primary/20">
                  {centres.find(c => c.name === selectedCentre)?.email}
                </div>
              </div>
            )}

            {/* Password */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-text-primary">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-text-secondary w-5 h-5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-12 pr-12"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors duration-200"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed hover-lift"
            >
              {loading ? (
                <>
                  <div className="spinner"></div>
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <Shield size={20} />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Features Preview */}
        <div className="mt-8 grid grid-cols-3 gap-4 slide-up" style={{ animationDelay: '0.9s' }}>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-accent-green/10 rounded-full mb-2">
              <TrendingUp className="w-5 h-5 text-accent-green" />
            </div>
            <p className="text-xs text-text-secondary">Expense Tracking</p>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-accent-blue/10 rounded-full mb-2">
              <Package className="w-5 h-5 text-accent-blue" />
            </div>
            <p className="text-xs text-text-secondary">Inventory Management</p>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-accent-gold/10 rounded-full mb-2">
              <Shield className="w-5 h-5 text-accent-gold" />
            </div>
            <p className="text-xs text-text-secondary">Secure Access</p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 slide-up" style={{ animationDelay: '1.2s' }}>
          <p className="text-sm text-text-secondary font-medium">
            Aaryavart Centre for Autism and Special Needs Foundation
          </p>
          <p className="text-xs text-text-light mt-1">
            Professional Financial Management System
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login; 