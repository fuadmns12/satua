import React, { useEffect, useRef, useState } from 'react';
import { Camera, Mic, Play, AlertCircle, Power, MicOff, VideoOff, RefreshCw } from 'lucide-react';
import { User } from '../types';

interface DashboardProps {
  user: User;
  onStart: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onStart }) => {
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [videoReady, setVideoReady] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [permissionError, setPermissionError] = useState(false);

  // Function to inspect the stream tracks independently
  const checkTrackStatus = (stream: MediaStream | null) => {
    if (!stream) {
        setVideoReady(false);
        setAudioReady(false);
        return;
    }

    const videoTracks = stream.getVideoTracks();
    const audioTracks = stream.getAudioTracks();

    // STRICT Independent Check
    // We check if at least one track exists AND is in 'live' state AND is enabled AND not muted.
    const isVideoGood = videoTracks.some(track => 
      track.readyState === 'live' && track.enabled && !track.muted
    );

    const isAudioGood = audioTracks.some(track => 
      track.readyState === 'live' && track.enabled && !track.muted
    );

    console.log("Status Check -> Video:", isVideoGood, "Audio:", isAudioGood);

    setVideoReady(isVideoGood);
    setAudioReady(isAudioGood);
  };

  const enableDevices = async () => {
    try {
      setPermissionError(false);
      
      // Stop existing tracks if any
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      streamRef.current = stream;
      setMediaStream(stream);
      
      // Immediate check
      checkTrackStatus(stream);

      // Attach to video element
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }

    } catch (err) {
      console.error("Access denied", err);
      setPermissionError(true);
      setVideoReady(false);
      setAudioReady(false);
    }
  };

  // AUTO-START DEVICES ON MOUNT (Immediately after login)
  useEffect(() => {
    enableDevices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Effect to attach listeners and poll status
  useEffect(() => {
    if (!mediaStream) return;

    // 1. Event Listener Handler
    const handleTrackChange = () => {
      // Re-run the status check whenever a track changes state
      checkTrackStatus(mediaStream);
    };

    // 2. Attach listeners to all tracks individually
    mediaStream.getTracks().forEach(track => {
      track.onmute = handleTrackChange;
      track.onunmute = handleTrackChange;
      track.onended = handleTrackChange; // This is crucial for unplugged devices
    });

    // 3. Polling Interval (Backup check every 500ms)
    const intervalId = setInterval(() => {
      checkTrackStatus(mediaStream);
    }, 500);

    return () => {
      clearInterval(intervalId);
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => {
            track.onmute = null;
            track.onunmute = null;
            track.onended = null;
        });
      }
    };
  }, [mediaStream]);

  // Ensure video element gets stream if it re-renders
  useEffect(() => {
    if (videoPreviewRef.current && mediaStream) {
        videoPreviewRef.current.srcObject = mediaStream;
    }
  }, [mediaStream, videoReady]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const allSystemsGo = videoReady && audioReady;

  return (
    <div className="flex flex-col h-full text-white">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-1">Welcome, <span className="text-amber-500">{user.fullName}</span></h2>
        <p className="text-gray-400">Please review the examination rules and check your equipment.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 flex-grow">
        {/* Rules Section */}
        <div className="lg:w-1/2 space-y-6">
          <div className="bg-gray-900/60 border border-gray-700 p-6 rounded-xl">
            <h3 className="text-amber-500 font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Examination Rules
            </h3>
            <ul className="space-y-4 text-gray-300">
              <li className="flex gap-3">
                <span className="bg-gray-800 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-amber-500 shrink-0">1</span>
                <span>The exam consists of 3 consecutive sessions.</span>
              </li>
              <li className="flex gap-3">
                <span className="bg-gray-800 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-amber-500 shrink-0">2</span>
                <span>Each session has a strict <strong>1-minute</strong> time limit.</span>
              </li>
              <li className="flex gap-3">
                <span className="bg-gray-800 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-amber-500 shrink-0">3</span>
                <span>Recording starts automatically. Speak clearly.</span>
              </li>
              <li className="flex gap-3">
                <span className="bg-gray-800 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-amber-500 shrink-0">4</span>
                <span>There are short breaks between sessions.</span>
              </li>
              <li className="flex gap-3">
                <span className="bg-gray-800 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-amber-500 shrink-0">5</span>
                <span>At the end, you must download your 3 recordings.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Device Check Section */}
        <div className="lg:w-1/2 flex flex-col">
          <div className="relative bg-black rounded-xl overflow-hidden border border-gray-800 shadow-xl flex-grow min-h-[300px] flex flex-col">
            
            {/* Video Area */}
            <div className="relative flex-grow bg-black">
              {mediaStream ? (
                <video 
                  ref={videoPreviewRef} 
                  autoPlay 
                  muted 
                  playsInline
                  className={`w-full h-full object-cover transform scale-x-[-1] transition-opacity duration-300 ${videoReady ? 'opacity-100' : 'opacity-30'}`}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Camera className="w-16 h-16 text-gray-800" />
                </div>
              )}

              {/* Error Overlay for specific issues */}
              {mediaStream && (!videoReady || !audioReady) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm z-10 p-4 pointer-events-none">
                   {/* Messages are handled by the status bars below mostly, but this adds emphasis */}
                   <div className="flex flex-col gap-2">
                     {!videoReady && <div className="bg-red-900/80 px-4 py-2 rounded text-red-200 font-bold flex items-center gap-2 animate-pulse"><VideoOff className="w-5 h-5" /> CAMERA ERROR</div>}
                     {!audioReady && <div className="bg-red-900/80 px-4 py-2 rounded text-red-200 font-bold flex items-center gap-2 animate-pulse"><MicOff className="w-5 h-5" /> MIC ERROR</div>}
                   </div>
                </div>
              )}
            </div>

            {/* Controls & Status Bar */}
            <div className="bg-gray-900 border-t border-gray-800 p-4">
              
              {!mediaStream ? (
                <div className="text-center">
                  <p className="text-gray-400 text-sm mb-3">Initializing devices...</p>
                  {/* Button still exists if auto-start fails or user cancels and wants to retry */}
                  <button 
                    onClick={enableDevices}
                    className="mx-auto bg-gray-800 hover:bg-gray-700 text-white px-6 py-2 rounded-full font-bold flex items-center gap-2 transition-colors border border-gray-600 hover:border-amber-500"
                  >
                    <Power className="w-4 h-4" />
                    Retry Connection
                  </button>
                  {permissionError && (
                    <p className="text-red-500 mt-2 text-xs">Permission denied. Check browser settings.</p>
                  )}
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <div className="flex gap-2">
                    {/* Independent Status Indicators */}
                    <div className={`px-3 py-1.5 rounded-md text-xs font-bold border flex items-center gap-2 transition-colors ${videoReady ? 'bg-green-900/30 border-green-500 text-green-400' : 'bg-red-900/30 border-red-500 text-red-400'}`}>
                      {videoReady ? <Camera className="w-3 h-3" /> : <VideoOff className="w-3 h-3" />}
                      {videoReady ? 'CAMERA ON' : 'CAMERA OFF'}
                    </div>
                    <div className={`px-3 py-1.5 rounded-md text-xs font-bold border flex items-center gap-2 transition-colors ${audioReady ? 'bg-green-900/30 border-green-500 text-green-400' : 'bg-red-900/30 border-red-500 text-red-400'}`}>
                      {audioReady ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
                      {audioReady ? 'MIC ON' : 'MIC OFF'}
                    </div>
                  </div>
                  
                  {/* Refresh Button if things get stuck */}
                  <button onClick={enableDevices} className="p-2 rounded-full bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700" title="Reconnect Devices">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={onStart}
            disabled={!allSystemsGo}
            className="mt-6 w-full bg-amber-600 hover:bg-amber-500 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed text-black font-bold py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.5)] flex items-center justify-center gap-2 text-lg disabled:shadow-none"
          >
            <Play className="w-6 h-6 fill-current" />
            {allSystemsGo ? 'START EXAMINATION' : 'DEVICES NOT READY'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;