import { scrollToTop } from '../utils/lenis'

function GithubIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="currentColor" 
      aria-hidden="true"
    >
      <path 
        fillRule="evenodd" 
        clipRule="evenodd" 
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" 
      />
    </svg>
  )
}

export default function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-40 px-4 sm:px-8 md:px-14 py-3 sm:py-3.5 flex justify-between items-center bg-white/60 backdrop-blur-md border-b border-black/[0.08] shadow-[0_2px_15px_rgba(0,0,0,0.03)] select-none pointer-events-auto transition-all">
      {/* Brand logo */}
      <button 
        onClick={() => scrollToTop(false)}
        className="font-bold text-lg sm:text-xl md:text-2xl tracking-[0.2em] md:tracking-[0.25em] font-aquire uppercase hover:text-[#c93b2b] text-[#161216] transition-colors cursor-pointer shrink-0"
      >
        MD AASIF
      </button>

      {/* Clean Right Actions */}
      <div className="flex items-center gap-3 sm:gap-6">
        <a
          href="https://github.com/aasif-md1"
          target="_blank"
          rel="noreferrer"
          className="px-3.5 sm:px-4 py-1.5 rounded-full text-[11px] sm:text-xs font-mono tracking-wider transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 border shadow-sm bg-white/90 border-black/10 text-[#161216] hover:bg-white hover:border-[#c93b2b] hover:text-[#c93b2b]"
        >
          <GithubIcon className="w-3.5 h-3.5 shrink-0" />
          <span>@aasif-md1</span>
        </a>
      </div>
    </nav>
  )
}
