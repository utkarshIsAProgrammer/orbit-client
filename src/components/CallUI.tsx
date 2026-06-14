import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Mic, MicOff, PhoneOff, Phone, Video, VideoOff } from "lucide-react";
import type { Socket } from "socket.io-client";
import UserAvatar from "./UserAvatar";

interface CallUIProps {
  socket: Socket | null;
  user: { _id: string; fullName: string; profilePic?: { url?: string } };
  callState: {
    type: "audio" | "video";
    status: "outgoing" | "incoming" | "active";
    partnerId: string;
    partnerName: string;
    partnerAvatar?: string;
  };
  onEndCall: () => void;
  onAcceptCall: () => void;
  onRejectCall: () => void;
  localStreamRef: React.MutableRefObject<MediaStream | null>;
  peerConnectionRef: React.MutableRefObject<RTCPeerConnection | null>;
}

export default function CallUI({
  callState,
  onEndCall,
  onAcceptCall,
  onRejectCall,
  localStreamRef,
  peerConnectionRef,
}: CallUIProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Wire local stream to local video element when call becomes active
  // (localStreamRef.current is always populated before status transitions to "active")
  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [callState.status]);

  // Wire remote stream to remote video element via ontrack
  useEffect(() => {
    const pc = peerConnectionRef.current;
    if (!pc) return;

    const handleTrack = (e: RTCTrackEvent) => {
      if (remoteVideoRef.current && e.streams[0]) {
        remoteVideoRef.current.srcObject = e.streams[0];
      }
    };

    pc.ontrack = handleTrack;

    return () => {
      if (pc.ontrack === handleTrack) {
        pc.ontrack = null;
      }
    };
  }, [callState.status, callState.type]);

  // Start call duration timer when active
  useEffect(() => {
    if (callState.status === "active") {
      setCallDuration(0);
      durationTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
    };
  }, [callState.status]);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = isVideoOff;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-2xl flex flex-col items-center justify-center"
    >
      {/* Remote video (full background for video calls) */}
      {callState.type === "video" && (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Dark overlay for better UI contrast */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-md px-6">
        {/* Partner info */}
        <div className="text-center">
          <div className="relative">
            <UserAvatar
              src={callState.partnerAvatar}
              alt={callState.partnerName}
              className={`rounded-full object-cover border-2 border-zinc-700 shadow-2xl ${
                callState.type === "video" && callState.status === "active"
                  ? "h-20 w-20"
                  : "h-28 w-28"
              }`}
            />
            {callState.status === "outgoing" && (
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-green-500 border-2 border-black"
              />
            )}
          </div>
          <h3 className="text-xl font-bold text-white mt-4">{callState.partnerName}</h3>
          <p className="text-sm text-zinc-400 mt-1">
            {callState.status === "outgoing" && "Calling..."}
            {callState.status === "incoming" && "Incoming call"}
            {callState.status === "active" && formatDuration(callDuration)}
          </p>
        </div>

        {/* Local video preview (picture-in-picture for video calls) */}
        {callState.type === "video" && (
          <div className="absolute top-6 right-6 w-32 h-48 rounded-2xl overflow-hidden border-2 border-zinc-700 shadow-2xl">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Call controls */}
        <div className="flex items-center gap-6 mt-6">
          {/* Mute button */}
          <button
            onClick={toggleMute}
            className={`h-14 w-14 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              isMuted
                ? "bg-red-500/20 text-red-400 border border-red-500/30"
                : "bg-zinc-800/80 text-white hover:bg-zinc-700 border border-zinc-700"
            }`}
          >
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>

          {/* Video toggle (only for video calls) */}
          {callState.type === "video" && callState.status === "active" && (
            <button
              onClick={toggleVideo}
              className={`h-14 w-14 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                isVideoOff
                  ? "bg-red-500/20 text-red-400 border border-red-500/30"
                  : "bg-zinc-800/80 text-white hover:bg-zinc-700 border border-zinc-700"
              }`}
            >
              {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
            </button>
          )}

          {/* End / Reject call */}
          <button
            onClick={callState.status === "incoming" ? onRejectCall : onEndCall}
            className="h-14 w-14 rounded-full bg-red-500 text-white hover:bg-red-600 flex items-center justify-center transition-all cursor-pointer shadow-lg shadow-red-500/30"
          >
            <PhoneOff className="h-5 w-5" />
          </button>

          {/* Accept call (incoming only) */}
          {callState.status === "incoming" && (
            <button
              onClick={onAcceptCall}
              className="h-14 w-14 rounded-full bg-green-500 text-white hover:bg-green-600 flex items-center justify-center transition-all cursor-pointer shadow-lg shadow-green-500/30 animate-pulse"
            >
              <Phone className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
