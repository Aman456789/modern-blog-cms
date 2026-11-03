import { Link } from "react-router-dom";
import { useState, useEffect, useRef } from "react";

export default function PublicNav() {
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Hide if scrolling down and past 50px (to prevent jitter at the very top)
      if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
        setIsVisible(false);
      } else if (currentScrollY < lastScrollY.current) {
        // Show if scrolling up
        setIsVisible(true);
      }
      
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header 
      className={`w-full bg-[#000000] py-2 md:py-1.5 fixed top-0 z-50 border-b border-[#2a2a2a]/30 transition-transform duration-300 ease-in-out ${
        isVisible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center">
        {/* Minimal Image Logo */}
        <Link to="/blog" className="font-syne text-2xl font-bold text-white tracking-widest uppercase">
          <img 
            src="/fotographiya.webp" 
            alt="Fotographiya Logo" 
            className="h-8 md:h-11 w-auto object-contain drop-shadow-sm hover:opacity-90 transition-opacity"
          />
        </Link>
      </div>
    </header>
  );
}
