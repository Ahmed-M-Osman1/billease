"use client";

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Camera, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CameraCaptureProps {
  onCapture: (dataUri: string) => void;
  onClose: () => void;
}

export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const getCameraPermission = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('Camera API not available.');
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Camera Not Supported',
          description: 'Your browser does not support camera access.',
        });
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        setHasCameraPermission(true);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings to use this feature.',
        });
      }
    };

    getCameraPermission();

    // Cleanup: stop video stream when component unmounts
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [toast]);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (context) {
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw the current video frame onto the canvas
      context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
      
      // Get the image data from the canvas
      const dataUri = canvas.toDataURL('image/jpeg');
      
      // Pass the data URI to the parent component
      onCapture(dataUri);
      onClose();
    }
  };

  return (
    <div className="flex flex-col gap-4 items-center">
      <h3 className="text-lg font-medium">Scan Receipt</h3>
      <div className="w-full max-w-md bg-black rounded-lg overflow-hidden border">
        <video
          ref={videoRef}
          className="w-full aspect-video"
          autoPlay
          muted
          playsInline
        />
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {hasCameraPermission === false && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Camera Access Required</AlertTitle>
          <AlertDescription>
            Please allow camera access in your browser settings to use this feature.
          </AlertDescription>
        </Alert>
      )}

      {hasCameraPermission === true && (
         <Button onClick={handleCapture} className="w-full" size="lg">
            <Camera className="mr-2" />
            Capture Receipt
        </Button>
      )}
    </div>
  );
}
