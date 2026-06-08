import { useEffect, useState, useRef, useCallback } from "react";

interface Ripple {
  id: number;
  x: number;
  y: number;
}

export default function CustomCursor() {
  const [visible, setVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(
        window.innerWidth < 768 ||
        window.matchMedia("(pointer: coarse)").matches
      );
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<HTMLDivElement>(null);

  const mouse = useRef({ x: -100, y: -100 });
  const ringPos = useRef({ x: -100, y: -100 });
  const trailPos = useRef({ x: -100, y: -100 });
  const rippleIdCounter = useRef(0);

  // Refs to read latest state inside the animation loop without restarting the effect
  const isHoveredRef = useRef(isHovered);
  isHoveredRef.current = isHovered;
  const visibleRef = useRef(visible);
  visibleRef.current = visible;

  const spawnRipple = useCallback((x: number, y: number) => {
    const id = ++rippleIdCounter.current;
    setRipples((prev) => [...prev, { id, x, y }]);
    // Auto-remove after animation completes
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 500);
  }, []);

  useEffect(() => {
    if (isMobile) return;

    const style = document.createElement("style");
    style.innerHTML = `
      body.custom-cursor-active button:not(:disabled),
      body.custom-cursor-active a,
      body.custom-cursor-active [role="button"],
      body.custom-cursor-active .cursor-pointer {
        cursor: none !important;
      }

      @keyframes cursor-ripple {
        0% {
          transform: translate(-50%, -50%) scale(0.3);
          opacity: 0.7;
        }
        60% {
          opacity: 0.3;
        }
        100% {
          transform: translate(-50%, -50%) scale(1.8);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);

    document.body.classList.add('custom-cursor-active');

    const onMouseMove = (e: MouseEvent) => {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;
      if (!visibleRef.current) setVisible(true);
    };

    const onMouseDown = (e: MouseEvent) => {
      spawnRipple(e.clientX, e.clientY);
    };

    const checkInteractiveHover = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const isInteractive =
        target.closest("button") ||
        target.closest("a") ||
        target.closest("[role='button']") ||
        target.closest("[onClick]") ||
        target.classList.contains("cursor-pointer") ||
        target.closest(".clickable-item");

      setIsHovered(!!isInteractive);
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseover", checkInteractiveHover);

    let frameId: number;
    let skipFrame = false;
    const update = () => {
      const hovered = isHoveredRef.current;

      // Inner dot — instant lock, with hover scale
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${mouse.current.x}px, ${mouse.current.y}px, 0) scale(${hovered ? 1.6 : 1})`;
      }

      // Ring — smooth elastic follow (only update every other frame)
      skipFrame = !skipFrame;
      if (!skipFrame) {
        ringPos.current.x += (mouse.current.x - ringPos.current.x) * 0.2;
        ringPos.current.y += (mouse.current.y - ringPos.current.y) * 0.2;
        if (ringRef.current) {
          ringRef.current.style.transform = `translate3d(${ringPos.current.x}px, ${ringPos.current.y}px, 0)`;
        }

        // Trail — very loose follow for a comet-tail effect (lighter computation)
        trailPos.current.x += (mouse.current.x - trailPos.current.x) * 0.08;
        trailPos.current.y += (mouse.current.y - trailPos.current.y) * 0.08;
        if (trailRef.current) {
          const dx = trailPos.current.x - mouse.current.x;
          const dy = trailPos.current.y - mouse.current.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          trailRef.current.style.transform = `translate3d(${trailPos.current.x}px, ${trailPos.current.y}px, 0)`;
          trailRef.current.style.width = `${Math.max(4, Math.min(20, dist * 0.15))}px`;
          trailRef.current.style.height = trailRef.current.style.width;
        }
      }

      frameId = requestAnimationFrame(update);
    };
    update();

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseover", checkInteractiveHover);
      cancelAnimationFrame(frameId);
      document.body.classList.remove('custom-cursor-active');
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
    };
  }, [spawnRipple]);

  if (isMobile || !visible) return null;

  const ringScale = isHovered ? "0.65" : "1";

  return (
    <>
      {/* Click ripples */}
      {ripples.map((ripple) => (
        <div
          key={ripple.id}
          className="fixed top-0 left-0 pointer-events-none z-[9998]"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            border: "1.5px solid rgba(255,255,255,0.5)",
            boxShadow: "0 0 12px rgba(255,255,255,0.1), inset 0 0 12px rgba(255,255,255,0.05)",
            animation: "cursor-ripple 0.5s ease-out forwards",
          }}
        />
      ))}

      {/* Trailing comet particle — fades out as it catches up */}
      <div
        ref={trailRef}
        className="fixed top-0 left-0 rounded-full pointer-events-none z-[9999]"
        style={{
          background: "radial-gradient(circle, rgba(255,255,255,0.5), rgba(255,255,255,0.1) 60%, transparent)",
          width: "8px",
          height: "8px",
        }}
      />

      {/* Outer orbit ring */}
      <div
        ref={ringRef}
        className="fixed top-0 left-0 pointer-events-none z-[9999]"
        style={{
          width: "40px",
          height: "40px",
          marginLeft: "-20px",
          marginTop: "-20px",
          borderRadius: "50%",
          border: "2px solid rgba(255,255,255,0.4)",
          background: isHovered
            ? "rgba(255,255,255,0.08)"
            : "transparent",
          boxShadow: isHovered
            ? "0 0 24px rgba(255,255,255,0.15), inset 0 0 24px rgba(255,255,255,0.06)"
            : "0 0 10px rgba(255,255,255,0.06)",
          transition: isHovered
            ? "background 0.15s ease-out, box-shadow 0.2s ease-out, border-color 0.15s ease-out, scale 0.15s ease-out"
            : "background 0.4s ease-out, box-shadow 0.4s ease-out, border-color 0.3s ease-out, scale 0.3s ease-out",
          scale: ringScale,
        }}
      >
        {/* Two tiny orbital dots that only show on hover */}
        {isHovered && (
          <>
            <div
              className="absolute inset-0 rounded-full animate-spin"
              style={{ animationDuration: "3s" }}
            >
              <div
                className="absolute top-0 left-1/2 -ml-[2.5px] h-[2.5px] w-[2.5px] rounded-full bg-white"
                style={{ boxShadow: "0 0 6px rgba(255,255,255,0.8)" }}
              />
            </div>
            <div
              className="absolute inset-0 rounded-full animate-spin"
              style={{ animationDuration: "4s", animationDirection: "reverse" }}
            >
              <div
                className="absolute bottom-0 left-1/2 -ml-[2px] h-[2px] w-[2px] rounded-full bg-white/80"
                style={{ boxShadow: "0 0 6px rgba(255,255,255,0.6)" }}
              />
            </div>
          </>
        )}
      </div>

      {/* Core dot */}
      <div
        ref={dotRef}
        className="fixed top-0 left-0 pointer-events-none z-[9999]"
        style={{
          width: "8px",
          height: "8px",
          marginLeft: "-4px",
          marginTop: "-4px",
          borderRadius: "50%",
          background: "#fff",
          boxShadow: isHovered
            ? "0 0 20px rgba(255,255,255,0.9), 0 0 30px rgba(255,255,255,0.3)"
            : "0 0 14px rgba(255,255,255,0.6)",
          transition: isHovered
            ? "box-shadow 0.15s ease-out"
            : "box-shadow 0.3s ease-out",
        }}
      />
    </>
  );
}
