import React, { useState } from 'react';
// import MenuIcon from '@/assets/icons/menu.svg';
// import XIcon from '@/assets/icons/x.svg';

interface NavbarProps {
  currentScreen?: 'home' | 'rimborso' | 'chat-ai';
  onScreenChange?: (screen: 'home' | 'rimborso' | 'chat-ai') => void;
}

export default function Navbar({ currentScreen = 'home', onScreenChange }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavigate = (screen: 'home' | 'rimborso' | 'chat-ai') => {
    if (onScreenChange) {
      onScreenChange(screen);
      setMobileMenuOpen(false);
    } else {
      // Navigazione client-side se non viene gestita dal parent
      if (screen === 'home') window.location.href = '/';
      else if (screen === 'rimborso') window.location.href = '/rimborso';
      else if (screen === 'chat-ai') window.location.href = '/chat-ai';
      setMobileMenuOpen(false);
    }
  };

  return (
    <nav className="w-full bg-white/90 backdrop-blur-md border-b border-slate-200/70 py-4 fixed top-0 left-0 z-50 shadow-lg">
      <div className="container-lexa flex flex-wrap justify-between items-center">
        {/* Logo */}
        <div className="flex items-center">
          <button 
            onClick={() => handleNavigate('home')}
            className="relative flex items-center group"
          >
            <div className="px-2 py-1 flex items-center">
              <span className="font-['Montserrat'] font-extrabold text-3xl text-blue-600 tracking-tight group-hover:text-blue-700 transition-colors">LEXA</span>
              <span className="text-slate-700 font-['Montserrat'] font-semibold ml-1 group-hover:text-slate-800 transition-colors">legal</span>
              <div className="ml-1.5 w-2 h-2 rounded-full bg-blue-600 group-hover:bg-blue-700 transition-colors"></div>
            </div>
          </button>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-2">
          <button
            onClick={() => handleNavigate('home')}
            className={`px-5 py-2.5 rounded-xl transition-all duration-200 font-medium ${
              currentScreen === 'home' 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            Home
          </button>
          <button
            onClick={() => handleNavigate('rimborso')}
            className={`px-5 py-2.5 rounded-xl transition-all duration-200 font-medium ${
              currentScreen === 'rimborso' 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            Calcolo Rimborso
          </button>
          <button
            onClick={() => handleNavigate('chat-ai')}
            className={`px-5 py-2.5 rounded-xl transition-all duration-200 font-medium ${
              currentScreen === 'chat-ai' 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            Chat AI
          </button>
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden">
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2.5 text-slate-700 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-all duration-200"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              // <XIcon className="w-6 h-6" fill="none" stroke="currentColor" />
              <span>Chiudi</span>
            ) : (
              // <MenuIcon className="w-6 h-6" fill="none" stroke="currentColor" />
              <span>Menu</span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white/90 backdrop-blur-md border-t border-slate-200/70 shadow-lg animate-fade-in">
          <div className="container-lexa py-4 space-y-2">
            <button
              onClick={() => handleNavigate('home')}
              className={`block w-full text-left px-5 py-3 rounded-xl transition-all duration-200 font-medium ${
                currentScreen === 'home' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => handleNavigate('rimborso')}
              className={`block w-full text-left px-5 py-3 rounded-xl transition-all duration-200 font-medium ${
                currentScreen === 'rimborso' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              Calcolo Rimborso
            </button>
            <button
              onClick={() => handleNavigate('chat-ai')}
              className={`block w-full text-left px-5 py-3 rounded-xl transition-all duration-200 font-medium ${
                currentScreen === 'chat-ai' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              Chat AI
            </button>
          </div>
        </div>
      )}
    </nav>
  );
} 