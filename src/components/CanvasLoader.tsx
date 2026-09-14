import { Html, useProgress } from '@react-three/drei'

export default function CanvasLoader() {
  const { progress } = useProgress()
  return (
    <Html center>
      <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-black/70 backdrop-blur-md border border-white/10 text-white select-none pointer-events-none min-w-[140px] shadow-2xl">
        <div className="w-8 h-8 border-2 border-white/20 border-t-[#c93b2b] rounded-full animate-spin mb-2" />
        <span className="text-[10px] font-mono tracking-widest text-[#ccc] uppercase">
          Loading 3D {progress > 0 ? `${Math.round(progress)}%` : ''}
        </span>
      </div>
    </Html>
  )
}
