import { useState, useEffect, useRef, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import Scene, { type GyroStatus } from './components/Scene'
import UIOverlay from './components/UIOverlay'
import Nav from './components/Nav'
import Preloader from './components/Preloader'
import CanvasLoader from './components/CanvasLoader'
import ScrollProgressRail from './components/ScrollProgressRail'
import { initLenis, destroyLenis, scrollToTop } from './utils/lenis'
import { useDeviceTier } from './hooks/useDeviceTier'
import SpeedWarpTransition from './components/SpeedWarpTransition'

export default function App() {
  const [loaded, setLoaded] = useState(false)
  const [gyroStatus, setGyroStatus] = useState<GyroStatus>('idle')
  const [currentView, setCurrentView] = useState<'torii' | 'kage'>('torii')
  const [transitionActive, setTransitionActive] = useState(false)
  const [transitionDest, setTransitionDest] = useState<'kage' | 'torii'>('kage')
  const [toriiKey, setToriiKey] = useState(0)
  const kageIframeRef = useRef<HTMLIFrameElement | null>(null)
  const { isMobile, dpr, shadows, shadowMapSize } = useDeviceTier()

  // Initialize Lenis smooth scroll and guarantee initial load starts strictly at top: 0
  useEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual'
    }
    initLenis()
    scrollToTop(true)

    document.documentElement.style.backgroundColor = '#eef2f6'
    document.body.style.backgroundColor = '#eef2f6'

    return () => {
      destroyLenis()
    }
  }, [])

  // Listen for Return to Torii and Kage Ready events
  useEffect(() => {
    const handleMsg = (e: MessageEvent) => {
      if (e.data?.type === 'RETURN_TO_TORII') {
        handleReturnToTorii()
      } else if (e.data?.type === 'KAGE_READY') {
        if (currentView === 'kage' || transitionActive) {
          kageIframeRef.current?.contentWindow?.postMessage({ type: 'VIEW_ACTIVE' }, '*')
          kageIframeRef.current?.contentWindow?.postMessage({ type: 'RESET_TOP' }, '*')
        }
      }
    }
    window.addEventListener('message', handleMsg)
    return () => window.removeEventListener('message', handleMsg)
  }, [currentView, transitionActive])

  // Transition from Torii Walk to Kage Night Temple Scene
  const handleContinue = () => {
    if (transitionActive) return
    setTransitionDest('kage')
    setTransitionActive(true)

    const sendKagePulse = () => {
      kageIframeRef.current?.contentWindow?.postMessage({ type: 'VIEW_ACTIVE' }, '*')
      kageIframeRef.current?.contentWindow?.postMessage({ type: 'RESET_TOP' }, '*')
    }

    sendKagePulse()
    const pulseTimer = setInterval(sendKagePulse, 100)
    setTimeout(() => clearInterval(pulseTimer), 2500)

    // Failsafe timer: guarantees transition never gets stuck on black screen
    setTimeout(() => {
      setCurrentView('kage')
      setTransitionActive(false)
      document.documentElement.style.backgroundColor = '#05070a'
      document.body.style.backgroundColor = '#05070a'
      sendKagePulse()
    }, 2000)
  }

  // Return to Torii Shrine Walk: start from the very beginning at top
  const handleReturnToTorii = () => {
    setTransitionDest('torii')
    setTransitionActive(true)
  }

  const handleTransitionMidpoint = () => {
    if (transitionDest === 'kage') {
      setCurrentView('kage')
      document.documentElement.style.backgroundColor = '#05070a'
      document.body.style.backgroundColor = '#05070a'
      kageIframeRef.current?.contentWindow?.postMessage({ type: 'VIEW_ACTIVE' }, '*')
      kageIframeRef.current?.contentWindow?.postMessage({ type: 'RESET_TOP' }, '*')
    } else {
      setCurrentView('torii')
      setToriiKey((prev) => prev + 1)
      document.documentElement.style.backgroundColor = '#eef2f6'
      document.body.style.backgroundColor = '#eef2f6'
      kageIframeRef.current?.contentWindow?.postMessage({ type: 'VIEW_PAUSED' }, '*')
      kageIframeRef.current?.contentWindow?.postMessage({ type: 'RESET_TOP' }, '*')

      window.scrollTo(0, 0)
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
      scrollToTop(true)

      requestAnimationFrame(() => {
        window.scrollTo(0, 0)
        document.documentElement.scrollTop = 0
        document.body.scrollTop = 0
        scrollToTop(true)
      })
    }
  }

  const handleTransitionComplete = () => {
    setTransitionActive(false)
    if (transitionDest === 'torii') {
      window.scrollTo(0, 0)
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
      scrollToTop(true)
    } else if (transitionDest === 'kage') {
      kageIframeRef.current?.contentWindow?.postMessage({ type: 'RESET_TOP' }, '*')
    }
  }

  return (
    <div className="bg-[#eef2f6] text-[#161216] min-h-screen w-full max-w-full relative selection:bg-[#c93b2b] selection:text-white transition-colors duration-700">
      {/* Authentic Initial Preloader Screen */}
      <Preloader onLoaded={() => setLoaded(true)} />

      {/* ============================ ACT 2: KAGE NIGHT TEMPLE SCENE (Pre-warmed in background) ======================= */}
      <div
        className={`fixed inset-0 w-screen h-screen z-50 bg-[#05070a] overflow-hidden transition-opacity duration-300 ${
          currentView === 'kage' ? 'opacity-100 pointer-events-auto visible' : 'opacity-0 pointer-events-none invisible'
        }`}
      >
        <iframe
          ref={kageIframeRef}
          src="/landing-pages/kage.html"
          title="Md Aasif — Creative Full-Stack Developer & 3D Engineer"
          className="w-full h-full border-0 block"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          loading="eager"
          onLoad={() => {
            if (currentView === 'kage' || transitionActive) {
              kageIframeRef.current?.contentWindow?.postMessage({ type: 'VIEW_ACTIVE' }, '*')
              kageIframeRef.current?.contentWindow?.postMessage({ type: 'RESET_TOP' }, '*')
            }
          }}
        />
      </div>

      {/* ============================ ACT 1: TORII SHRINE WALK ======================= */}
      <div className={currentView === 'kage' ? 'hidden' : 'block'}>
        {/* Navigation Header */}
        <Nav />
        
        {/* Fixed Fullscreen 3D Canvas Background */}
        <div className="fixed inset-0 w-screen h-screen z-0 pointer-events-none">
          <Canvas
            frameloop={currentView === 'kage' ? 'never' : 'always'}
            shadows={shadows}
            eventSource={typeof document !== 'undefined' ? (document.getElementById('root') || undefined) : undefined}
            camera={{ position: [0, 2.4, 7], fov: 46, near: 0.5, far: 500 }}
            dpr={dpr}
            gl={{ antialias: !isMobile, alpha: false, powerPreference: 'high-performance' }}
            className="w-full h-full"
          >
            {/* Shrine Ambient, Fog & Natural Sunlight Lighting */}
            <color attach="background" args={['#eef2f6']} />
            <fog attach="fog" args={['#eef2f6', 16, 80]} />
            <ambientLight intensity={0.55} color="#ffffff" />
            {/* Primary Key Sunlight: illuminates the corridor, vermilion lacquer and foliage naturally */}
            <directionalLight 
              castShadow={shadows}
              position={[18, 24, 12]} 
              intensity={2.3} 
              color="#fff8ed" 
              shadow-mapSize-width={shadowMapSize}
              shadow-mapSize-height={shadowMapSize}
              shadow-camera-left={-30}
              shadow-camera-right={30}
              shadow-camera-top={30}
              shadow-camera-bottom={-30}
              shadow-camera-far={90}
              shadow-bias={-0.0005}
            />
            {/* Horizon Sun Back-Glow: creates natural golden rim illumination */}
            <directionalLight position={[22, 24, -40]} intensity={1.1} color="#ffe8cc" />
            {/* Soft Sky Fill Light */}
            <directionalLight position={[-14, 16, 8]} intensity={0.65} color="#dbeafe" />
            
            <Suspense fallback={<CanvasLoader />}>
              <Scene
                onGyroStatusChange={setGyroStatus}
                isWarping={transitionActive && transitionDest === 'kage'}
                resetKey={toriiKey}
              />
            </Suspense>
          </Canvas>
        </div>

        {/* Foreground Content */}
        <UIOverlay
          gyroStatus={gyroStatus}
          onContinue={handleContinue}
          isTransitioning={transitionActive}
          isLoaded={loaded}
        />

        {/* Scroll Progress Rail indicator */}
        <ScrollProgressRail />
      </div>

      {/* Creative Cartoon/Anime Speed Warp Dash & Motion Transition */}
      <SpeedWarpTransition
        active={transitionActive}
        destination={transitionDest}
        onMidpoint={handleTransitionMidpoint}
        onComplete={handleTransitionComplete}
      />
    </div>
  )
}
