import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import OutlineButton from '../ui/OutlineButton.jsx';
import LoadingSpinner from '../ui/LoadingSpinner.jsx';
import api from '../../services/api.js';

function NavLink({ to, children, end }) {
  const loc = useLocation();
  const active = end ? loc.pathname === to : (loc.pathname === to || loc.pathname.startsWith(to + '/'));
  return (
    <Link
      to={to}
      className={`px-3 py-2 text-sm font-semibold ${active ? 'text-white border-b border-white' : 'text-[#777777] hover:text-white'} transition-colors`}
    >
      {children}
    </Link>
  );
}

export default function TopNav({ onLogout }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isVisible, setIsVisible]               = useState(true);
  const lastScrollY                              = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const current = window.scrollY;
      // Always show when near the top
      if (current < 50) {
        setIsVisible(true);
      } else if (current > lastScrollY.current) {
        // Scrolling down → hide
        setIsVisible(false);
      } else {
        // Scrolling up → reveal
        setIsVisible(true);
      }
      lastScrollY.current = current;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  return (
    <header
      className={[
        'fixed top-0 left-0 w-full z-50 bg-[#000000]/95 backdrop-blur-sm',
        'transition-transform duration-300 ease-in-out',
        isVisible ? 'translate-y-0' : '-translate-y-full',
      ].join(' ')}
    >
      <div className="max-w-7xl mx-auto px-6 py-1.5 md:py-1 flex items-center justify-between gap-4">
        <div className="flex items-center justify-between w-full md:w-auto md:justify-start md:gap-6">
          <Link to="/admin" className="flex items-center gap-3">
            <img 
              src="/fotographiya.webp" 
              alt="Fotographiya Logo" 
              className="h-6 md:h-8 w-auto object-contain drop-shadow-sm hover:opacity-90 transition-opacity"
            />
          </Link>
          <div className="flex md:hidden">
            <button onClick={() => setIsMobileMenuOpen(true)} className="text-white p-2">
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
            </button>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-2">
          <NavLink to="/admin" end>Dashboard</NavLink>
          <NavLink to="/admin/posts">Posts</NavLink>
          <NavLink to="/admin/media">Media</NavLink>
          <NavLink to="/admin/pin">Pin</NavLink>
          <NavLink to="/admin/settings">Settings</NavLink>
          <NavLink to="/admin/trash">Trash</NavLink>
        </nav>

        <div className="hidden md:flex items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="font-sans text-sm text-white uppercase tracking-[0.18em]">Admin</span>
            <button
              type="button"
              onClick={onLogout}
              className="text-sm text-[#777777] hover:text-white transition-colors"
              aria-label="Log out"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <>
          <div 
            className="fixed inset-0 h-screen w-screen bg-black z-[998] transition-opacity duration-300 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="fixed top-24 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-6 z-[999] flex flex-col gap-6 md:hidden">
            <div className="flex justify-end">
              <button onClick={() => setIsMobileMenuOpen(false)} className="text-white hover:text-gray-300 transition-colors">
                <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="flex flex-col gap-6 text-xl items-center">
              <Link to="/admin" onClick={() => setIsMobileMenuOpen(false)} className="text-white hover:text-gray-300">Dashboard</Link>
              <Link to="/admin/posts" onClick={() => setIsMobileMenuOpen(false)} className="text-white hover:text-gray-300">Posts</Link>
              <Link to="/admin/media" onClick={() => setIsMobileMenuOpen(false)} className="text-white hover:text-gray-300">Media</Link>
              <Link to="/admin/pin" onClick={() => setIsMobileMenuOpen(false)} className="text-white hover:text-gray-300">Pin</Link>
              <Link to="/admin/settings" onClick={() => setIsMobileMenuOpen(false)} className="text-white hover:text-gray-300">Settings</Link>
              <Link to="/admin/trash" onClick={() => setIsMobileMenuOpen(false)} className="text-white hover:text-gray-300">Trash</Link>
              
              <div className="w-full h-px bg-white/20 my-2"></div>
              
              <button 
                type="button" 
                onClick={() => { setIsMobileMenuOpen(false); onLogout(); }} 
                className="text-white/70 hover:text-white transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </>
      )}
    </header>
  );
}

