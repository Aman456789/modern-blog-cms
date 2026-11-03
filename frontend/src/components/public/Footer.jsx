// frontend/src/components/public/Footer.jsx
//
// Adapted from the uploaded Footer.jsx + footer.css (now merged into globals.css).
// Logo path corrected to match the project's asset directory.
// GSAP marquee preserved exactly. All Links and social hrefs preserved.
// No Navbar anywhere in this file — per the UI & UX brief.

import { Link } from "react-router-dom";
import { useEffect, useRef } from "react";
import gsap from "gsap";
// Logo lives in /public — no ES import needed.
// Vite serves /public as the static root, so reference it as a plain URL.
// Your file is public/logo.webp → URL is simply "/logo.webp"
const LOGO_URL = "/logo.webp";

export default function Footer() {
  const marqueeRef = useRef(null);

  useEffect(() => {
    const el = marqueeRef.current;
    if (!el) return;

    const width = el.scrollWidth / 2;

    gsap.set(el, { x: 0 });

    const tween = gsap.to(el, {
      x: -width,
      duration: 25,
      ease: "linear",
      repeat: -1,
    });

    // Respect prefers-reduced-motion — pause the marquee if the user
    // has requested reduced motion; the CSS rule in globals.css suppresses
    // duration but GSAP runs JS-side so we need to pause explicitly too.
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) tween.pause();

    return () => {
      tween.kill();
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="footer">
      {/* ===== TOP ===== */}
      <div className="footer-top">
        {/* Logo */}
        <div className="footer-logo flex flex-col items-start">
          <img loading="lazy" src={LOGO_URL} alt="Fotographiya" className="h-8 md:h-11 w-auto object-contain drop-shadow-sm opacity-90 hover:opacity-100 transition-opacity" />
        </div>

        {/* Link columns */}
        <div className="footer-links">
          {/* Contact Us */}
          <div className="footer-col">
            <p className="uppercase tracking-widest text-[#555555] text-xs font-bold mb-6">Contact Us</p>
            <Link to="/" onClick={scrollToTop}>Home</Link>
            <Link to="/about" onClick={scrollToTop}>About Us</Link>
            <Link to="/contact" onClick={scrollToTop}>Contact Us</Link>
          </div>

          {/* Studio Location */}
          <div className="footer-col">
            <p className="uppercase tracking-widest text-[#555555] text-xs font-bold mb-6">Studio Location</p>
            <span className="text-[#a0a0a0] text-sm leading-[1.8] block mb-4 max-w-[200px] font-light">
              F3, Ballabh Bari,<br/>
              Near 7 Wonders,<br/>
              Electricity Board Area,<br/>
              Kota, Rajasthan 324007
            </span>
            <a href="tel:+919001110144" className="text-white hover:text-[#deff9a] transition-colors text-sm font-light">+91 9001110144</a>
          </div>

          {/* Work */}
          <div className="footer-col">
            <p className="uppercase tracking-widest text-[#555555] text-xs font-bold mb-6">Work</p>
            <Link to="/portfolio" onClick={scrollToTop}>Portfolio</Link>
            <Link to="/services" onClick={scrollToTop}>All Services</Link>
            <Link to="/services/wedding" onClick={scrollToTop}>Wedding</Link>
            <Link to="/services/pre-wedding" onClick={scrollToTop}>Pre Wedding</Link>
            <Link to="/services/destination" onClick={scrollToTop}>Destination</Link>
            <Link to="/services/corporate" onClick={scrollToTop}>Corporate</Link>
            <Link to="/services/birthday" onClick={scrollToTop}>Birthday</Link>
            <Link to="/services/roka" onClick={scrollToTop}>Roka</Link>
            <Link to="/services/maternity" onClick={scrollToTop}>Maternity</Link>
            <Link to="/academy" onClick={scrollToTop}>Academy</Link>
          </div>

          {/* Socials */}
          <div className="footer-col">
            <p className="uppercase tracking-widest text-[#555555] text-xs font-bold mb-6">Socials</p>
            <a
              href="https://www.instagram.com/fotographiya_official/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Instagram
            </a>
            <a
              href="https://www.linkedin.com/company/fotographiya-the-wedding-photography/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Linkedin
            </a>
            <a
              href="https://www.facebook.com/profile.php?id=100092454265642"
              target="_blank"
              rel="noopener noreferrer"
            >
              Facebook
            </a>
            <a
              href="https://www.youtube.com/@Fotographiya_official"
              target="_blank"
              rel="noopener noreferrer"
            >
              YouTube
            </a>
            <a
              href="https://www.pexels.com/@fotographiya-wedding-photography-823737813/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Pexels
            </a>
            <a
              href="https://www.reddit.com/user/Foreign-Barracuda340/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Reddit
            </a>
            <a
              href="https://medium.com/@fotographiyaworld"
              target="_blank"
              rel="noopener noreferrer"
            >
              Medium
            </a>
          </div>
        </div>
      </div>

      {/* ===== GSAP MARQUEE ===== */}
      <div className="footer-marquee" aria-hidden="true">
        <div className="marquee-track" ref={marqueeRef}>
          <span>ENTER THE NEW AGE OF WEDDING PHOTOGRAPHY</span>
          <span className="dot" />
          <span>ENTER THE NEW AGE OF WEDDING PHOTOGRAPHY</span>
          <span className="dot" />
          <span>ENTER THE NEW AGE OF WEDDING PHOTOGRAPHY</span>
          <span className="dot" />
          <span>ENTER THE NEW AGE OF WEDDING PHOTOGRAPHY</span>
        </div>
      </div>

      {/* ===== BOTTOM ===== */}
      <div className="footer-bottom">
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="back-to-top" aria-label="Back to top">
          <span>Back to top</span>
          <div className="arrow" aria-hidden="true">↑</div>
        </button>
      </div>
    </footer>
  );
}
