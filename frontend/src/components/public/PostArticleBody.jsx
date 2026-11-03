// frontend/src/components/public/PostArticleBody.jsx
//
// Renders a post's rich-text HTML body on SinglePost.jsx. The `html`
// prop is expected to already be sanitized server-side (utils/sanitize.js
// strips it on the way into the database via DOMPurify), so this
// component doesn't sanitize again — it only handles typography.
//
// No @tailwindcss/typography plugin is confirmed installed in this
// project yet, so rather than depend on an unverified `prose` class, the
// handful of element-level overrides below are written as Tailwind
// arbitrary-descendant selectors on the wrapping div — same technique
// used for the range-slider thumb styling in CompressionMeter.jsx.
//
// Props:
//   html — string (pre-sanitized HTML from Post.content)

export default function PostArticleBody({ content }) {
  if (!content) return null;

  return (
    <div className="post-article-typography text-[#d4d4d8] text-lg leading-[1.8] font-light">
      
      {/* Add these 4 classes to ensure long text never breaks the mobile screen */}
      <div 
        className="w-full max-w-full overflow-hidden break-all sm:break-words content-inner" 
        dangerouslySetInnerHTML={{ __html: content }} 
      />

      {/* Smart Typography CSS (Scoped) */}
      <style jsx="true">{`
        /* Base Spacing */
        .content-inner p { margin-bottom: 1.5rem; word-wrap: break-word; }
        .content-inner h1, .content-inner h2, .content-inner h3 { 
          color: #ffffff; font-weight: 500; margin-top: 2.5rem; margin-bottom: 1rem; line-height: 1.3;
        }
        .content-inner h2 { font-size: 1.75rem; }
        .content-inner h3 { font-size: 1.5rem; }

        /* Formatting */
        .content-inner strong, .content-inner b { color: #ffffff; font-weight: 600; }
        .content-inner a { color: #deff9a; text-decoration: underline; text-underline-offset: 4px; transition: color 0.3s; }
        .content-inner a:hover { color: #ffffff; }

        /* Lists (Fixing missing bullets/numbers) */
        .content-inner ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 1.5rem; }
        .content-inner ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 1.5rem; }
        .content-inner li { margin-bottom: 0.5rem; }
        .content-inner li::marker { color: #888888; }

        /* Quotes (Breakout Effect) */
        .content-inner blockquote {
          margin: 2rem 0; padding: 1.5rem 2rem;
          border-left: 4px solid #deff9a;
          background: rgba(255, 255, 255, 0.03);
          font-style: italic; color: #a1a1aa;
          border-radius: 0 1rem 1rem 0;
        }

        /* Smart Code Blocks (Fixing Overflow & Glassmorphism) */
        .content-inner pre {
          background: rgba(0, 0, 0, 0.5) !important;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 0.75rem;
          padding: 1.25rem;
          margin: 1.5rem 0;
          overflow-x: auto; /* Fixes horizontal scroll */
          white-space: pre-wrap; /* Forces long strings to break to next line */
          word-wrap: break-word; /* Backup break */
          color: #e4e4e7;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 0.9rem;
          box-shadow: inset 0 2px 10px rgba(0,0,0,0.5);
        }
        
        /* Inline Code */
        .content-inner code {
          background: rgba(255, 255, 255, 0.1);
          padding: 0.2rem 0.4rem;
          border-radius: 0.25rem;
          font-size: 0.85em;
          color: #deff9a;
        }
        /* Remove background from code inside pre */
        .content-inner pre code { background: transparent; padding: 0; color: inherit; }

        /* Details & Summary */
        .content-inner details {
          background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 0.75rem; padding: 1rem; margin-bottom: 1.5rem;
        }
        .content-inner summary { cursor: pointer; font-weight: 600; color: #ffffff; outline: none; }
        
        /* Breakout Media (Images/Videos within content) */
        .content-inner img, .content-inner video {
          max-width: 100%; height: auto; border-radius: 0.75rem; margin: 2rem auto;
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }
      `}</style>
    </div>
  );
}
