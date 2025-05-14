import React from 'react';

export default function Footer() {
  return (
    <footer className="w-full bg-slate-50 border-t border-slate-200 py-8 mt-20">
      <div className="container-lexa">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Logo e info */}
          <div>
            <div className="flex items-center mb-4">
              <div className="relative">
                <span className="font-['Montserrat'] font-bold text-2xl text-blue-600">LEXA</span>
                <span className="text-slate-700 font-['Montserrat'] font-medium ml-1">legal</span>
              </div>
            </div>
            <p className="text-slate-600 text-sm">
              Assistente legale avanzato per professionisti del diritto.
            </p>
          </div>

          {/* Links utili */}
          <div>
            <h4 className="font-['Montserrat'] font-semibold text-slate-800 mb-4">Link utili</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="text-slate-600 hover:text-blue-600 transition-colors">Privacy Policy</a>
              </li>
              <li>
                <a href="#" className="text-slate-600 hover:text-blue-600 transition-colors">Termini di Servizio</a>
              </li>
              <li>
                <a href="#" className="text-slate-600 hover:text-blue-600 transition-colors">FAQ</a>
              </li>
            </ul>
          </div>

          {/* Contatti */}
          <div>
            <h4 className="font-['Montserrat'] font-semibold text-slate-800 mb-4">Contatti</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center text-slate-600">
                <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                info@lexalegal.it
              </li>
              <li className="flex items-center text-slate-600">
                <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                +39 02 123 456
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-slate-200 text-center text-slate-500 text-sm">
          &copy; {new Date().getFullYear()} Lexa Legal. Tutti i diritti riservati.
        </div>
      </div>
    </footer>
  );
} 