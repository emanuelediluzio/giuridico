import React from 'react';
// import FacebookIcon from '@/assets/icons/facebook.svg';
// import InstagramIcon from '@/assets/icons/instagram.svg';
// import TwitterIcon from '@/assets/icons/twitter.svg';
// import LinkedinIcon from '@/assets/icons/linkedin.svg';
// import ChevronRightIcon from '@/assets/icons/chevron-right.svg';
// import MailIcon from '@/assets/icons/mail.svg';
// import PhoneIcon from '@/assets/icons/phone.svg';
// import LocationMarkerIcon from '@/assets/icons/location-marker.svg';

export default function Footer() {
  return (
    <footer className="w-full bg-slate-900 py-12 mt-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-10 mix-blend-lighten pointer-events-none"></div>
      <div className="bg-blur-gradient top-[10%] right-[10%] w-[40vw] h-[40vh] bg-gradient-to-br from-blue-900/20 via-indigo-800/15 to-transparent pointer-events-none"></div>
      
      <div className="container-lexa relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          {/* Logo e info */}
          <div className="md:col-span-5">
            <div className="flex items-center mb-4">
              <div className="relative">
                <span className="font-['Montserrat'] font-extrabold text-2xl text-blue-400">LEXA</span>
                <span className="text-white font-['Montserrat'] font-semibold ml-1">legal</span>
                <div className="ml-1.5 mt-0.5 inline-block w-2 h-2 rounded-full bg-blue-400"></div>
              </div>
            </div>
            <p className="text-slate-300 text-sm mb-6">
              Assistente legale avanzato per professionisti del diritto, progettato per semplificare il calcolo dei rimborsi e fornire supporto normativo attraverso intelligenza artificiale.
            </p>
            <div className="flex space-x-4 mt-4">
              <a href="#" className="w-10 h-10 rounded-full bg-slate-800 hover:bg-blue-600 flex items-center justify-center text-white transition-colors duration-200">
                {/* <FacebookIcon className="w-5 h-5" fill="currentColor" /> */} F
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-slate-800 hover:bg-blue-600 flex items-center justify-center text-white transition-colors duration-200">
                {/* <InstagramIcon className="w-5 h-5" fill="currentColor" /> */} I
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-slate-800 hover:bg-blue-600 flex items-center justify-center text-white transition-colors duration-200">
                {/* <TwitterIcon className="w-5 h-5" fill="currentColor" /> */} T
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-slate-800 hover:bg-blue-600 flex items-center justify-center text-white transition-colors duration-200">
                {/* <LinkedinIcon className="w-5 h-5" fill="currentColor" /> */} L
              </a>
            </div>
          </div>

          {/* Spazio divisore */}
          <div className="md:col-span-1"></div>

          {/* Links utili */}
          <div className="md:col-span-3">
            <h4 className="font-['Montserrat'] font-semibold text-white mb-5 text-lg">Link utili</h4>
            <ul className="space-y-3">
              <li>
                <a href="#" className="text-slate-300 hover:text-blue-400 transition-colors flex items-center">
                  {/* <ChevronRightIcon className="w-3.5 h-3.5 mr-2" fill="none" stroke="currentColor"/> */} {'>'}
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="text-slate-300 hover:text-blue-400 transition-colors flex items-center">
                  {/* <ChevronRightIcon className="w-3.5 h-3.5 mr-2" fill="none" stroke="currentColor"/> */} {'>'}
                  Termini di Servizio
                </a>
              </li>
              <li>
                <a href="#" className="text-slate-300 hover:text-blue-400 transition-colors flex items-center">
                  {/* <ChevronRightIcon className="w-3.5 h-3.5 mr-2" fill="none" stroke="currentColor"/> */} {'>'}
                  FAQ
                </a>
              </li>
              <li>
                <a href="#" className="text-slate-300 hover:text-blue-400 transition-colors flex items-center">
                  {/* <ChevronRightIcon className="w-3.5 h-3.5 mr-2" fill="none" stroke="currentColor"/> */} {'>'}
                  Blog
                </a>
              </li>
            </ul>
          </div>

          {/* Contatti */}
          <div className="md:col-span-3">
            <h4 className="font-['Montserrat'] font-semibold text-white mb-5 text-lg">Contatti</h4>
            <ul className="space-y-4">
              <li className="flex items-center text-slate-300">
                <div className="bg-slate-800 rounded-lg p-2 mr-3">
                  {/* <MailIcon className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor"/> */} M
                </div>
                info@lexalegal.it
              </li>
              <li className="flex items-center text-slate-300">
                <div className="bg-slate-800 rounded-lg p-2 mr-3">
                  {/* <PhoneIcon className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor"/> */} P
                </div>
                +39 02 123 456
              </li>
              <li className="flex items-center text-slate-300">
                <div className="bg-slate-800 rounded-lg p-2 mr-3">
                  {/* <LocationMarkerIcon className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor"/> */} L
                </div>
                Milano, Italia
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-slate-800 text-center text-slate-400 text-sm">
          &copy; {new Date().getFullYear()} Lexa Legal. Tutti i diritti riservati.
        </div>
      </div>
    </footer>
  );
} 