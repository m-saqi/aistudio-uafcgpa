import React from 'react';
import { useNavigate } from 'react-router-dom';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const handleScroll = (id: string) => {
    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="overflow-hidden">
      {/* Hero Section */}
      <section id="Home" className="py-20 px-6 relative">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="animate-in slide-in-from-left duration-700">
            <span className="inline-block bg-[#7a6ad8]/10 dark:bg-[#7a6ad8]/20 text-[#7a6ad8] dark:text-[#9f8feb] px-4 py-1.5 rounded-full text-sm font-bold mb-6 border border-[#7a6ad8]/20">
              <i className="fa-solid fa-bolt me-2"></i>Updated for 2025
            </span>
            <h1 className="text-5xl lg:text-7xl font-extrabold mb-8 leading-tight dark:text-white">
              <span className="gradient-text">UAF CGPA</span> Calculator
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300 mb-10 leading-relaxed font-light">
              Automatic fetching, accurate calculations, and profile management. The most trusted tool for University of Agriculture Faisalabad students.
            </p>
            <div className="flex flex-wrap gap-4">
              <button 
                onClick={() => navigate('/calculator')} 
                className="bg-[#7a6ad8] text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-[#6b5fca] transition-all transform hover:-translate-y-1 shadow-lg shadow-[#7a6ad8]/30 flex items-center gap-2"
              >
                <i className="fas fa-calculator"></i> Calculate Now
              </button>
              <button 
                onClick={() => handleScroll('how-it-works')} 
                className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-slate-200 dark:border-gray-700 text-slate-700 dark:text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-slate-50 dark:hover:bg-gray-700 transition-all shadow-sm"
              >
                How It Works
              </button>
            </div>
          </div>
          
          <div className="relative animate-in slide-in-from-right duration-700 hidden lg:block">
            <div className="glass p-8 rounded-[2.5rem] shadow-2xl relative z-10 border border-white/40 dark:border-gray-700">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 text-2xl">
                  <i className="fas fa-check-double"></i>
                </div>
                <div>
                  <h3 className="text-xl font-bold dark:text-white">100% Accurate</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Official UAF Grading Scale</p>
                </div>
              </div>
              <ul className="space-y-4 text-slate-600 dark:text-slate-300">
                <li className="flex gap-4 items-center bg-white/50 dark:bg-gray-800/50 p-3 rounded-xl border border-slate-100 dark:border-gray-700">
                  <i className="fas fa-circle-check text-[#7a6ad8] text-xl"></i> 
                  <div><strong>Instant LMS Sync:</strong> <span className="text-xs opacity-70 block">No manual data entry required.</span></div>
                </li>
                <li className="flex gap-4 items-center bg-white/50 dark:bg-gray-800/50 p-3 rounded-xl border border-slate-100 dark:border-gray-700">
                  <i className="fas fa-circle-check text-[#7a6ad8] text-xl"></i> 
                  <div><strong>Repeated Courses:</strong> <span className="text-xs opacity-70 block">Smartly handles highest attempts.</span></div>
                </li>
                <li className="flex gap-4 items-center bg-white/50 dark:bg-gray-800/50 p-3 rounded-xl border border-slate-100 dark:border-gray-700">
                  <i className="fas fa-circle-check text-[#7a6ad8] text-xl"></i> 
                  <div><strong>PDF Export:</strong> <span className="text-xs opacity-70 block">Professional transcript generation.</span></div>
                </li>
              </ul>
            </div>
            {/* Decor Elements */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#7a6ad8]/30 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-pink-500/30 rounded-full blur-3xl animate-pulse delay-700"></div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white/50 dark:bg-gray-900/50 transition-colors">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold mb-4 dark:text-white">Why Choose Our <span className="gradient-text">CGPA Calculator</span></h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">The most advanced and feature-rich tool for UAF students.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: 'robot', title: 'Instant & Automatic', desc: 'Enter your registration number to get your complete academic record in seconds.' },
              { icon: 'edit', title: 'Forecast & Edit', desc: 'Accurately forecast your CGPA by adding custom courses or editing semesters.' },
              { icon: 'file-pdf', title: 'Premium PDF Export', desc: 'Generate a beautifully designed, professional transcript with a single click.' },
              { icon: 'shield-halved', title: 'Secure & Personal', desc: 'No password required. Save multiple profiles securely in your own browser.' }
            ].map((f, i) => (
              <div key={i} className="p-8 rounded-[2rem] glass hover:shadow-2xl transition-all border border-white/20 dark:border-gray-700 hover:border-[#7a6ad8]/30 group hover:-translate-y-2">
                <div className="w-16 h-16 rounded-2xl bg-[#7a6ad8]/10 dark:bg-[#7a6ad8]/20 text-[#7a6ad8] dark:text-[#9f8feb] flex items-center justify-center text-3xl mb-6 group-hover:bg-[#7a6ad8] group-hover:text-white transition-colors duration-300">
                  <i className={`fas fa-${f.icon}`}></i>
                </div>
                <h4 className="font-bold text-xl mb-3 dark:text-white">{f.title}</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 px-6 bg-slate-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold mb-4 dark:text-white">How to Use <span className="gradient-text">UAF CGPA Calculator</span></h2>
            <p className="text-slate-500 dark:text-slate-400">Calculate your UAF CGPA in 4 simple steps</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: 'id-card', step: 'Step 1', title: 'Enter Registration', desc: 'Provide your Ag No. (e.g., 2020-ag-1234) to identify your records.' },
              { icon: 'cloud-arrow-down', step: 'Step 2', title: 'Fetch Results', desc: 'Our system connects to LMS and Attendance portals automatically.' },
              { icon: 'calculator', step: 'Step 3', title: 'View CGPA', desc: 'Instantly see your GPA, percentage, and semester breakdown.' },
              { icon: 'chart-line', step: 'Step 4', title: 'Edit & Forecast', desc: 'Plan your future semesters by adding mock courses and grades.' }
            ].map((s, i) => (
              <div key={i} className="relative text-center p-8 bg-white dark:bg-gray-800 rounded-[2rem] shadow-sm hover:shadow-xl transition-all border border-slate-100 dark:border-gray-700">
                <div className="text-[#7a6ad8] text-5xl mb-6 opacity-80"><i className={`fas fa-${s.icon}`}></i></div>
                <div className="text-[#7a6ad8] font-bold text-xs uppercase tracking-widest mb-3 bg-[#7a6ad8]/10 dark:bg-[#7a6ad8]/20 inline-block px-3 py-1 rounded-full">{s.step}</div>
                <h4 className="font-bold text-lg mb-3 dark:text-white">{s.title}</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Grading Info Section */}
      <section id="uaf-grading-info" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold mb-4 dark:text-white">The <span className="gradient-text">UAF Grading System</span></h2>
            <p className="text-slate-500 dark:text-slate-400">A clear breakdown of how your academic performance is measured.</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
            <div className="glass p-8 md:p-12 rounded-[2.5rem] border border-white/20 dark:border-gray-700">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 bg-[#7a6ad8] text-white rounded-2xl flex items-center justify-center text-2xl shadow-lg transform rotate-3">
                  <i className="fa-solid fa-calculator"></i>
                </div>
                <h4 className="text-2xl font-bold dark:text-white">Core Formula</h4>
              </div>
              <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">Your CGPA is determined using the official UAF 4.0 grading scale:</p>
              <div className="bg-[#7a6ad8]/5 dark:bg-[#7a6ad8]/10 p-8 rounded-2xl border border-[#7a6ad8]/20 text-center mb-8">
                <div className="text-xl md:text-2xl font-bold text-[#7a6ad8] dark:text-[#9f8feb]">CGPA = Total Quality Points ÷ Total Credit Hours</div>
              </div>
              <h5 className="font-bold mb-3 dark:text-white">Quality Points Calculation</h5>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                For each course, the grade is converted into Grade Points (4.0 to 0.0), then multiplied by the course's credit hours.
              </p>
            </div>
            <div className="glass p-8 md:p-12 rounded-[2.5rem] border border-white/20 dark:border-gray-700">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 bg-[#7a6ad8] text-white rounded-2xl flex items-center justify-center text-2xl shadow-lg transform -rotate-3">
                  <i className="fa-solid fa-star"></i>
                </div>
                <h4 className="text-2xl font-bold dark:text-white">Key Features</h4>
              </div>
              <ul className="space-y-6">
                <li className="flex gap-5 items-start">
                  <i className="fa-solid fa-check-circle text-green-500 text-2xl mt-1"></i>
                  <div>
                    <strong className="block text-lg dark:text-white mb-1">Repeated Courses</strong>
                    <span className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed block">Only the highest attempt grade is included in final CGPA calculation. All other attempts are automatically excluded.</span>
                  </div>
                </li>
                <li className="flex gap-5 items-start">
                  <i className="fa-solid fa-check-circle text-green-500 text-2xl mt-1"></i>
                  <div>
                    <strong className="block text-lg dark:text-white mb-1">Comprehensive Sync</strong>
                    <span className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed block">Pulls data from LMS and Attendance portals for complete accuracy.</span>
                  </div>
                </li>
              </ul>
            </div>
          </div>
          
          {/* Quality Point Table Section */}
          <div className="glass rounded-[2rem] p-8 md:p-12 border border-white/20 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-6">
                  <i className="fa-solid fa-table text-[#7a6ad8] text-2xl"></i>
                  <h4 className="text-2xl font-bold dark:text-white">Official UAF Quality Point Table</h4>
              </div>
              <p className="text-slate-500 dark:text-slate-400 mb-6">
                  Refer to the official UAF Quality Point Table below to understand how marks are converted into quality points and grades.
              </p>
              <div className="rounded-2xl overflow-hidden shadow-lg border border-slate-200 dark:border-gray-700 relative group cursor-zoom-in">
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors z-10"></div>
                  <img 
                      src="/assets/images/quality-point-table-uaf-cgpa-calculator-saqlain.webp" 
                      alt="Official UAF Quality Point Table by M Saqlain showing mark ranges, grades (A, B+, B, C+, C, D, F)" 
                      className="w-full h-auto object-cover transform group-hover:scale-[1.01] transition-transform duration-500"
                      title="UAF Quality Point Table by M Saqlain"
                  />
              </div>
              <p className="text-xs text-slate-400 mt-4 text-center">*Table developed by M Saqlain based on official UAF academic regulations.</p>
          </div>
        </div>
      </section>

       {/* Testimonials Section */}
       <section id="testimonials" className="py-24 px-6 bg-slate-50 dark:bg-gray-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold mb-4 dark:text-white">What Students <span className="gradient-text">Say</span></h2>
            <p className="text-slate-500 dark:text-slate-400">Trusted by over 50,000 students across all UAF departments.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { name: "Ahmad Ali", major: "BS Agriculture", text: "The best UAF CGPA calculator I've used! Saqlain's tool saved me hours. The attendance integration is a game-changer!" },
              { name: "Sarah Fatima", major: "BS Chemistry", text: "Finally, a calculator that handles repeated courses correctly! The forecasting feature helps me plan my grades perfectly." },
              { name: "M. Hamza", major: "BS Engineering", text: "I've recommended this to my entire batch. It's accurate, fast, and the PDF download feature is amazing for records." }
            ].map((t, i) => (
              <div key={i} className="glass p-8 rounded-[2rem] border border-white/40 dark:border-gray-700 shadow-sm relative hover:bg-white/40 dark:hover:bg-gray-800 transition-colors">
                <div className="text-yellow-400 text-sm mb-4"><i className="fas fa-star"></i><i className="fas fa-star"></i><i className="fas fa-star"></i><i className="fas fa-star"></i><i className="fas fa-star"></i></div>
                <p className="text-slate-600 dark:text-slate-300 italic mb-6">"{t.text}"</p>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#7a6ad8] to-pink-500 text-white flex items-center justify-center font-bold text-sm">
                    {t.name.split(' ').map(n=>n[0]).join('')}
                  </div>
                  <div>
                    <div className="font-bold text-sm dark:text-white">{t.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{t.major}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 px-6 bg-white dark:bg-gray-800 transition-colors">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold mb-4 dark:text-white">Frequently Asked <span className="gradient-text">Questions</span></h2>
            <p className="text-slate-500 dark:text-slate-400">Everything you need to know about M Saqlain's UAF Calculator.</p>
          </div>
          <div className="space-y-4">
            {[
              { q: 'How does it fetch my data?', a: 'It connects directly to the public-facing UAF LMS using your Ag No. It does not require your password.' },
              { q: 'Is it official?', a: 'It is a third-party tool developed by a UAF alumnus. While unofficial, it is highly accurate and widely used.' },
              { q: 'Does it work for B.Ed?', a: 'Yes! It includes a dedicated mode for B.Ed. programs with their specific grading structures.' },
              { q: 'Is my data safe?', a: 'Absolutely. We process data locally in your browser and never store your information on our servers.' }
            ].map((faq, i) => (
              <details key={i} className="group bg-slate-50 dark:bg-gray-900 rounded-2xl shadow-sm border border-transparent hover:border-[#7a6ad8]/20 transition-all overflow-hidden">
                <summary className="flex justify-between items-center p-6 cursor-pointer font-bold list-none dark:text-white outline-none">
                  {faq.q}
                  <i className="fas fa-chevron-down group-open:rotate-180 transition-transform text-[#7a6ad8]"></i>
                </summary>
                <div className="px-6 pb-6 text-sm text-slate-500 dark:text-slate-400 leading-relaxed border-t dark:border-gray-800 pt-4">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* About Developer */}
      <section id="about-developer-premium" className="py-24 px-6 bg-[#7a6ad8]/5 dark:bg-[#7a6ad8]/10 transition-colors">
        <div className="max-w-5xl mx-auto glass rounded-[3rem] overflow-hidden shadow-2xl grid grid-cols-1 md:grid-cols-5 border border-white/40 dark:border-gray-700">
          <div className="md:col-span-2 bg-[#7a6ad8] p-12 text-white flex flex-col items-center text-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/20"></div>
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-white/20 blur-2xl rounded-full"></div>
              <img src="assets/images/developer-uaf-cgpa-calculator-m-saqlain.webp" alt="M Saqlain" className="w-32 h-32 rounded-full border-4 border-white/50 shadow-2xl relative z-10 object-cover" />
            </div>
            <h3 className="text-2xl font-bold mb-2">M Saqlain</h3>
            <span className="bg-white/20 backdrop-blur-md px-4 py-1 rounded-full text-xs font-bold mb-4 border border-white/10">UAF Alumnus (2020-2024)</span>
          </div>
          <div className="md:col-span-3 p-12 dark:bg-gray-800 flex flex-col justify-center">
            <h4 className="text-sm font-bold text-[#7a6ad8] uppercase tracking-widest mb-4">The Developer</h4>
            <h2 className="text-3xl md:text-4xl font-extrabold mb-6 dark:text-white leading-tight">The Mind Behind the <span className="gradient-text">UAF Hub</span></h2>
            <p className="text-slate-600 dark:text-slate-300 mb-8 leading-relaxed">
              While pursuing my BS Chemistry at UAF, I realized the struggle students face with fragmented result portals. I developed this tool to make academic tracking easier, faster, and more accurate for everyone.
            </p>
            <div className="flex gap-3">
              <a href="https://linkedin.com/in/muhammad-saqlain-akbar/" target="_blank" className="px-4 py-2 rounded-lg bg-[#0077b5]/10 text-[#0077b5] font-bold text-sm hover:bg-[#0077b5] hover:text-white transition-all"><i className="fab fa-linkedin me-2"></i>LinkedIn</a>
              <a href="https://github.com/msaqlain" target="_blank" className="px-4 py-2 rounded-lg bg-gray-800/10 text-gray-800 dark:text-white dark:bg-white/10 font-bold text-sm hover:bg-gray-800 hover:text-white transition-all"><i className="fab fa-github me-2"></i>GitHub</a>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact-us" className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-extrabold mb-6 dark:text-white">Get in <span className="gradient-text">Touch</span></h2>
          <p className="text-slate-500 dark:text-slate-400 mb-10 leading-relaxed">Questions or suggestions? Contact the developer via social media.</p>
          <div className="flex justify-center gap-6">
            <a href="https://facebook.com/UAFChemist.Rustam" target="_blank" rel="noopener noreferrer" className="w-16 h-16 glass rounded-2xl flex items-center justify-center text-3xl text-[#1877f2] hover:scale-110 hover:bg-[#1877f2] hover:text-white transition-all shadow-sm border border-slate-200 dark:border-gray-700"><i className="fab fa-facebook"></i></a>
            <a href="https://x.com/M_Saqlain_Akbar" target="_blank" rel="noopener noreferrer" className="w-16 h-16 glass rounded-2xl flex items-center justify-center text-3xl text-black dark:text-white hover:scale-110 hover:bg-black hover:text-white transition-all shadow-sm border border-slate-200 dark:border-gray-700"><i className="fab fa-x-twitter"></i></a>
            <a href="https://linkedin.com/in/muhammad-saqlain-akbar/" target="_blank" rel="noopener noreferrer" className="w-16 h-16 glass rounded-2xl flex items-center justify-center text-3xl text-[#0077b5] hover:scale-110 hover:bg-[#0077b5] hover:text-white transition-all shadow-sm border border-slate-200 dark:border-gray-700"><i className="fab fa-linkedin"></i></a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;