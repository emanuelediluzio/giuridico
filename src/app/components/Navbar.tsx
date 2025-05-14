import React, { useState } from 'react';
import Link from 'next/link';
import { User } from 'firebase/auth';
import dynamic from 'next/dynamic';

const AuthUser = dynamic(() => import('./AuthUser'), { ssr: false });

interface NavbarProps {
  currentScreen?: 'home' | 'rimborso' | 'chat';
  onScreenChange?: (screen: 'home' | 'rimborso' | 'chat') => void;
}

export default function Navbar({ currentScreen = 'home', onScreenChange }: NavbarProps) {
  const [user, setUser] = useState<User | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavigate = (screen: 'home' | 'rimborso' | 'chat') => {
    if (onScreenChange) {
      onScreenChange(screen);
      setMobileMenuOpen(false);
    }
  };

  return (
    <nav className="w-full bg-[#0c111a]/90 backdrop-blur-md border-b border-[#2c3849] py-4 fixed top-0 left-0 z-50">
      <div className="container-lexa flex flex-wrap justify-between items-center">
        {/* Logo */}
        <div className="flex items-center">
          <button 
            onClick={() => handleNavigate('home')}
            className="relative group"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-[#4f6af0] to-[#2d86cc] rounded opacity-70 blur-sm group-hover:opacity-100 transition duration-300"></div>
            <div className="relative bg-[#0c111a] px-4 py-1.5 border-2 border-white shadow-[2px_2px_0px_0px_rgba(255,255,255,0.8)] rounded-lg">
              <span className="font-['Space_Grotesk'] font-bold text-2xl text-white">LEXA</span>
            </div>
          </button>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-6">
          <button
            onClick={() => handleNavigate('home')}
            className={`px-3 py-2 rounded-lg transition-all duration-200 ${
              currentScreen === 'home' 
                ? 'bg-[#1e2736] text-white' 
                : 'text-gray-300 hover:bg-[#1e2736]/50 hover:text-white'
            }`}
          >
            Home
          </button>
          <button
            onClick={() => handleNavigate('rimborso')}
            className={`px-3 py-2 rounded-lg transition-all duration-200 ${
              currentScreen === 'rimborso' 
                ? 'bg-[#1e2736] text-white' 
                : 'text-gray-300 hover:bg-[#1e2736]/50 hover:text-white'
            }`}
          >
            Calcolo Rimborso
          </button>
          <button
            onClick={() => handleNavigate('chat')}
            className={`px-3 py-2 rounded-lg transition-all duration-200 ${
              currentScreen === 'chat' 
                ? 'bg-[#1e2736] text-white' 
                : 'text-gray-300 hover:bg-[#1e2736]/50 hover:text-white'
            }`}
          >
            Chat con Lexa
          </button>
        </div>

        {/* Auth */}
        <div className="hidden md:block">
          <AuthUser onAuth={setUser} />
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden">
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-gray-300 hover:text-white rounded-lg hover:bg-[#1e2736]/50"
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
        <div className="md:hidden bg-[#141c2b] border-t border-[#2c3849] animate-fade-in">
          <div className="container-lexa py-4 space-y-2">
            <button
              onClick={() => handleNavigate('home')}
              className={`block w-full text-left px-3 py-2 rounded-lg ${
                currentScreen === 'home' 
                  ? 'bg-[#1e2736] text-white' 
                  : 'text-gray-300 hover:bg-[#1e2736]/50 hover:text-white'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => handleNavigate('rimborso')}
              className={`block w-full text-left px-3 py-2 rounded-lg ${
                currentScreen === 'rimborso' 
                  ? 'bg-[#1e2736] text-white' 
                  : 'text-gray-300 hover:bg-[#1e2736]/50 hover:text-white'
              }`}
            >
              Calcolo Rimborso
            </button>
            <button
              onClick={() => handleNavigate('chat')}
              className={`block w-full text-left px-3 py-2 rounded-lg ${
                currentScreen === 'chat' 
                  ? 'bg-[#1e2736] text-white' 
                  : 'text-gray-300 hover:bg-[#1e2736]/50 hover:text-white'
              }`}
            >
              Chat con Lexa
            </button>

            <div className="pt-2 border-t border-[#2c3849]">
              <AuthUser onAuth={setUser} />
            </div>
          </div>
        </div>
      )}
    </nav>
  );
} 