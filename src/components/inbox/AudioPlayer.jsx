import { useState, useRef, useEffect } from "react";
import { Play, Pause, Mic } from "lucide-react";
import { cn } from "@/lib/utils";

const BAR_COUNT = 20;
const BAR_HEIGHTS = [8, 14, 10, 16, 8, 12, 18, 10, 14, 8, 16, 10, 14, 18, 8, 12, 16, 10, 14, 8];

function formatTime(s) {
  if (!s || isNaN(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

export default function AudioPlayer({ src, isSent }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrent(audio.currentTime);
    const onMeta = () => setDuration(audio.duration);
    const onEnd = () => setPlaying(false);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnd);
    };
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play(); setPlaying(true); }
  };

  const progress = duration > 0 ? current / duration : 0;
  const activeBars = Math.round(progress * BAR_COUNT);

  const bubbleBg = isSent ? "#dcf8c6" : "#f0f0f0";
  const activeColor = isSent ? "#128c7e" : "#128c7e";
  const inactiveColor = isSent ? "#a8d5a2" : "#c0c0c0";

  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 8,
        borderRadius: 24, padding: "8px 12px",
        minWidth: 200, maxWidth: 280,
        background: bubbleBg,
      }}
    >
      <audio ref={audioRef} src={src} preload="metadata" style={{ display: "none" }} />

      <Mic style={{ width: 18, height: 18, color: "#54656f", flexShrink: 0 }} />

      <button
        onClick={toggle}
        style={{
          width: 36, height: 36, borderRadius: "50%",
          background: "#128c7e", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {playing
          ? <Pause style={{ width: 16, height: 16, color: "white" }} />
          : <Play style={{ width: 16, height: 16, color: "white", marginLeft: 2 }} />
        }
      </button>

      {/* Waveform bars */}
      <div style={{ display: "flex", alignItems: "center", gap: 2, flex: 1 }}>
        {BAR_HEIGHTS.map((h, i) => (
          <div
            key={i}
            style={{
              width: 3,
              height: playing ? undefined : h,
              borderRadius: 2,
              background: i < activeBars ? activeColor : inactiveColor,
              flexShrink: 0,
              animation: playing ? `waveBar 0.6s ease-in-out ${(i * 20)}ms infinite alternate` : undefined,
              minHeight: playing ? 4 : undefined,
            }}
          />
        ))}
      </div>

      <span style={{ fontSize: 11, color: "#54656f", whiteSpace: "nowrap", flexShrink: 0 }}>
        {formatTime(current)} / {formatTime(duration)}
      </span>

      <style>{`
        @keyframes waveBar {
          from { height: 4px; }
          to { height: 20px; }
        }
      `}</style>
    </div>
  );
}