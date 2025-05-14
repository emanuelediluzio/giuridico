import React from 'react';

export default function Footer() {
  return (
    <footer className="w-full bg-[#111827] border-t border-[#374151] py-6 mt-20">
      <div className="container-lexa">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Logo e info */}
          <div>
            <div className="flex items-center mb-4">
              <div className="relative">
                <span className="font-['Space_Grotesk'] font-bold text-2xl text-white">LEXA</span>
                <div className="absolute bottom-0 left-0 h-[2px] w-full bg-[#3b82f6]"></div>
              </div>
            </div>
            <p className="text-gray-400 text-sm">
              Assistente legale avanzato per professionisti del diritto.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-['Space_Grotesk'] font-medium text-white mb-4">Link utili</h4>
            <div className="grid grid-cols-2 gap-4">
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">Termini di Servizio</a>
                </li>
              </ul>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">FAQ</a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">Contattaci</a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-[#374151] text-center text-gray-500 text-xs">
          &copy; {new Date().getFullYear()} Lexa. Tutti i diritti riservati.
        </div>
      </div>
    </footer>
  );
} 