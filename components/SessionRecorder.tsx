import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { Mic, Square, Timer, ArrowRight, Video, AlertCircle, RefreshCw, TriangleAlert } from 'lucide-react';

interface SessionRecorderProps {
  user: User;
  sessionNumber: number;
  title: string;
  textContent: React.ReactNode;
  onComplete: (blob: Blob) => void;
}

const SessionRecorder: React.FC<SessionRecorderProps> = ({
  user,
  sessionNumber,
  title,
  textContent,
  onComplete,
}) => {
  const [timeLeft, setTimeLeft] = useState(60);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hardwareFailure, setHardwareFailure] = useState(false); // State for special error page
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Flag to check if the stop event is expected (timer or user finish) vs unexpected (crash)
  const isExpectedToEnd = useRef(false);

  // Initialize Stream and Recorder
  useEffect(() => {
    let mounted = true;

    const startStream = async () => {
      try {
        setError(null);
        setHardwareFailure(false);
        isExpectedToEnd.current = false;
        console.log("Requesting user media for session...");
        
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: { ideal: 1280 }, 
            height: { ideal: 720 } 
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        
        if (!mounted) {
            stream.getTracks().forEach(track => track.stop());
            return;
        }

        streamRef.current = stream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Add Listener for unexpected track endings (unplugged device)
        stream.getTracks().forEach(track => {
            track.onended = () => {
                if (!isExpectedToEnd.current) {
                    console.error("Track ended unexpectedly");
                    setIsRecording(false);
                    // TRIGGER THE SPECIAL FAILURE PAGE
                    setHardwareFailure(true);
                    // Stop recorder safely if running
                    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                         mediaRecorderRef.current.stop();
                    }
                }
            };
        });

        // Check for supported mime types
        let mimeType = 'video/webm;codecs=vp8,opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'video/webm'; // Fallback
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = ''; // Let browser choose default
            }
        }

        const options = mimeType ? { mimeType } : undefined;
        const recorder = new MediaRecorder(stream, options);

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunksRef.current.push(e.data);
          }
        };

        recorder.onstop = () => {
          // If stopped intentionally, complete the session.
          // If stopped due to failure, we wait for user to click "Proceed" in the error screen
          if (isExpectedToEnd.current) {
             const blob = new Blob(chunksRef.current, { type: 'video/webm' });
             onComplete(blob);
             stream.getTracks().forEach(track => track.stop());
          } 
        };

        mediaRecorderRef.current = recorder;
        
        // Auto start recording
        recorder.start();
        setIsRecording(true);

      } catch (err: any) {
        console.error("Error accessing media devices.", err);
        let msg = "Camera/Microphone access error.";
        if (err.name === 'NotAllowedError') msg = "Access denied. Please check permissions.";
        if (err.name === 'NotFoundError') msg = "No camera or microphone found.";
        if (err.name === 'NotReadableError') msg = "Hardware error. Camera might be in use.";
        setError(msg);
      }
    };

    // Small delay to ensure previous stream cleanup has processed
    const timer = setTimeout(() => {
        startStream();
    }, 500);

    return () => {
      mounted = false;
      clearTimeout(timer);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  // Timer Logic
  useEffect(() => {
    if (!isRecording) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleFinishSession();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording]);

  const handleFinishSession = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      isExpectedToEnd.current = true;
      mediaRecorderRef.current.stop();
    }
  };

  const handleRescueContinue = () => {
      // Force finish with whatever chunks we have
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      // Ensure tracks are definitely stopped
      if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
      }
      onComplete(blob);
  };

  const progress = ((60 - timeLeft) / 60) * 100;

  // --- SPECIAL PAGE: HARDWARE FAILURE ---
  if (hardwareFailure) {
      return (
        <div className="flex flex-col h-full items-center justify-center bg-black rounded-xl border border-red-900/50 p-8 text-center animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-red-900/30 rounded-full flex items-center justify-center mb-6">
                <TriangleAlert className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Hardware Connection Lost</h2>
            <p className="text-gray-400 mb-8 max-w-md">
                Your camera or microphone was disconnected during the session. 
                Don't worry, we have saved what was recorded so far.
            </p>
            
            <div className="flex gap-4">
                <button
                    onClick={handleRescueContinue}
                    className="flex items-center space-x-2 bg-amber-600 hover:bg-amber-500 text-black px-8 py-3 rounded-full font-bold transition-transform hover:scale-105"
                >
                    <span>Proceed to Next Session</span>
                    <ArrowRight className="w-5 h-5" />
                </button>
            </div>
        </div>
      );
  }

  // --- STANDARD RENDER ---
  return (
    <div className="flex flex-col h-full text-white">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-amber-500 tracking-wider">SESSION 0{sessionNumber}</h2>
          <p className="text-gray-400 text-sm uppercase tracking-widest">{title}</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border ${isRecording ? 'bg-red-900/30 border-red-500/50' : 'bg-gray-800 border-gray-600'}`}>
            <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`}></div>
            <span className={`${isRecording ? 'text-red-400' : 'text-gray-400'} font-mono text-xs`}>
              {isRecording ? 'REC' : 'READY'}
            </span>
          </div>
          <div className="flex items-center space-x-2 font-mono text-xl text-amber-500">
            <Timer className="w-5 h-5" />
            <span>00:{timeLeft.toString().padStart(2, '0')}</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col lg:flex-row gap-6 flex-grow">
        
        {/* Left: Script */}
        <div className="lg:w-1/2 bg-gray-900/50 p-6 rounded-xl border border-gray-700 shadow-inner flex flex-col">
          <h3 className="text-gray-400 text-xs uppercase mb-4 tracking-widest">Script Content</h3>
          <div className="flex-grow flex items-center justify-center">
            <div className="text-xl md:text-2xl leading-relaxed font-serif text-gray-200 text-center">
              {textContent}
            </div>
          </div>
        </div>

        {/* Right: Camera Feed */}
        <div className="lg:w-1/2 relative bg-black rounded-xl overflow-hidden border-2 border-gray-800 shadow-2xl">
          {error ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 bg-gray-900">
              <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
              <p className="text-red-400 font-bold mb-4">{error}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="px-6 py-2 bg-gray-800 border border-gray-600 rounded-full hover:bg-gray-700 hover:border-amber-500 text-white flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Session
              </button>
            </div>
          ) : (
            <>
              <video 
                ref={videoRef} 
                autoPlay 
                muted 
                playsInline
                className="w-full h-full object-cover transform scale-x-[-1]" 
              />
              
              {/* Studio Overlay Elements */}
              <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-md text-xs font-mono text-gray-300 border border-gray-700 flex items-center gap-2">
                <Video className="w-3 h-3 text-green-400" />
                <span>CAM: ON</span>
                <span className="w-px h-3 bg-gray-600 mx-1"></span>
                <Mic className="w-3 h-3 text-green-400" />
                <span>MIC: ACTIVE</span>
              </div>

              <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-800">
                 <div 
                  className="h-full bg-amber-500 transition-all duration-1000 ease-linear"
                  style={{ width: `${progress}%` }}
                 ></div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer Controls */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={handleFinishSession}
          disabled={!isRecording}
          className="group flex items-center space-x-3 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed text-black px-8 py-3 rounded-full font-bold transition-all transform hover:scale-105 shadow-[0_0_15px_rgba(245,158,11,0.4)]"
        >
          <span>FINISH & NEXT</span>
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
};

export default SessionRecorder;