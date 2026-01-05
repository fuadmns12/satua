import React from 'react';
import { Coffee, ArrowRight } from 'lucide-react';

interface BreakScreenProps {
  nextSessionName: string;
  onContinue: () => void;
}

const BreakScreen: React.FC<BreakScreenProps> = ({ nextSessionName, onContinue }) => {
  return (
    <div className="flex flex-col h-full items-center justify-center text-center p-8">
      <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mb-6 animate-pulse">
        <Coffee className="w-12 h-12 text-amber-500" />
      </div>
      
      <h2 className="text-4xl font-bold text-white mb-2">Session Complete</h2>
      <p className="text-gray-400 text-lg mb-12">Take a breath. The next session is ready when you are.</p>

      <div className="bg-gray-900/80 border border-gray-700 p-8 rounded-xl max-w-lg w-full mb-12">
        <p className="text-gray-500 text-sm uppercase tracking-widest mb-2">Up Next</p>
        <h3 className="text-2xl font-bold text-amber-500">{nextSessionName}</h3>
      </div>

      <button
        onClick={onContinue}
        className="group flex items-center space-x-3 bg-white text-black px-10 py-4 rounded-full font-bold hover:bg-gray-200 transition-all"
      >
        <span>CONTINUE TO NEXT SESSION</span>
        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  );
};

export default BreakScreen;
