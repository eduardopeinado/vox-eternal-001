'use client';

import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';

export default function TestUploadPage() {
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [directUrl, setDirectUrl] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Obtener el usuario actual
  const fetchUser = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.error('Error al obtener usuario:', error);
      return;
    }
    setUserId(user?.id || null);
  };

  // Efecto para cargar el usuario al montar
  useEffect(() => {
    fetchUser();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    
    try {
      // Generar un nombre de archivo único
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${uuidv4().substring(0, 10)}.${fileExt}`;
      
      // Generar la ruta del archivo
      // Esta vez, sin capsula_id y directamente en la carpeta del usuario
      const filePath = userId ? `${userId}/${fileName}` : fileName;
      
      console.log('Ruta de archivo para carga:', filePath);
      
      // Subir el archivo a Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from('capsules')
        .upload(filePath, file);
      
      if (uploadError) {
        throw uploadError;
      }
      
      console.log('Archivo subido exitosamente:', data);
      
      // Construir URL pública manualmente para pruebas
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fyauxlcfktjegtqurffj.supabase.co';
      
      // Probar varias combinaciones de URLs
      const possibleDirectUrls = [
        `${supabaseUrl}/storage/v1/object/public/capsules/${filePath}`,
        `${supabaseUrl}/storage/v1/object/public/capsules/public/${filePath}`,
        `${supabaseUrl}/storage/v1/object/public/public/capsules/${filePath}`,
      ];
      
      setUploadedFile(data.path || filePath);
      setDirectUrl(possibleDirectUrls[0]);
      
      // Probar cada URL posible después de un pequeño retraso
      setTimeout(() => {
        console.log('Probando URLs posibles:');
        possibleDirectUrls.forEach((url, index) => {
          const img = new Image();
          img.onload = () => console.log(`✅ URL #${index+1} funciona:`, url);
          img.onerror = () => console.error(`❌ URL #${index+1} falla:`, url);
          img.src = url;
        });
      }, 1000);
      
    } catch (error) {
      console.error('Error al subir archivo:', error);
    } finally {
      setUploading(false);
      // Limpiar input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-3xl">
      <h1 className="font-serif text-3xl text-azul-profundo mb-8">Prueba de Subida de Imágenes</h1>
      
      <div className="mb-6">
        <p className="mb-2">ID de Usuario: {userId || 'No conectado'}</p>
        
        <div className="mb-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            disabled={uploading}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-dorado-claro file:text-white
              hover:file:bg-dorado-claro/90"
          />
        </div>
        
        {uploading && (
          <div className="text-sm text-gray-500 mb-4">Subiendo archivo...</div>
        )}
        
        {uploadedFile && (
          <div className="bg-gray-50 p-4 rounded-md mb-4">
            <h2 className="font-medium mb-2">Archivo Subido:</h2>
            <p className="text-sm mb-1">Ruta: <code className="bg-gray-100 px-1 rounded">{uploadedFile}</code></p>
            {directUrl && (
              <>
                <p className="text-sm mb-2">URL Directa: <code className="bg-gray-100 px-1 rounded break-all">{directUrl}</code></p>
                <div className="mt-4">
                  <h3 className="font-medium mb-2">Vista previa:</h3>
                  <div className="bg-white border border-gray-200 rounded-md p-2 aspect-video flex items-center justify-center">
                    <img 
                      src={directUrl} 
                      alt="Preview" 
                      className="max-h-full max-w-full object-contain"
                      onError={(e) => {
                        console.error('Error al cargar imagen de vista previa:', directUrl);
                        e.currentTarget.style.display = 'none';
                        
                        // Mostrar fallback
                        const parent = e.currentTarget.parentElement;
                        if (parent) {
                          const fallbackEl = document.createElement('div');
                          fallbackEl.className = 'flex flex-col items-center';
                          fallbackEl.innerHTML = `
                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-gray-400 mb-2">
                              <rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect>
                              <circle cx="9" cy="9" r="2"></circle>
                              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path>
                            </svg>
                            <p class="text-sm text-gray-500">Error al cargar imagen</p>
                          `;
                          parent.appendChild(fallbackEl);
                        }
                      }}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
      
      <div className="bg-blue-50 p-4 rounded-md">
        <h2 className="font-medium mb-2">Información para depuración:</h2>
        <p className="text-sm">Revisa la consola del navegador para ver logs detallados sobre las pruebas de URLs.</p>
      </div>
    </div>
  );
} 