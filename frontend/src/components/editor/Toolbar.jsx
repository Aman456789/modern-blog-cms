// frontend/src/components/editor/Toolbar.jsx
//
// REFACTOR — Cinematic Dark Theme
//
// Previous bugs:
//   • Toolbar container:  bg-[#000000] (#fff) → now bg-[#111111]
//   • TBtn inactive:      bg-[#000000] (#fff) + text-white (#fff)
//                         = white text on white background (completely invisible)
//                         → now bg-[#1a1a1a] text-white border-[#333333]
//   • TBtn active:        bg-[#000000] (#000) + text-white (#000)
//                         = black text on black background (completely invisible)
//                         → now bg-[#000000] text-white (inverted for visibility)
//   • Focus ring:         ring-white → ring-white (visible on dark canvas)
//   • Divider:            bg-[#000000] (#333) → explicit bg-[#333333] (same value, no token risk)

import { useCurrentEditor } from '@tiptap/react';

// ─── TBtn ────────────────────────────────────────────────────────────────────

function TBtn({ onClick, isActive = false, isDisabled = false, label, children, title }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault(); // prevent editor losing focus
        if (!isDisabled) onClick();
      }}
      aria-label={label}
      aria-pressed={isActive}
      title={title || label}
      disabled={isDisabled}
      className={[
        'inline-flex items-center justify-center w-7 h-7 text-sm leading-none rounded-sm transition-all duration-300',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white focus-visible:ring-offset-1 focus-visible:ring-offset-[#111111]',
        isActive
          ? 'bg-transparent text-white border border-white hover:bg-[#111111]'
          : 'bg-transparent text-[#777777] border border-[#333333] hover:text-white hover:border-white',
        isDisabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

// ─── Divider ─────────────────────────────────────────────────────────────────

function Divider() {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      className="w-px self-stretch bg-[#333333] mx-1"
    />
  );
}

// ─── Icon set (inline SVG, zero library dependency) ───────────────────────────

const icons = {
  h1: (
    <svg width="14" height="12" viewBox="0 0 14 12" fill="none" aria-hidden="true">
      <text x="0" y="11" fontFamily="sans-serif" fontSize="11" fontWeight="700" fill="currentColor">H1</text>
    </svg>
  ),
  h2: (
    <svg width="14" height="12" viewBox="0 0 14 12" fill="none" aria-hidden="true">
      <text x="0" y="11" fontFamily="sans-serif" fontSize="11" fontWeight="700" fill="currentColor">H2</text>
    </svg>
  ),
  h3: (
    <svg width="14" height="12" viewBox="0 0 14 12" fill="none" aria-hidden="true">
      <text x="0" y="11" fontFamily="sans-serif" fontSize="11" fontWeight="700" fill="currentColor">H3</text>
    </svg>
  ),
  bold: (
    <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor" aria-hidden="true">
      <path d="M1 1h4.5a3 3 0 010 6H1V1zm0 6h5a3 3 0 010 6H1V7z"/>
    </svg>
  ),
  italic: (
    <svg width="8" height="12" viewBox="0 0 8 12" fill="currentColor" aria-hidden="true">
      <path d="M3 1h4l-3 10H0"/>
    </svg>
  ),
  underline: (
    <svg width="10" height="14" viewBox="0 0 10 14" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="1.5">
      <path d="M1 1v5a4 4 0 008 0V1" strokeLinecap="round"/>
      <line x1="0" y1="13" x2="10" y2="13"/>
    </svg>
  ),
  strike: (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 2h8M4 2v4m4-4v4" strokeLinecap="round"/>
      <line x1="0" y1="7" x2="12" y2="7"/>
      <path d="M3 7v3h6V7" strokeLinecap="round"/>
    </svg>
  ),
  bulletList: (
    <svg width="12" height="10" viewBox="0 0 12 10" fill="currentColor" aria-hidden="true">
      <circle cx="1" cy="1.5" r="1"/><rect x="3.5" y="1" width="8.5" height="1"/>
      <circle cx="1" cy="5" r="1"/>  <rect x="3.5" y="4.5" width="8.5" height="1"/>
      <circle cx="1" cy="8.5" r="1"/><rect x="3.5" y="8" width="8.5" height="1"/>
    </svg>
  ),
  orderedList: (
    <svg width="12" height="10" viewBox="0 0 12 10" fill="currentColor" aria-hidden="true">
      <text x="0" y="3"  fontSize="4" fontFamily="sans-serif">1.</text>
      <rect x="4.5" y="1"   width="7.5" height="1"/>
      <text x="0" y="6.5" fontSize="4" fontFamily="sans-serif">2.</text>
      <rect x="4.5" y="4.5" width="7.5" height="1"/>
      <text x="0" y="10" fontSize="4" fontFamily="sans-serif">3.</text>
      <rect x="4.5" y="8"   width="7.5" height="1"/>
    </svg>
  ),
  blockquote: (
    <svg width="12" height="10" viewBox="0 0 12 10" fill="currentColor" aria-hidden="true">
      <rect x="0" y="0" width="2" height="10" rx="1"/>
      <rect x="4" y="1" width="8" height="1.2" rx="0.6"/>
      <rect x="4" y="4" width="6" height="1.2" rx="0.6"/>
      <rect x="4" y="7" width="7" height="1.2" rx="0.6"/>
    </svg>
  ),
  code: (
    <svg width="14" height="10" viewBox="0 0 14 10" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <polyline points="4,2 0,5 4,8"/>
      <polyline points="10,2 14,5 10,8"/>
    </svg>
  ),
  codeBlock: (
    <svg width="14" height="12" viewBox="0 0 14 12" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
      <rect x="0" y="0" width="14" height="12" rx="1"/>
      <polyline points="3,4 1,6 3,8" strokeWidth="1.5"/>
      <polyline points="11,4 13,6 11,8" strokeWidth="1.5"/>
      <line x1="5" y1="8" x2="9" y2="4"/>
    </svg>
  ),
  image: (
    <svg width="14" height="12" viewBox="0 0 14 12" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="1.2">
      <rect x="0.6" y="0.6" width="12.8" height="10.8" rx="0.8"/>
      <circle cx="4" cy="4" r="1.2"/>
      <polyline points="0.6,8 4,5 7,7.5 10,5.5 13.4,8"/>
    </svg>
  ),
  video: (
    <svg width="14" height="12" viewBox="0 0 14 12" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="1.2">
      <rect x="0.6" y="1.6" width="9.8" height="8.8" rx="0.8"/>
      <polyline points="10.4,4 13.4,2 13.4,10 10.4,8"/>
    </svg>
  ),
  clearFormat: (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <line x1="1" y1="11" x2="11" y2="1"/>
      <path d="M3 3h6"/><path d="M4 8h4"/>
    </svg>
  ),
  undo: (
    <svg width="13" height="11" viewBox="0 0 13 11" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <polyline points="4,1 1,4 4,7"/>
      <path d="M1,4 H8 a4,4 0 0,1 4,4"/>
    </svg>
  ),
  redo: (
    <svg width="13" height="11" viewBox="0 0 13 11" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <polyline points="9,1 12,4 9,7"/>
      <path d="M12,4 H5 a4,4 0 0,0 -4,4"/>
    </svg>
  ),
  link: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
    </svg>
  ),
  audio: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 18V5l12-2v13"></path>
      <circle cx="6" cy="18" r="3"></circle>
      <circle cx="18" cy="16" r="3"></circle>
    </svg>
  ),
  pdf: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
      <polyline points="10 9 9 9 8 9"></polyline>
    </svg>
  ),
};

// ─── Toolbar ─────────────────────────────────────────────────────────────────

export default function Toolbar({ editor: editorProp, onImageClick, onVideoClick, onAudioClick, onPdfClick }) {
  const { editor: editorFromCtx } = useCurrentEditor();
  const editor = editorProp ?? editorFromCtx;

  if (!editor) return null;

  const isH = (level) => editor.isActive('heading', { level });

  return (
    // FIX: was bg-[#000000] (#fff white toolbar) → now bg-[#111111] dark surface
    <div
      role="toolbar"
      aria-label="Text formatting"
      className="flex items-center flex-wrap gap-0.5 px-3 py-2.5 bg-[#111111] border-b border-[#333333] select-none"
    >
      {/* Headings */}
      <TBtn label="Heading 1" isActive={isH(1)} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>{icons.h1}</TBtn>
      <TBtn label="Heading 2" isActive={isH(2)} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>{icons.h2}</TBtn>
      <TBtn label="Heading 3" isActive={isH(3)} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>{icons.h3}</TBtn>

      <Divider />

      {/* Inline marks */}
      <TBtn label="Bold"          isActive={editor.isActive('bold')}      isDisabled={!editor.can().chain().focus().toggleBold().run()}   onClick={() => editor.chain().focus().toggleBold().run()}>{icons.bold}</TBtn>
      <TBtn label="Italic"        isActive={editor.isActive('italic')}    isDisabled={!editor.can().chain().focus().toggleItalic().run()} onClick={() => editor.chain().focus().toggleItalic().run()}>{icons.italic}</TBtn>
      <TBtn label="Underline"     isActive={editor.isActive('underline')}  onClick={() => editor.chain().focus().toggleUnderline().run()}>{icons.underline}</TBtn>
      <TBtn label="Strikethrough" isActive={editor.isActive('strike')}     onClick={() => editor.chain().focus().toggleStrike().run()}>{icons.strike}</TBtn>
      <TBtn
        label="Link"
        isActive={editor.isActive('link')}
        onClick={() => {
          const previousUrl = editor.getAttributes('link').href;
          const url = window.prompt('Enter URL:', previousUrl || '');
          if (url === null) return; // cancelled
          if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
          }
          editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
        }}
      >
        {icons.link}
      </TBtn>

      <Divider />

      {/* Lists */}
      <TBtn label="Bullet list"   isActive={editor.isActive('bulletList')}  onClick={() => editor.chain().focus().toggleBulletList().run()}>{icons.bulletList}</TBtn>
      <TBtn label="Numbered list" isActive={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>{icons.orderedList}</TBtn>

      <Divider />

      {/* Block elements */}
      <TBtn label="Blockquote"  isActive={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>{icons.blockquote}</TBtn>
      <TBtn label="Inline code" isActive={editor.isActive('code')}       onClick={() => editor.chain().focus().toggleCode().run()}>{icons.code}</TBtn>
      <TBtn label="Code block"  isActive={editor.isActive('codeBlock')}  onClick={() => editor.chain().focus().toggleCodeBlock().run()}>{icons.codeBlock}</TBtn>



      {/* History & utilities */}
      <TBtn label="Clear formatting" onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}>{icons.clearFormat}</TBtn>
      <TBtn label="Undo" isDisabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>{icons.undo}</TBtn>
      <TBtn label="Redo" isDisabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>{icons.redo}</TBtn>
    </div>
  );
}
