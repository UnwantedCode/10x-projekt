import { useState, useCallback } from "react";

import { Button } from "@/components/ui/button";

import { ONBOARDING_STEPS } from "./types";

// =============================================================================
// Types
// =============================================================================

interface OnboardingWizardProps {
  onComplete: () => void;
  onSkip: () => void;
}

// =============================================================================
// Icons
// =============================================================================

function AlertCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function ArrowUpDownIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m21 16-4 4-4-4" />
      <path d="M17 20V4" />
      <path d="m3 8 4-4 4 4" />
      <path d="M7 4v16" />
    </svg>
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  );
}

// =============================================================================
// Step Illustrations
// =============================================================================

const StepIllustrations = [
  // Step 1: Priorities
  function PrioritiesIllustration() {
    return (
      <div className="flex flex-col gap-2 p-4">
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
          <AlertCircleIcon className="h-4 w-4" />
          <span className="text-sm font-medium">Wysoki priorytet</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">
          <div className="h-4 w-4 flex items-center justify-center">
            <div className="h-2 w-2 rounded-full bg-current" />
          </div>
          <span className="text-sm font-medium">Średni priorytet</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400">
          <div className="h-4 w-4 flex items-center justify-center">
            <div className="h-1 w-3 rounded-full bg-current" />
          </div>
          <span className="text-sm font-medium">Niski priorytet</span>
        </div>
      </div>
    );
  },
  // Step 2: Sorting
  function SortingIllustration() {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="relative">
          <ArrowUpDownIcon className="h-16 w-16 text-primary" />
          <div className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
            1
          </div>
          <div className="absolute -right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-primary/70 text-primary-foreground flex items-center justify-center text-xs font-bold">
            2
          </div>
          <div className="absolute -right-2 -bottom-2 h-6 w-6 rounded-full bg-primary/40 text-primary-foreground flex items-center justify-center text-xs font-bold">
            3
          </div>
        </div>
      </div>
    );
  },
  // Step 3: AI
  function AIIllustration() {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="relative">
          <SparklesIcon className="h-16 w-16 text-primary animate-pulse" />
          <div className="absolute -left-4 top-0 text-xs text-muted-foreground">sugestia</div>
          <div className="absolute -right-4 bottom-0 text-xs text-muted-foreground">AI</div>
        </div>
      </div>
    );
  },
];

// =============================================================================
// Component
// =============================================================================

export function OnboardingWizard({ onComplete, onSkip }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);

  const totalSteps = ONBOARDING_STEPS.length;
  const step = ONBOARDING_STEPS[currentStep];
  const isLastStep = currentStep === totalSteps - 1;
  const StepIllustration = StepIllustrations[currentStep];

  const handleNext = useCallback(async () => {
    if (isLastStep) {
      setIsCompleting(true);
      try {
        await onComplete();
      } finally {
        setIsCompleting(false);
      }
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  }, [isLastStep, onComplete]);

  const handleBack = useCallback(() => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  }, []);

  const handleSkip = useCallback(async () => {
    setIsCompleting(true);
    try {
      await onSkip();
    } finally {
      setIsCompleting(false);
    }
  }, [onSkip]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in-0 duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div className="w-full max-w-md mx-4 bg-card border border-border rounded-lg shadow-lg animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        {/* Header with skip button */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <span className="text-sm text-muted-foreground">
            Krok {currentStep + 1} z {totalSteps}
          </span>
          <Button variant="ghost" size="sm" onClick={handleSkip} disabled={isCompleting}>
            Pomiń
          </Button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Illustration */}
          <div className="flex justify-center mb-6">
            <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center">
              <StepIllustration />
            </div>
          </div>

          {/* Title */}
          <h2 id="onboarding-title" className="text-xl font-semibold text-center mb-3">
            {step.title}
          </h2>

          {/* Description */}
          <p className="text-sm text-muted-foreground text-center leading-relaxed">{step.description}</p>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 pb-4">
          {ONBOARDING_STEPS.map((_, index) => (
            <div
              key={index}
              className={`h-2 w-2 rounded-full transition-colors ${
                index === currentStep ? "bg-primary" : index < currentStep ? "bg-primary/50" : "bg-muted"
              }`}
              aria-hidden="true"
            />
          ))}
        </div>

        {/* Footer with navigation */}
        <div className="flex items-center justify-between p-4 border-t border-border">
          <Button variant="outline" onClick={handleBack} disabled={currentStep === 0 || isCompleting}>
            Wstecz
          </Button>

          <Button onClick={handleNext} disabled={isCompleting}>
            {isCompleting ? "Kończenie..." : isLastStep ? "Zakończ" : "Dalej"}
          </Button>
        </div>
      </div>
    </div>
  );
}
