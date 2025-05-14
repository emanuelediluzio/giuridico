import React, { useState } from 'react';

interface NavbarProps {
  currentScreen?: 'home' | 'rimborso' | 'chat';
  onScreenChange?: (screen: 'home' | 'rimborso' | 'chat') => void;
}

export default function Navbar({ currentScreen = 'home', onScreenChange }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavigate = (screen: 'home' | 'rimborso' | 'chat') => {
    if (onScreenChange) {
      onScreenChange(screen);
      setMobileMenuOpen(false);
    }
  };

  return (
    <nav className="w-full bg-white border-b border-slate-200 py-3 fixed top-0 left-0 z-50 shadow-sm">
      <div className="container-lexa flex flex-wrap justify-between items-center">
        {/* Logo */}
        <div className="flex items-center">
          <button 
            onClick={() => handleNavigate('home')}
            className="relative flex items-center"
          >
            <div className="px-2 py-1">
              <span className="font-['Montserrat'] font-bold text-2xl text-blue-600">LEXA</span>
              <span className="text-slate-700 font-['Montserrat'] font-medium ml-1">legal</span>
            </div>
          </button>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-1">
          <button
            onClick={() => handleNavigate('home')}
            className={`px-4 py-2 rounded-lg transition-all duration-200 font-medium ${
              currentScreen === 'home' 
                ? 'bg-blue-50 text-blue-700' 
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            Home
          </button>
          <button
            onClick={() => handleNavigate('rimborso')}
            className={`px-4 py-2 rounded-lg transition-all duration-200 font-medium ${
              currentScreen === 'rimborso' 
                ? 'bg-blue-50 text-blue-700' 
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            Calcolo Rimborso
          </button>
          <button
            onClick={() => handleNavigate('chat')}
            className={`px-4 py-2 rounded-lg transition-all duration-200 font-medium ${
              currentScreen === 'chat' 
                ? 'bg-blue-50 text-blue-700' 
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            Chat con Lexa
          </button>
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden">
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-slate-200 animate-fade-in">
          <div className="container-lexa py-3 space-y-1">
            <button
              onClick={() => handleNavigate('home')}
              className={`block w-full text-left px-4 py-2 rounded-lg ${
                currentScreen === 'home' 
                  ? 'bg-blue-50 text-blue-700' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => handleNavigate('rimborso')}
              className={`block w-full text-left px-4 py-2 rounded-lg ${
                currentScreen === 'rimborso' 
                  ? 'bg-blue-50 text-blue-700' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              Calcolo Rimborso
            </button>
            <button
              onClick={() => handleNavigate('chat')}
              className={`block w-full text-left px-4 py-2 rounded-lg ${
                currentScreen === 'chat' 
                  ? 'bg-blue-50 text-blue-700' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              Chat con Lexa
            </button>
          </div>
        </div>
      )}
    </nav>
  );
} 