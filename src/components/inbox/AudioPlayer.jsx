import { useState, useRef, useEffect } from "react";
import { Play, Pause, Mic } from "lucide-react";
import { cn } from "@/lib/utils";

const BAR_COUNT = 20;

function formatTime(secs) {
  if (isNaN(secs) || !isFinite(secs)) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function AudioPlayer({ src, isSent }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bars, setBars] = useState(() => Array.from({ length: BAR_COUNT }, () => 0.4));
  const animRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrentTime(audio.currentTime);
    const onMeta = () => setDuration(audio.duration);
    const onEnded = () => { setPlaying(false); setCurrentTime(0); };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  useEffect(() => {
    if (playing) {
      animRef.current = setInterval(() => {
        setBars(Array.from({ length: BAR_COUNT }, () => 0.2 + Math.random() * 0.8));
      }, 150);
    } else {
      clearInterval(animRef.current);
      setBars(Array.from({ length: BAR_COUNT }, () => 0.4));
    }
    return () => clearInterval(animRef.current);
  }, [playing]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play(); setPlaying(true); }
  };

  const accent = isSent ? "#128c7e" : "#128c7e";

  return (
    <div className={cn(
      "flex items-center gap-2 rounded-3xl px-3 py-2",
      "min-w-[200px] max-w-[280px]",
      isSent ? "bg-white/20" : "bg-[#128c7e]/10"
    )}>
      <audio ref={audioRef} src={src} preload="metadata" className="hidden" />

      {/* Mic icon */}
      <div className="w-6 h-6 flex items-center justify-center shrink-0 text-[#128c7e]">
        <Mic className="w-5 h-5" />
      </div>

      {/* Play/Pause */}
      <button
        onClick={togglePlay}
        className="w-9 h-9 rounded-full bg-[#128c7e] flex items-center justify-center shrink-0 hover:opacity-90 transition-opacity"
        style={{ minWidth: 36, minHeight: 36 }}
      >
        {playing
          ? <Pause className="w-4 h-4 text-white" />
          : <Play className="w-4 h-4 text-white ml-0.5" />
        }
      </button>

      {/* Waveform bars */}
      <div className="flex items-center gap-[2px] flex-1 h-8">
        {bars.map((h, i) => (
          <div
            key={i}
            className="rounded-full transition-all duration-150"
            style={{
              width: 3,
              height: `${Math.max(4, h * 28)}px`,
              background: playing ? accent : "#aaa",
              opacity: playing ? 1 : 0.5,
            }}
          />
        ))}
      </div>

      {/* Time */}
      <div className="text-[10px] text-[#54656f] shrink-0 font-mono">
        {formatTime(currentTime)}
        {duration > 0 && <span className="opacity-60"> / {formatTime(duration)}</span>}
      </div>
    </div>
  );
}