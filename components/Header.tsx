import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

interface HeaderProps {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const Header: React.FC<HeaderProps> = ({ isDarkMode, toggleTheme }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const scrollToSection = (id: string) => {
    setIsMenuOpen(false);
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <nav className="fixed top-4 left-1/2 transform -translate-x-1/2 w-[90%] max-w-4xl z-50 transition-all duration-300">
      <div className="glass rounded-full px-6 py-3 shadow-2xl border border-white/40 dark:border-gray-700 flex justify-between items-center relative">
        
        {/* Logo Area */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7a6ad8] to-[#ff6b6b] flex items-center justify-center text-white font-bold text-xs shadow-lg group-hover:scale-110 transition-transform">
            UAF
          </div>
          <span className="font-bold text-lg tracking-tight hidden sm:block bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300">
            CGPA Calc
          </span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-1 bg-slate-100/50 dark:bg-gray-800/50 p-1 rounded-full backdrop-blur-sm">
          {[
            { label: 'Home', path: '/', action: () => navigate('/') },
            { label: 'Calculator', path: '/calculator', action: () => navigate('/calculator') },
            { label: 'Features', id: 'features', action: () => scrollToSection('features') },
            { label: 'FAQ', id: 'faq', action: () => scrollToSection('faq') },
          ].map((item, idx) => (
            <button
              key={idx}
              onClick={item.action}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-300 ${
                location.pathname === item.path 
                  ? 'bg-white dark:bg-gray-700 text-[#7a6ad8] dark:text-white shadow-sm' 
                  : 'text-slate-600 dark:text-slate-300 hover:text-[#7a6ad8] hover:bg-white/50 dark:hover:bg-gray-700/50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button 
            onClick={toggleTheme}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-yellow-400 hover:bg-slate-200 dark:hover:bg-gray-600 transition-colors shadow-inner"
            aria-label="Toggle Theme"
          >
            <i className={`fas fa-${isDarkMode ? 'sun' : 'moon'}`}></i>
          </button>
          
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden w-9 h-9 rounded-full flex items-center justify-center bg-[#7a6ad8] text-white shadow-md hover:bg-[#6b5fca] transition-colors"
          >
            <i className={`fas fa-${isMenuOpen ? 'times' : 'bars'}`}></i>
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMenuOpen && (
          <div className="absolute top-full left-0 w-full mt-2 p-2 rounded-3xl glass shadow-xl animate-in slide-in-from-top-2 md:hidden overflow-hidden border border-white/20 dark:border-gray-700">
            <div className="bg-white/50 dark:bg-gray-800/50 rounded-2xl p-2 flex flex-col gap-1">
              <Link to="/" onClick={() => setIsMenuOpen(false)} className="px-4 py-3 rounded-xl hover:bg-white dark:hover:bg-gray-700 font-medium text-slate-700 dark:text-slate-200 flex items-center gap-3 transition-colors">
                <i className="fas fa-home opacity-50"></i> Home
              </Link>
              <Link to="/calculator" onClick={() => setIsMenuOpen(false)} className="px-4 py-3 rounded-xl hover:bg-white dark:hover:bg-gray-700 font-medium text-slate-700 dark:text-slate-200 flex items-center gap-3 transition-colors">
                <i className="fas fa-calculator opacity-50"></i> Calculator
              </Link>
              <button onClick={() => scrollToSection('features')} className="px-4 py-3 rounded-xl hover:bg-white dark:hover:bg-gray-700 font-medium text-slate-700 dark:text-slate-200 flex items-center gap-3 text-left transition-colors">
                <i className="fas fa-star opacity-50"></i> Features
              </button>
              <button onClick={() => scrollToSection('faq')} className="px-4 py-3 rounded-xl hover:bg-white dark:hover:bg-gray-700 font-medium text-slate-700 dark:text-slate-200 flex items-center gap-3 text-left transition-colors">
                <i className="fas fa-question-circle opacity-50"></i> FAQ
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Header;