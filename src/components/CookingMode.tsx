import { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Timer, Play, Pause, RotateCcw } from 'lucide-react';
import { InstructionStep } from '@/types/recipe';

interface CookingModeProps {
  steps: InstructionStep[];
  title: string;
  onClose: () => void;
}

const CookingMode = ({ steps, title, onClose }: CookingModeProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);

  const step = steps[currentStep];

  const startTimer = useCallback((minutes: number) => {
    setTimerSeconds(minutes * 60);
    setTimerRunning(true);
  }, []);

  useEffect(() => {
    if (!timerRunning || timerSeconds === null || timerSeconds <= 0) return;
    const interval = setInterval(() => {
      setTimerSeconds(prev => {
        if (prev === null || prev <= 1) {
          setTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning, timerSeconds]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-[100] bg-foreground/95 text-primary-foreground flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-muted/20">
        <h2 className="font-heading text-lg">{title}</h2>
        <button onClick={onClose} className="p-2 hover:bg-muted/20 rounded-full transition-colors">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 max-w-2xl mx-auto text-center">
        <span className="text-sm text-muted-foreground mb-2">
          Step {currentStep + 1} of {steps.length}
        </span>
        {/* Progress bar */}
        <div className="w-full h-1 bg-muted/20 rounded-full mb-8">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
        <p className="text-xl md:text-2xl leading-relaxed font-body">
          {step.instruction}
        </p>

        {step.timerMinutes && (
          <div className="mt-8 flex flex-col items-center gap-3">
            {timerSeconds !== null && timerSeconds >= 0 ? (
              <>
                <span className={`text-4xl font-mono font-bold ${timerSeconds === 0 ? 'text-secondary animate-pulse' : ''}`}>
                  {formatTime(timerSeconds)}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTimerRunning(!timerRunning)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary/20 rounded-full text-sm hover:bg-primary/30 transition-colors"
                  >
                    {timerRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    {timerRunning ? 'Pause' : 'Resume'}
                  </button>
                  <button
                    onClick={() => startTimer(step.timerMinutes!)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary/20 rounded-full text-sm hover:bg-primary/30 transition-colors"
                  >
                    <RotateCcw className="h-4 w-4" /> Reset
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={() => startTimer(step.timerMinutes!)}
                className="flex items-center gap-2 px-5 py-2.5 bg-secondary rounded-full text-secondary-foreground font-medium hover:bg-secondary/90 transition-colors"
              >
                <Timer className="h-4 w-4" />
                Start {step.timerMinutes} min timer
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between p-6">
        <button
          onClick={() => { setCurrentStep(s => s - 1); setTimerSeconds(null); setTimerRunning(false); }}
          disabled={currentStep === 0}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-muted/20 disabled:opacity-30 hover:bg-muted/30 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" /> Previous
        </button>
        <button
          onClick={() => {
            if (currentStep === steps.length - 1) { onClose(); return; }
            setCurrentStep(s => s + 1); setTimerSeconds(null); setTimerRunning(false);
          }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
        >
          {currentStep === steps.length - 1 ? 'Finish' : 'Next'} <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default CookingMode;
