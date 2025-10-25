import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Progress } from "../../components/ui/progress";
import { CheckCircle, ArrowRight, ArrowLeft, Building2, Users, Briefcase, FileText, UserCog, UsersRound } from "lucide-react";
import { useTranslation } from "react-i18next";

interface SetupStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  required: boolean;
}

const setupSteps: SetupStep[] = [
  {
    id: "jobtypes",
    title: "Tipi di Lavoro",
    description: "Configura i tipi di lavoro che la tua azienda offre",
    icon: <Briefcase className="h-6 w-6" />,
    path: "/mobile/settings/jobtypes",
    required: true
  },
  {
    id: "activities",
    title: "Attività",
    description: "Definisci le attività associate ai tipi di lavoro",
    icon: <FileText className="h-6 w-6" />,
    path: "/mobile/settings/activities",
    required: false
  },
  {
    id: "roles",
    title: "Ruoli",
    description: "Crea i ruoli del personale e le loro autorizzazioni",
    icon: <UserCog className="h-6 w-6" />,
    path: "/mobile/settings/roles",
    required: false
  },
  {
    id: "collaborators",
    title: "Collaboratori",
    description: "Aggiungi i membri del tuo team e assegna i ruoli",
    icon: <UsersRound className="h-6 w-6" />,
    path: "/mobile/settings/collaborators",
    required: false
  },
  {
    id: "clients",
    title: "Clienti",
    description: "Gestisci la rubrica dei tuoi clienti",
    icon: <Users className="h-6 w-6" />,
    path: "/mobile/settings/clients",
    required: true
  },
  {
    id: "company",
    title: "Azienda",
    description: "Configura le informazioni della tua azienda",
    icon: <Building2 className="h-6 w-6" />,
    path: "/mobile/settings/company",
    required: true
  }
];

interface SetupWizardProps {
  onComplete: () => void;
}

export default function SetupWizard({ onComplete }: SetupWizardProps) {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if setup is already completed
    const hasCompletedSetup = localStorage.getItem('mobileSetupCompleted');
    if (hasCompletedSetup) {
      onComplete();
      return;
    }

    // Load completed steps from localStorage
    const savedCompletedSteps = localStorage.getItem('mobileSetupCompletedSteps');
    if (savedCompletedSteps) {
      setCompletedSteps(JSON.parse(savedCompletedSteps));
    }

    setIsVisible(true);
  }, [onComplete]);

  const handleStepComplete = (stepId: string) => {
    const newCompletedSteps = [...completedSteps];
    if (!newCompletedSteps.includes(stepId)) {
      newCompletedSteps.push(stepId);
      setCompletedSteps(newCompletedSteps);
      localStorage.setItem('mobileSetupCompletedSteps', JSON.stringify(newCompletedSteps));
    }
  };

  const handleNext = () => {
    if (currentStep < setupSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Setup completed
      localStorage.setItem('mobileSetupCompleted', 'true');
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    handleNext();
  };

  const handleGoToStep = (stepId: string) => {
    const stepIndex = setupSteps.findIndex(step => step.id === stepId);
    if (stepIndex !== -1) {
      setCurrentStep(stepIndex);
    }
  };

  const currentStepData = setupSteps[currentStep];
  const progress = ((currentStep + 1) / setupSteps.length) * 100;
  const isStepCompleted = completedSteps.includes(currentStepData.id);
  const canSkip = !currentStepData.required;

  if (!isVisible) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Configurazione Iniziale
          </h1>
          <p className="text-gray-600">
            Completa la configurazione per iniziare a utilizzare l'app
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Passo {currentStep + 1} di {setupSteps.length}</span>
            <span>{Math.round(progress)}% completato</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Current Step Card */}
        <Card className="mb-6">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-blue-100 rounded-full w-fit">
              {currentStepData.icon}
            </div>
            <CardTitle className="text-xl">{currentStepData.title}</CardTitle>
            <CardDescription className="text-base">
              {currentStepData.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            {isStepCompleted ? (
              <div className="flex items-center justify-center text-green-600 mb-4">
                <CheckCircle className="h-6 w-6 mr-2" />
                <span className="font-medium">Completato</span>
              </div>
            ) : (
              <div className="mb-4">
                <p className="text-gray-600 mb-4">
                  Clicca su "Configura" per iniziare la configurazione di questo elemento.
                </p>
                <Button 
                  onClick={() => {
                    setLocation(currentStepData.path);
                    // Mark as completed when navigating to the step
                    handleStepComplete(currentStepData.id);
                  }}
                  className="w-full"
                >
                  Configura {currentStepData.title}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Steps Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Prossimi Passi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {setupSteps.map((step, index) => (
                <div
                  key={step.id}
                  className={`flex items-center p-3 rounded-lg border ${
                    index === currentStep 
                      ? 'border-blue-500 bg-blue-50' 
                      : completedSteps.includes(step.id)
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200'
                  }`}
                >
                  <div className={`mr-3 ${
                    completedSteps.includes(step.id) 
                      ? 'text-green-600' 
                      : index === currentStep 
                      ? 'text-blue-600' 
                      : 'text-gray-400'
                  }`}>
                    {completedSteps.includes(step.id) ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      step.icon
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{step.title}</h4>
                      {step.required && (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">
                          Obbligatorio
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{step.description}</p>
                  </div>
                  {index === currentStep && (
                    <div className="ml-2 text-blue-600">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Precedente
          </Button>
          
          <div className="flex gap-2">
            {canSkip && (
              <Button
                variant="outline"
                onClick={handleSkip}
              >
                Salta
              </Button>
            )}
            <Button
              onClick={handleNext}
              disabled={!isStepCompleted && currentStepData.required}
            >
              {currentStep === setupSteps.length - 1 ? 'Completa' : 'Avanti'}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
