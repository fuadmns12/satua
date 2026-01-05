import React, { useState } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import SessionRecorder from './components/SessionRecorder';
import BreakScreen from './components/BreakScreen';
import Completion from './components/Completion';
import { AppStep, Recording, User } from './types';
import { Lock, Unlock, Settings2 } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentStep, setCurrentStep] = useState<AppStep>(AppStep.LOGIN);
  const [recordings, setRecordings] = useState<Recording[]>([]);

  const handleLogin = (fullName: string) => {
    setUser({ fullName, docId: fullName }); // DocId is the name based on prompt
    setCurrentStep(AppStep.DASHBOARD);
  };

  const handleStartExam = () => {
    setCurrentStep(AppStep.SESSION_1);
  };

  const saveRecording = (blob: Blob, sessionId: number) => {
    if (!user) return;
    
    // Create URL for session persistence
    const url = URL.createObjectURL(blob);
    const filename = `${user.fullName.replace(/\s+/g, '_')}_Session_${sessionId}.webm`;

    const newRecording: Recording = {
      sessionId,
      blob,
      url,
      filename
    };

    setRecordings(prev => {
      // Remove previous recording for this session if exists
      const filtered = prev.filter(r => r.sessionId !== sessionId);
      return [...filtered, newRecording];
    });

    // Determine next step
    if (sessionId === 1) setCurrentStep(AppStep.BREAK_1);
    else if (sessionId === 2) setCurrentStep(AppStep.BREAK_2);
    else if (sessionId === 3) setCurrentStep(AppStep.COMPLETION);
  };

  // Sidebar Logic
  const getSidebarItemClass = (step: AppStep, itemStep: AppStep, itemNumber: number) => {
    // Basic logic to determine if active, completed, or locked
    // This is simplified mapping
    const order = [
      AppStep.DASHBOARD, 
      AppStep.SESSION_1, AppStep.BREAK_1, 
      AppStep.SESSION_2, AppStep.BREAK_2, 
      AppStep.SESSION_3, AppStep.COMPLETION
    ];
    
    const currentIndex = order.indexOf(step);
    
    // Determine the "Session" index in the array
    let targetIndex = -1;
    if (itemNumber === 1) targetIndex = order.indexOf(AppStep.SESSION_1);
    if (itemNumber === 2) targetIndex = order.indexOf(AppStep.SESSION_2);
    if (itemNumber === 3) targetIndex = order.indexOf(AppStep.SESSION_3);

    const isCurrent = step === (itemNumber === 1 ? AppStep.SESSION_1 : itemNumber === 2 ? AppStep.SESSION_2 : AppStep.SESSION_3);
    const isCompleted = currentIndex > targetIndex;
    const isLocked = currentIndex < targetIndex;

    let baseClass = "flex items-center justify-between p-4 rounded-lg border transition-all ";
    
    if (isCurrent) return baseClass + "bg-amber-600 border-amber-500 text-black font-bold shadow-lg scale-105";
    if (isCompleted) return baseClass + "bg-green-900/30 border-green-500/50 text-green-400";
    return baseClass + "bg-gray-900 border-gray-800 text-gray-600 opacity-60";
  };

  if (currentStep === AppStep.LOGIN) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-neutral-950 text-white overflow-hidden font-sans selection:bg-amber-500 selection:text-black">
      {/* Sidebar */}
      <div className="w-80 bg-black border-r border-gray-800 flex flex-col p-6 hidden md:flex z-20 shadow-2xl">
        <div className="mb-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-700 rounded-lg flex items-center justify-center">
            <Settings2 className="text-black w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight">VOCAL BOOTH</h1>
            <p className="text-xs text-gray-500">EXAM SESSION</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className={getSidebarItemClass(currentStep, AppStep.SESSION_1, 1)}>
            <span>Session 01</span>
            {currentStep === AppStep.SESSION_1 ? <Unlock className="w-4 h-4" /> : currentStep === AppStep.BREAK_1 || recordings.find(r => r.sessionId === 1) ? <div className="w-2 h-2 rounded-full bg-green-500"></div> : <Lock className="w-4 h-4" />}
          </div>
          <div className={getSidebarItemClass(currentStep, AppStep.SESSION_2, 2)}>
            <span>Session 02</span>
            {currentStep === AppStep.SESSION_2 ? <Unlock className="w-4 h-4" /> : currentStep === AppStep.BREAK_2 || recordings.find(r => r.sessionId === 2) ? <div className="w-2 h-2 rounded-full bg-green-500"></div> : <Lock className="w-4 h-4" />}
          </div>
          <div className={getSidebarItemClass(currentStep, AppStep.SESSION_3, 3)}>
            <span>Session 03</span>
            {currentStep === AppStep.SESSION_3 ? <Unlock className="w-4 h-4" /> : currentStep === AppStep.COMPLETION || recordings.find(r => r.sessionId === 3) ? <div className="w-2 h-2 rounded-full bg-green-500"></div> : <Lock className="w-4 h-4" />}
          </div>
        </div>

        <div className="mt-auto pt-6 border-t border-gray-900">
          <p className="text-gray-500 text-xs">Logged in as</p>
          <p className="text-amber-500 font-bold truncate">{user?.fullName}</p>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 relative overflow-y-auto">
        {/* Mobile Header (visible only on small screens) */}
        <div className="md:hidden flex justify-between items-center mb-6">
          <span className="font-bold text-amber-500">VOCAL BOOTH</span>
          <div className="text-xs bg-gray-800 px-2 py-1 rounded">{currentStep.replace('_', ' ')}</div>
        </div>

        <div className="max-w-6xl mx-auto h-full">
          {currentStep === AppStep.DASHBOARD && user && (
            <Dashboard user={user} onStart={handleStartExam} />
          )}

          {currentStep === AppStep.SESSION_1 && user && (
            <SessionRecorder
              user={user}
              sessionNumber={1}
              title="Tongue Twister (American Accent)"
              textContent={
                <p>
                  "Betty Botter bought some butter,<br/>
                  but she said 'This butter's bitter.'<br/>
                  'If I put it in my batter,<br/>
                  it will make my batter bitter.'<br/>
                  So she bought some better butter,<br/>
                  better than the bitter butter."
                </p>
              }
              onComplete={(blob) => saveRecording(blob, 1)}
            />
          )}

          {currentStep === AppStep.BREAK_1 && (
            <BreakScreen 
              nextSessionName="Phonetic Transcription (IPA)" 
              onContinue={() => setCurrentStep(AppStep.SESSION_2)} 
            />
          )}

          {currentStep === AppStep.SESSION_2 && user && (
            <SessionRecorder
              user={user}
              sessionNumber={2}
              title="Phonetic Transcription (American IPA)"
              textContent={
                <p className="font-mono text-amber-200">
                  /ðə ˈnɔrθ ˌwɪnd ən ðə ˈsʌn wər dɪsˈpjutɪŋ ˈwɪtʃ wəz ðə ˈstrɔŋɡər, wɛn ə ˈtrævələr keɪm əˈlɔŋ ˈræpt ɪn ə ˈwɔrm ˈkloʊk./
                </p>
              }
              onComplete={(blob) => saveRecording(blob, 2)}
            />
          )}

          {currentStep === AppStep.BREAK_2 && (
            <BreakScreen 
              nextSessionName="Original Text Reading" 
              onContinue={() => setCurrentStep(AppStep.SESSION_3)} 
            />
          )}

          {currentStep === AppStep.SESSION_3 && user && (
            <SessionRecorder
              user={user}
              sessionNumber={3}
              title="Original Text Reading"
              textContent={
                <p>
                  "The North Wind and the Sun were disputing which was the stronger, when a traveler came along wrapped in a warm cloak."
                </p>
              }
              onComplete={(blob) => saveRecording(blob, 3)}
            />
          )}

          {currentStep === AppStep.COMPLETION && user && (
            <Completion user={user} recordings={recordings} />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
