
import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

const Footer: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const scrollToSection = (id: string) => {
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
    <footer className="bg-slate-50 dark:bg-gray-800 border-t dark:border-gray-800 py-12 transition-colors">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="col-span-1 md:col-span-1">
          <Link to="/" className="flex items-center gap-2 mb-4">
            <span className="bg-[#7a6ad8] text-white font-bold px-2 py-0.5 rounded-full text-xs">UAF</span>
            <span className="font-extrabold text-lg gradient-text">CGPA Calculator</span>
          </Link>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
            The #1 automatic CGPA calculator for University of Agriculture Faisalabad (UAF) students. Developed by M Saqlain to be accurate, fast, and free.
          </p>
          <div className="flex gap-4">
            <a href="https://facebook.com/UAFChemist.Rustam" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-[#7a6ad8] transition-colors"><i className="fab fa-facebook text-xl"></i></a>
            <a href="https://x.com/M_Saqlain_Akbar" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-[#7a6ad8] transition-colors"><i className="fab fa-x-twitter text-xl"></i></a>
            <a href="https://linkedin.com/in/muhammad-saqlain-akbar/" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-[#7a6ad8] transition-colors"><i className="fab fa-linkedin text-xl"></i></a>
          </div>
        </div>

        <div>
          <h4 className="font-bold mb-6 dark:text-white">Quick Links</h4>
          <ul className="flex flex-col gap-4 text-sm text-slate-600 dark:text-slate-400">
            <li><Link to="/" className="hover:text-[#7a6ad8] transition-colors">Home</Link></li>
            <li><Link to="/calculator" className="hover:text-[#7a6ad8] transition-colors">Calculator</Link></li>
            <li><button onClick={() => scrollToSection('features')} className="hover:text-[#7a6ad8] transition-colors text-left">Features</button></li>
            <li><button onClick={() => scrollToSection('faq')} className="hover:text-[#7a6ad8] transition-colors text-left">FAQ</button></li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold mb-6 dark:text-white">Resources</h4>
          <ul className="flex flex-col gap-4 text-sm text-slate-600 dark:text-slate-400">
            <li><button onClick={() => scrollToSection('uaf-grading-info')} className="hover:text-[#7a6ad8] transition-colors text-left">Grading System</button></li>
            <li><button onClick={() => scrollToSection('about-developer-premium')} className="hover:text-[#7a6ad8] transition-colors text-left">About Developer</button></li>
            <li><button onClick={() => scrollToSection('contact-us')} className="hover:text-[#7a6ad8] transition-colors text-left">Contact Us</button></li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold mb-6 dark:text-white">Disclaimer</h4>
          <p className="text-xs text-slate-500 italic">
            This is an unofficial, third-party tool developed by a UAF alumnus. It is not affiliated with or endorsed by UAF.
          </p>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-6 mt-12 pt-8 border-t dark:border-gray-700 text-center text-xs text-slate-500">
        <p>© 2025 Muhammad Saqlain. All rights reserved.</p>
        <p className="mt-2">Trusted by 50,000+ Students | Developed with ❤️ for UAF</p>
      </div>
    </footer>
  );
};

export default Footer;
