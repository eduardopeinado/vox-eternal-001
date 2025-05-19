'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Loader2, AlertCircle, Mic, Video, StopCircle, Play, Send, CameraOff, CheckCircle, X as CloseIcon, Radio } from 'lucide-react';
import { toast } from 'sonner';

// Basic Tailwind classes
const buttonClasses = "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-white dark:ring-offset-gray-950 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";
const primaryButtonClasses = `${buttonClasses} bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 px-4 py-2`;
const outlineButtonClasses = `${buttonClasses} border border-gray-300 dark:border-gray-600 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-300 px-4 py-2`;
const dangerButtonClasses = `${buttonClasses} bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 px-4 py-2`;

interface RecordingModalProps {
  isOpen: boolean;
  recordType: 'audio' | 'video' | null;
  onClose: () => void;
  onRecordingComplete: () => void; // Callback to refresh list
}

export default function RecordingModal({ isOpen, recordType, onClose, onRecordingComplete }: RecordingModalProps) {
  const [permissionStatus, setPermissionStatus] = useState<'idle' | 'pending' | 'granted' | 'denied'>('idle');
  const [recordingStatus, setRecordingStatus] = useState<'idle' | 'recording' | 'stopped'>('idle');
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  const mimeType = recordType === 'video' ? 'video/webm;codecs=vp8,opus' : 'audio/webm;codecs=opus'; // More specific mime types

  // Cleanup function
  const cleanup = useCallback((keepPermissionStatus = false) => {
    console.log("Cleaning up recording resources...");
    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = null;
      videoPreviewRef.current.pause();
      videoPreviewRef.current.removeAttribute('src');
      videoPreviewRef.current.load();
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) { console.warn("Error stopping recorder on cleanup:", e); }
    }
    mediaRecorderRef.current = null;
    recordedChunksRef.current = [];
    setRecordedBlob(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setRecordingStatus('idle');
    if (!keepPermissionStatus) { // Only reset permission if not explicitly kept (e.g., for retry)
        setPermissionStatus('idle');
    }
    setError(null);
    setIsUploading(false);
    setLocation(null);
    setLocationError(null);
  }, [previewUrl]);

  // Request permissions function
  const requestPermissionsAndSetup = useCallback(async () => {
    if (!recordType) return;
    console.log(`Requesting permissions for ${recordType}... Current status: ${permissionStatus}`);

    // Only proceed if status is idle
    if (permissionStatus !== 'idle') {
        console.log("Permission request skipped, status not idle:", permissionStatus);
        return;
    }

    setPermissionStatus('pending');
    setError(null);
    // Ensure previous stream is stopped
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = null;
    }

    try {
      const constraints = recordType === 'video'
        ? { audio: true, video: { facingMode: "user" } } // Prefer front camera
        : { audio: true };
      console.log("Requesting media permissions with constraints:", constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;
      setPermissionStatus('granted');
      console.log("Permissions granted for:", recordType);

      // Setup video preview immediately after getting the stream
      if (recordType === 'video' && videoPreviewRef.current) {
        console.log("Setting video preview srcObject");
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.muted = true;
        videoPreviewRef.current.playsInline = true; // Important for mobile
        // Attempt to play, log errors but don't block UI
        videoPreviewRef.current.play().catch(e => console.error("Video preview play error (non-blocking):", e));
      }
    } catch (err: any) {
      console.error("Error getting media permissions:", err);
      setError(`Error de permisos: ${err.message}. Asegúrate de permitir el acceso a tu ${recordType === 'video' ? 'cámara y micrófono' : 'micrófono'}.`);
      setPermissionStatus('denied');
      }
  }, [recordType, permissionStatus]); // Added permissionStatus dependency

  // Effect to handle modal open/close and initial permission request
  // This effect handles the initial opening and resets when type changes or modal re-opens
  useEffect(() => {
    if (isOpen && recordType) {
      console.log("Effect [isOpen, recordType]: Modal opened or type changed. Resetting state.");
      // Reset state but keep permission status as is initially, let the next effect handle request if needed
      cleanup(true); // true = keep permission status for now
      setPermissionStatus('idle'); // Explicitly reset permission status here to trigger the next effect
    } else if (!isOpen) {
      console.log("Effect [isOpen, recordType]: Modal closed. Cleaning up.");
      cleanup(false); // Full cleanup on close
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, recordType]); // Intentionally exclude cleanup to avoid loops, manage state reset carefully

  // Effect to request permissions *only* when status is 'idle' and modal is open
  useEffect(() => {
      if (isOpen && recordType && permissionStatus === 'idle') {
          console.log("Effect [permissionStatus]: Status is idle. Requesting permissions...");
          requestPermissionsAndSetup();
      }
  }, [isOpen, recordType, permissionStatus, requestPermissionsAndSetup]); // Dependencies are correct

      // Effect to specifically handle setting the video preview when stream is ready, with enhanced logging
  useEffect(() => {
      const videoElement = videoPreviewRef.current;
      const stream = mediaStreamRef.current; // Capture the current value of the ref

      console.log(`Effect [video preview]: recordType=${recordType}, permissionStatus=${permissionStatus}, stream available=${!!stream}, videoElement available=${!!videoElement}`);

      // Define event listeners
      const handleLoadedMetadata = () => console.log('[Video Event] loadedmetadata');
      const handleCanPlay = () => console.log('[Video Event] canplay');
      const handlePlaying = () => console.log('[Video Event] playing');
      const handleError = (e: Event) => console.error('[Video Event] error:', e, videoElement?.error);

      if (recordType === 'video' && permissionStatus === 'granted' && stream && videoElement) {
          // Log stream and track status
          const videoTracks = stream.getVideoTracks();
          console.log(`Stream active: ${stream.active}. Video tracks: ${videoTracks.length}`);
          videoTracks.forEach((track, i) => {
              console.log(`  Track ${i}: readyState=${track.readyState}, muted=${track.muted}, enabled=${track.enabled}`);
          });

          if (videoElement.srcObject !== stream) {
              console.log("Assigning stream to video element's srcObject.");
              // Remove old listeners before assigning new stream
              videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
              videoElement.removeEventListener('canplay', handleCanPlay);
              videoElement.removeEventListener('playing', handlePlaying);
              videoElement.removeEventListener('error', handleError);

              videoElement.srcObject = stream;
              videoElement.muted = true;
              videoElement.playsInline = true;

              // Add new listeners
              videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
              videoElement.addEventListener('canplay', handleCanPlay);
              videoElement.addEventListener('playing', handlePlaying);
              videoElement.addEventListener('error', handleError);

              // Attempt to play immediately, log state
              console.log("Attempting immediate play(). Video state:", { readyState: videoElement.readyState, networkState: videoElement.networkState, paused: videoElement.paused });
              videoElement.play().then(() => {
                  console.log("Immediate video preview playback started successfully.");
              }).catch(e => {
                  console.error("Immediate video preview play error:", e, "Retrying in 100ms.");
                  // Retry after a short delay if immediate play fails
                  setTimeout(() => {
                      if (videoElement.srcObject === stream) { // Check if stream is still assigned
                          console.log("Retrying play() via setTimeout. Video state:", { readyState: videoElement.readyState, networkState: videoElement.networkState, paused: videoElement.paused });
                          videoElement.play().then(() => {
                              console.log("Video preview playback started successfully via setTimeout.");
                          }).catch(e2 => {
                              console.error("Video preview play error in setTimeout:", e2);
                          });
                      } else {
                           console.log("Stream changed or removed before setTimeout retry.");
                      }
                  }, 100);
              });
          } else {
               console.log("Stream already assigned. Checking if paused.");
               if (videoElement.paused) {
                   console.log("Video element paused, attempting play again.");
                   videoElement.play().catch(e => console.error("Video preview play retry error:", e));
               } else {
                    console.log("Video element already playing or attempting to play.");
               }
          }
      } else if (videoElement && !stream) {
          // Ensure srcObject is cleared if stream becomes unavailable while granted
          console.log("Stream became unavailable, clearing srcObject.");
          videoElement.srcObject = null;
          // Remove listeners when stream is removed
          videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
          videoElement.removeEventListener('canplay', handleCanPlay);
          videoElement.removeEventListener('playing', handlePlaying);
          videoElement.removeEventListener('error', handleError);
      }

      // Cleanup function for the effect
      return () => {
          console.log("Cleanup Effect [video preview]: Removing event listeners.");
          if (videoElement) {
              videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
              videoElement.removeEventListener('canplay', handleCanPlay);
              videoElement.removeEventListener('playing', handlePlaying);
              videoElement.removeEventListener('error', handleError);
              // Don't nullify srcObject here, let the main cleanup handle it if necessary
          }
      };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordType, permissionStatus, mediaStreamRef.current, recordingStatus]); // Added recordingStatus


  const startRecording = () => {
    if (!mediaStreamRef.current || permissionStatus !== 'granted') {
      setError("No se puede iniciar la grabación. Verifica los permisos.");
      console.error("Attempted to start recording without stream or permission.");
      return;
    }
    if (recordingStatus !== 'idle') {
        console.warn("Start recording called when not idle.");
        return;
    }

    setError(null);
    recordedChunksRef.current = [];

    try {
      let recorderOptions: MediaRecorderOptions = {};
      if (MediaRecorder.isTypeSupported(mimeType)) {
        recorderOptions.mimeType = mimeType;
      } else {
        console.warn(`${mimeType} is not supported, using browser default.`);
      }

      console.log("Creating MediaRecorder with stream:", mediaStreamRef.current, "and options:", recorderOptions);
      const recorder = new MediaRecorder(mediaStreamRef.current, recorderOptions);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.log("Data available:", event.data.size);
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        console.log("MediaRecorder stopped. Chunks length:", recordedChunksRef.current.length);
        if (recordedChunksRef.current.length === 0) {
            console.warn("No data chunks recorded.");
            setError("No se grabaron datos. Inténtalo de nuevo.");
            setRecordingStatus('idle');
            // Keep stream active to allow immediate retry without asking permission again
            return;
        }
        // Use the actual mimeType the recorder used, or fallback
        const blobMimeType = mediaRecorderRef.current?.mimeType || mimeType || 'application/octet-stream';
        const blob = new Blob(recordedChunksRef.current, { type: blobMimeType });
        console.log("Blob created:", blob);
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        setRecordingStatus('stopped');
        // Stop stream tracks *after* recording is fully stopped and blob created
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(track => track.stop());
          mediaStreamRef.current = null;
        }
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = null;
        }
      };

      recorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        setError(`Error durante la grabación: ${(event as any).error?.message || 'Error desconocido'}`);
        setRecordingStatus('idle');
        cleanup(true); // Keep permission status if it was granted
      };

      recorder.start();
      setRecordingStatus('recording');
      console.log("Recording started. Recorder state:", recorder.state, "MimeType:", recorder.mimeType);

    } catch (err: any) {
      console.error("Error creating MediaRecorder:", err);
      setError(`No se pudo iniciar la grabación. Error: ${err.message}`);
      setRecordingStatus('idle');
      cleanup(true); // Keep permission status if it was granted
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      console.log("Stopping recording...");
      mediaRecorderRef.current.stop();
    } else {
      console.warn("Stop recording called but recorder not active or already stopped.");
    }
  };

  const getLocation = (): Promise<{ latitude: number; longitude: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setLocationError("Geolocalización no soportada.");
        resolve(null);
        return;
      }
      setLocationError(null);
      console.log("Requesting geolocation...");
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = { latitude: position.coords.latitude, longitude: position.coords.longitude };
          console.log("Geolocation obtained:", coords);
          setLocation(coords);
          resolve(coords);
        },
        (err) => {
          console.error("Geolocation error:", err);
          setLocationError(`Error obteniendo ubicación: ${err.message}`);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    });
  };

  const handleUpload = async () => {
    if (!recordedBlob) {
      setError("No hay grabación para subir.");
      return;
    }
    setIsUploading(true);
    setError(null);
    setLocationError(null);

    const currentCoords = await getLocation();
    if (!currentCoords) {
      console.warn("Proceeding with upload without location data.");
    }

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) throw new Error("No se pudo obtener la sesión.");

      const timestamp = Date.now();
      // Use the actual blob type if available, otherwise fallback based on recordType
      const actualMimeType = recordedBlob.type || mimeType;
      const fileExtension = (actualMimeType.split('/')[1] || 'webm').split(';')[0];
      const fileName = `grabacion-${timestamp}.${fileExtension}`;

      const formData = new FormData();
      formData.append('fileBlob', recordedBlob, fileName);
      formData.append('fileName', fileName);
      formData.append('fileType', recordType!);
      if (currentCoords) {
        formData.append('latitude', String(currentCoords.latitude));
        formData.append('longitude', String(currentCoords.longitude));
        formData.append('longitude', String(currentCoords.longitude));
      }

      // --- FINAL ATTEMPT: Use fetch directly, INCLUDING Authorization header ---
      console.log("--- Calling function using fetch directly (WITH auth header) ---");
      const { data: sessionDataFetch, error: sessionErrorFetch } = await supabase.auth.getSession(); // Get session again to ensure fresh token
      if (sessionErrorFetch || !sessionDataFetch.session) {
        throw new Error("Fetch Test: No se pudo obtener la sesión.");
      }
      const accessToken = sessionDataFetch.session.access_token;

      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      const functionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/add-direct-recording`;

      if (!anonKey || !functionUrl) {
          console.error("Fetch Error: Missing Supabase URL or Anon Key in client env variables.");
          throw new Error("Error de configuración: Faltan variables de entorno.");
      }

      const response = await fetch(functionUrl, {
          method: 'POST',
          headers: {
              'apikey': anonKey,
              'Authorization': `Bearer ${accessToken}`, // Explicitly add the Authorization header
              // Content-Type is set automatically by fetch for FormData
          },
          body: formData,
      });

      console.log("Fetch response status:", response.status);

      if (!response.ok) {
          // Try to parse error details from the response body
          const errorBody = await response.json().catch(() => ({
              error: `Error ${response.status}`,
              details: response.statusText || 'No se pudo obtener detalles del error.'
          }));
          console.error("Fetch Function returned error:", errorBody);
          // Throw an error that will be caught by the outer catch block
          throw new Error(`Error al subir grabación: ${errorBody.error || errorBody.details}`);
      }

      // If response is OK, parse the successful response data
      const data = await response.json();
      console.log("Fetch Function successful response data:", data);

      // Check if the *function itself* returned an error structure in its JSON response
      // (even with a 2xx status, the function logic might have encountered a handled error)
      if (data?.error) {
           console.error("Function returned error in success response:", data);
           throw new Error(`Error desde la función: ${data.error} ${data.details || ''}`);
      }
      // --- END FINAL SOLUTION ---

      // If we reach here, the fetch was successful and the function didn't return an error object
      toast.success('¡Grabación añadida como favorito!');
      onRecordingComplete();
      handleModalClose(); // Close modal after successful upload

    } catch (err: any) { // Outer catch block handles errors from fetch, JSON parsing, or thrown errors
      console.error('Error uploading recording:', err);
      setError(err.message || 'Ocurrió un error inesperado.');
      toast.error(err.message || 'Ocurrió un error inesperado.');
    } finally {
      setIsUploading(false);
    }
  };

  // Function to reset state for retrying recording
  const resetForRetry = () => {
      console.log("Resetting state for retry...");
      setRecordedBlob(null);
      if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
          setPreviewUrl(null);
      }
      setRecordingStatus('idle');
      // Reset permission status to trigger re-request in useEffect
      // Important: Only reset if it wasn't denied permanently by user
      if (permissionStatus !== 'denied') {
          setPermissionStatus('idle');
      } else {
          console.log("Keeping permission status as denied.");
      }
      setError(null);
      setLocation(null);
      setLocationError(null);
      // The useEffect hook above will detect permissionStatus === 'idle' and re-trigger requestPermissionsAndSetup
      // No need to call requestPermissionsAndSetup directly here.
  };

  const handleModalClose = () => {
    cleanup(false); // Full cleanup including permission status reset
    onClose();
  };

  // Render logic based on state
  const renderContent = () => {
    if (permissionStatus === 'pending') {
      return <div className="text-center p-8"><Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />Solicitando permisos...</div>;
    }
    if (permissionStatus === 'denied') {
      return (
        <div className="text-center p-8 text-red-600">
          <CameraOff className="h-12 w-12 mx-auto mb-4" />
          <p>Permiso denegado.</p>
          <p className="text-sm text-gray-500 mt-2">{error || `Debes permitir el acceso a ${recordType === 'video' ? 'cámara y micrófono' : 'micrófono'} en la configuración de tu navegador.`}</p>
        </div>
      );
    }
    if (permissionStatus === 'granted') {
      if (recordingStatus === 'idle') {
        console.log('Renderizando vista idle (video)'); // Log añadido
        return (
          <div className="text-center p-8 relative">
            {recordType === 'video' && (
              <video ref={videoPreviewRef} className="w-full h-64 bg-black rounded mb-4" playsInline muted />
            )}
            {recordType === 'audio' && (
              <div className="flex flex-col items-center justify-center h-64 bg-gray-100 dark:bg-gray-700 rounded mb-4">
                <Mic className="h-16 w-16 text-gray-400" />
                <p className="mt-2 text-gray-500 dark:text-gray-300">Listo para grabar audio</p>
              </div>
            )}
            <button onClick={startRecording} className={dangerButtonClasses}>
              <Radio className="mr-2 h-4 w-4" /> Iniciar Grabación de {recordType === 'audio' ? 'Audio' : 'Video'}
            </button>
          </div>
        );
      }
      if (recordingStatus === 'recording') {
        console.log('Renderizando vista recording (video)'); // Log añadido
        return (
          <div className="text-center p-8 relative">
            <div className="absolute top-2 left-2 flex items-center bg-red-600 text-white text-xs font-bold px-2 py-1 rounded z-10">
              <span className="w-2 h-2 bg-white rounded-full mr-1.5 animate-pulse"></span>
              REC
            </div>
            {recordType === 'video' && (
              <video ref={videoPreviewRef} className="w-full h-64 bg-black rounded mb-4" playsInline muted />
            )}
            {recordType === 'audio' && (
              <div className="flex flex-col items-center justify-center h-64 bg-gray-100 dark:bg-gray-700 rounded mb-4">
                <Mic className="h-16 w-16 text-red-500 animate-pulse" />
                <p className="mt-2 text-red-500">Grabando audio...</p>
              </div>
            )}
            <button onClick={stopRecording} className={outlineButtonClasses}>
              <StopCircle className="mr-2 h-4 w-4" /> Detener Grabación
            </button>
          </div>
        );
      }
      if (recordingStatus === 'stopped' && previewUrl) {
        return (
          <div className="p-4">
            <h4 className="font-semibold mb-2 text-center text-gray-800 dark:text-white">Previsualización</h4>
            {recordType === 'audio' && (
              <audio controls src={previewUrl} className="w-full mb-4">Preview</audio>
            )}
            {recordType === 'video' && (
              <video controls src={previewUrl} className="w-full max-h-64 bg-black rounded mb-4">Preview</video>
            )}
            {locationError && <p className="text-xs text-red-500 mb-2 text-center">{locationError}</p>}
            <div className="flex justify-center space-x-3">
              <button onClick={resetForRetry} className={outlineButtonClasses}> {/* Call resetForRetry */}
                Volver a Grabar
              </button>
              <button onClick={handleUpload} disabled={isUploading} className={primaryButtonClasses}>
                {isUploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Subiendo...</> : <><Send className="mr-2 h-4 w-4" /> Subir Grabación</>}
              </button>
            </div>
          </div>
        );
      }
    }
    // Default/Idle state before permissions requested
    return <div className="p-8 text-center text-gray-500">Preparando grabadora...</div>;
  };

  if (!isOpen || !recordType) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" aria-labelledby="record-dialog-title" role="dialog" aria-modal="true">
      <div className="relative w-full max-w-lg p-6 bg-white dark:bg-gray-900 rounded-lg shadow-xl">
        <button
          onClick={handleModalClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          aria-label="Cerrar"
        >
          <CloseIcon className="h-5 w-5" />
        </button>
        <div className="mb-4">
          <h2 id="record-dialog-title" className="text-xl font-semibold text-gray-900 dark:text-white">
            Grabar {recordType === 'audio' ? 'Audio' : 'Video'} Favorito
          </h2>
        </div>

        {error && (
            <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded text-sm flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              {error}
            </div>
        )}

        {renderContent()}

      </div>
    </div>
  );
}
