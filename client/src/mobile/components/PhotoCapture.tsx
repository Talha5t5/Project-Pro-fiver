import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Check } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useToast } from '../../hooks/use-toast';

interface PhotoCaptureProps {
  onPhotoCapture: (photo: string) => void;
  onClose: () => void;
}

export default function PhotoCapture({ onPhotoCapture, onClose }: PhotoCaptureProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCapturing(true);
      }
    } catch (error) {
      toast({
        title: "Errore Camera",
        description: "Impossibile accedere alla fotocamera. Verifica i permessi.",
        variant: "destructive"
      });
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);
        
        const photoData = canvas.toDataURL('image/jpeg');
        setCapturedPhoto(photoData);
        setIsCapturing(false);
        
        // Stop camera stream
        const stream = video.srcObject as MediaStream;
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
      }
    }
  };

  const retakePhoto = () => {
    setCapturedPhoto(null);
    startCamera();
  };

  const confirmPhoto = () => {
    if (capturedPhoto) {
      onPhotoCapture(capturedPhoto);
      onClose();
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setCapturedPhoto(result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-4 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Scatta Foto</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {!capturedPhoto ? (
          <div className="space-y-4">
            {!isCapturing ? (
              <div className="text-center space-y-4">
                <div className="bg-gray-100 rounded-lg p-8">
                  <Camera className="h-16 w-16 mx-auto text-gray-400" />
                  <p className="text-gray-600 mt-2">Nessuna foto scattata</p>
                </div>
                
                <div className="flex space-x-2">
                  <Button onClick={startCamera} className="flex-1">
                    <Camera className="h-4 w-4 mr-2" />
                    Scatta Foto
                  </Button>
                  
                  <label className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button variant="outline" className="w-full">
                      <Upload className="h-4 w-4 mr-2" />
                      Carica
                    </Button>
                  </label>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full rounded-lg"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-white bg-opacity-50 rounded-full p-2">
                      <Camera className="h-8 w-8 text-gray-700" />
                    </div>
                  </div>
                </div>
                
                <Button onClick={capturePhoto} className="w-full">
                  <Camera className="h-4 w-4 mr-2" />
                  Scatta
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative">
              <img
                src={capturedPhoto}
                alt="Foto scattata"
                className="w-full rounded-lg"
              />
            </div>
            
            <div className="flex space-x-2">
              <Button onClick={retakePhoto} variant="outline" className="flex-1">
                <X className="h-4 w-4 mr-2" />
                Riprova
              </Button>
              
              <Button onClick={confirmPhoto} className="flex-1">
                <Check className="h-4 w-4 mr-2" />
                Conferma
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 