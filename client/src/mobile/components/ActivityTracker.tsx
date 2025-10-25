import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, Pause, Square, Clock, FileText, Camera } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { useToast } from '../../hooks/use-toast';
import PhotoCapture from './PhotoCapture';

interface Activity {
  id: number;
  name: string;
  description?: string;
  defaultDuration: string;
  defaultRate: string;
}

interface JobActivity {
  id: number;
  jobId: number;
  activityId: number;
  notes: string;
  estimatedDuration: string;
  actualDuration: string | null;
  status: 'assigned' | 'in_progress' | 'completed';
  startedAt: Date | null;
  completedAt: Date | null;
  photos: string;
}

interface ActivityTrackerProps {
  jobId: number;
  onActivityComplete?: () => void;
}

export default function ActivityTracker({ jobId, onActivityComplete }: ActivityTrackerProps) {
  const [selectedActivity, setSelectedActivity] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [isTracking, setIsTracking] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch activities
  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ['/api/mobile/activities'],
    queryFn: async () => {
      const response = await fetch('/api/mobile/activities');
      if (!response.ok) throw new Error('Errore nel recuperare le attività');
      return response.json();
    }
  });

  // Fetch job activities
  const { data: jobActivities = [] } = useQuery<JobActivity[]>({
    queryKey: [`/api/mobile/jobs/${jobId}/activities`],
    queryFn: async () => {
      const response = await fetch(`/api/mobile/jobs/${jobId}/activities`);
      if (!response.ok) throw new Error('Errore nel recuperare le attività del lavoro');
      return response.json();
    }
  });

  // Assign activity mutation
  const assignActivityMutation = useMutation({
    mutationFn: async (data: { activityId: number; notes: string; estimatedDuration: string }) => {
      const response = await fetch(`/api/mobile/jobs/${jobId}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Errore nell\'assegnazione dell\'attività');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/mobile/jobs/${jobId}/activities`] });
      toast({
        title: "Attività assegnata",
        description: "L'attività è stata assegnata al lavoro con successo.",
      });
    }
  });

  // Complete activity mutation
  const completeActivityMutation = useMutation({
    mutationFn: async (data: { jobActivityId: number; actualDuration: string; notes: string; photos: string[] }) => {
      const response = await fetch(`/api/mobile/job-activities/${data.jobActivityId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actualDuration: data.actualDuration,
          notes: data.notes
        })
      });
      if (!response.ok) throw new Error('Errore nel completamento dell\'attività');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/mobile/jobs/${jobId}/activities`] });
      setIsTracking(false);
      setStartTime(null);
      setElapsedTime(0);
      toast({
        title: "Attività completata",
        description: "L'attività è stata completata con successo.",
      });
      onActivityComplete?.();
    }
  });

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTracking && startTime) {
      interval = setInterval(() => {
        setElapsedTime(Date.now() - startTime.getTime());
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTracking, startTime]);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    return `${hours.toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  const startTracking = () => {
    if (!selectedActivity) {
      toast({
        title: "Errore",
        description: "Seleziona un'attività prima di iniziare il tracking.",
        variant: "destructive"
      });
      return;
    }
    setIsTracking(true);
    setStartTime(new Date());
    setElapsedTime(0);
  };

  const pauseTracking = () => {
    setIsTracking(false);
  };

  const resumeTracking = () => {
    setIsTracking(true);
    setStartTime(new Date(Date.now() - elapsedTime));
  };

  const stopTracking = () => {
    setIsTracking(false);
    setStartTime(null);
    setElapsedTime(0);
  };

  const assignActivity = () => {
    if (!selectedActivity) {
      toast({
        title: "Errore",
        description: "Seleziona un'attività da assegnare.",
        variant: "destructive"
      });
      return;
    }

    const activity = activities.find(a => a.id === selectedActivity);
    assignActivityMutation.mutate({
      activityId: selectedActivity,
      notes,
      estimatedDuration: activity?.defaultDuration || "1.00"
    });
  };

  const completeActivity = (jobActivityId: number) => {
    const durationInHours = (elapsedTime / (1000 * 60 * 60)).toFixed(2);
    completeActivityMutation.mutate({
      jobActivityId,
      actualDuration: durationInHours,
      notes,
      photos: capturedPhotos
    });
  };

  const handlePhotoCapture = (photo: string) => {
    setCapturedPhotos(prev => [...prev, photo]);
    toast({
      title: "Foto catturata",
      description: "Foto aggiunta all'attività.",
    });
  };

  const removePhoto = (index: number) => {
    setCapturedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg p-4 shadow-sm border">
        <h3 className="text-lg font-semibold mb-4">Tracciamento Attività</h3>
        
        {/* Activity Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Seleziona Attività
          </label>
          <select
            value={selectedActivity || ''}
            onChange={(e) => setSelectedActivity(Number(e.target.value))}
            className="w-full p-2 border border-gray-300 rounded-md"
          >
            <option value="">Scegli un'attività...</option>
            {activities.map((activity) => (
              <option key={activity.id} value={activity.id}>
                {activity.name} - {activity.defaultDuration}h
              </option>
            ))}
          </select>
        </div>

        {/* Notes */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Note
          </label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Aggiungi note per l'attività..."
            rows={3}
          />
        </div>

        {/* Timer Display */}
        {isTracking && (
          <div className="bg-blue-50 p-4 rounded-lg mb-4">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <span className="text-2xl font-mono text-blue-600">
                {formatTime(elapsedTime)}
              </span>
            </div>
            <p className="text-sm text-blue-600 text-center">
              Tracking in corso...
            </p>
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex space-x-2 mb-4">
          {!isTracking ? (
            <Button
              onClick={startTracking}
              disabled={!selectedActivity}
              className="flex-1"
            >
              <Play className="h-4 w-4 mr-2" />
              Inizia
            </Button>
          ) : (
            <>
              <Button
                onClick={pauseTracking}
                variant="outline"
                className="flex-1"
              >
                <Pause className="h-4 w-4 mr-2" />
                Pausa
              </Button>
              <Button
                onClick={resumeTracking}
                variant="outline"
                className="flex-1"
              >
                <Play className="h-4 w-4 mr-2" />
                Riprendi
              </Button>
            </>
          )}
          
          {isTracking && (
            <Button
              onClick={stopTracking}
              variant="destructive"
              className="flex-1"
            >
              <Square className="h-4 w-4 mr-2" />
              Ferma
            </Button>
          )}
        </div>

        {/* Photo Capture Section */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-medium text-gray-700">Foto Attività</h4>
            <Button
              onClick={() => setShowPhotoCapture(true)}
              size="sm"
              variant="outline"
            >
              <Camera className="h-4 w-4 mr-2" />
              Aggiungi Foto
            </Button>
          </div>
          
          {capturedPhotos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {capturedPhotos.map((photo, index) => (
                <div key={index} className="relative">
                  <img
                    src={photo}
                    alt={`Foto ${index + 1}`}
                    className="w-full h-20 object-cover rounded-lg"
                  />
                  <button
                    onClick={() => removePhoto(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Assign Activity Button */}
        <Button
          onClick={assignActivity}
          disabled={!selectedActivity || assignActivityMutation.isPending}
          className="w-full"
          variant="outline"
        >
          <FileText className="h-4 w-4 mr-2" />
          Assegna Attività
        </Button>
      </div>

      {/* Current Job Activities */}
      {jobActivities.length > 0 && (
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <h4 className="text-md font-semibold mb-3">Attività Assegnate</h4>
          <div className="space-y-3">
            {jobActivities.map((jobActivity) => {
              const activity = activities.find(a => a.id === jobActivity.activityId);
              return (
                <div key={jobActivity.id} className="border rounded-lg p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h5 className="font-medium">{activity?.name || 'Attività sconosciuta'}</h5>
                      <p className="text-sm text-gray-600">
                        Durata stimata: {jobActivity.estimatedDuration}h
                      </p>
                      {jobActivity.actualDuration && (
                        <p className="text-sm text-green-600">
                          Durata effettiva: {jobActivity.actualDuration}h
                        </p>
                      )}
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      jobActivity.status === 'completed' 
                        ? 'bg-green-100 text-green-800'
                        : jobActivity.status === 'in_progress'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {jobActivity.status === 'completed' ? 'Completata' :
                       jobActivity.status === 'in_progress' ? 'In corso' : 'Assegnata'}
                    </span>
                  </div>
                  
                  {jobActivity.notes && (
                    <p className="text-sm text-gray-600 mb-2">{jobActivity.notes}</p>
                  )}
                  
                  {jobActivity.status === 'assigned' && (
                    <Button
                      onClick={() => completeActivity(jobActivity.id)}
                      size="sm"
                      className="w-full"
                    >
                      <Square className="h-4 w-4 mr-2" />
                      Completa Attività
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Photo Capture Modal */}
      {showPhotoCapture && (
        <PhotoCapture
          onPhotoCapture={handlePhotoCapture}
          onClose={() => setShowPhotoCapture(false)}
        />
      )}
    </div>
  );
} 