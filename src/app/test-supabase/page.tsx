'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function TestSupabasePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bucketInfo, setBucketInfo] = useState<any>(null);
  const [storageFiles, setStorageFiles] = useState<any[]>([]);
  
  // Recuperar el usuario y la información de Supabase al cargar
  useEffect(() => {
    const fetchUserAndBucketInfo = async () => {
      try {
        setLoading(true);
        
        // Obtener usuario
        const { data: { user: userData }, error: userError } = await supabase.auth.getUser();
        
        if (userError) throw userError;
        setUser(userData);
        
        // Obtener información del bucket
        const { data: bucketData, error: bucketError } = await supabase.storage.getBucket('capsules');
        
        if (bucketError) throw bucketError;
        setBucketInfo(bucketData);
        
        // Intentar listar archivos
        if (userData) {
          // Probar con diferentes rutas
          const paths = ['', 'public', userData.id];
          
          for (const path of paths) {
            try {
              const { data: files, error: filesError } = await supabase.storage
                .from('capsules')
                .list(path);
                
              if (!filesError && files && files.length > 0) {
                console.log(`Archivos encontrados en ruta '${path}':`, files);
                setStorageFiles(prevFiles => [
                  ...prevFiles, 
                  ...files.map(f => ({ ...f, path: path ? `${path}/${f.name}` : f.name }))
                ]);
              }
            } catch (e) {
              console.warn(`Error al listar archivos en ruta '${path}':`, e);
            }
          }
        }
        
      } catch (err: any) {
        console.error('Error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserAndBucketInfo();
  }, []);
  
  // Generar una URL pública para un archivo
  const getPublicUrl = (fileName: string) => {
    const url = supabase.storage.from('capsules').getPublicUrl(fileName).data.publicUrl;
    return url;
  };
  
  if (loading) {
    return (
      <div className="container mx-auto p-8 max-w-4xl">
        <p className="text-gray-500">Cargando información...</p>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="font-serif text-3xl text-azul-profundo mb-6">Información de Supabase Storage</h1>
      
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6">
          Error: {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Información del usuario */}
        <div className="bg-white border border-gray-200 rounded-md p-6 shadow-sm">
          <h2 className="font-medium text-xl mb-4">Usuario Actual</h2>
          {user ? (
            <div>
              <p className="mb-2"><span className="font-medium">ID:</span> {user.id}</p>
              <p className="mb-2"><span className="font-medium">Email:</span> {user.email}</p>
              <p className="mb-2"><span className="font-medium">Autenticado vía:</span> {user.app_metadata?.provider || 'desconocido'}</p>
              <p className="mb-2"><span className="font-medium">Creado:</span> {new Date(user.created_at).toLocaleString()}</p>
            </div>
          ) : (
            <p className="text-gray-500">No autenticado</p>
          )}
        </div>
        
        {/* Información del bucket */}
        <div className="bg-white border border-gray-200 rounded-md p-6 shadow-sm">
          <h2 className="font-medium text-xl mb-4">Bucket "capsules"</h2>
          {bucketInfo ? (
            <div>
              <p className="mb-2"><span className="font-medium">ID:</span> {bucketInfo.id}</p>
              <p className="mb-2"><span className="font-medium">Nombre:</span> {bucketInfo.name}</p>
              <p className="mb-2"><span className="font-medium">Público:</span> {bucketInfo.public ? 'Sí' : 'No'}</p>
              <p className="mb-2"><span className="font-medium">Creado:</span> {new Date(bucketInfo.created_at).toLocaleString()}</p>
              <p className="mb-2"><span className="font-medium">Actualizado:</span> {new Date(bucketInfo.updated_at).toLocaleString()}</p>
            </div>
          ) : (
            <p className="text-gray-500">No hay información del bucket</p>
          )}
        </div>
      </div>
      
      {/* Archivos almacenados */}
      <div className="mt-8">
        <h2 className="font-medium text-xl mb-4">Archivos Almacenados</h2>
        
        {storageFiles.length > 0 ? (
          <div className="bg-white border border-gray-200 rounded-md shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ruta</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tamaño</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vista Previa</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {storageFiles.map((file, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{file.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{file.path}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{(file.metadata?.size / 1024).toFixed(2)} KB</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {/\.(jpg|jpeg|png|gif|webp)$/i.test(file.name) ? (
                        <div className="h-12 w-12 relative">
                          <img 
                            src={getPublicUrl(file.path)}
                            alt={file.name}
                            className="h-full w-full object-cover rounded-sm"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const parent = e.currentTarget.parentElement;
                              if (parent) {
                                parent.innerHTML = '<span class="text-red-500 text-xs">Error</span>';
                              }
                            }}
                          />
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">N/A</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">No se encontraron archivos</p>
        )}
      </div>
      
      {/* Información sobre RLS */}
      <div className="mt-8 bg-blue-50 p-6 rounded-md">
        <h2 className="font-medium text-xl mb-4">Sobre Row Level Security</h2>
        <p className="mb-3">Supabase Storage puede usar políticas RLS para controlar el acceso a archivos:</p>
        <ul className="list-disc list-inside mb-4 space-y-1">
          <li>El bucket "capsules" debe tener habilitado el permiso de lectura pública si está configurado como público.</li>
          <li>Las políticas de seguridad se pueden configurar por usuario o por otros criterios.</li>
          <li>Es posible que estemos enfrentando un problema de permisos si las imágenes no se cargan correctamente.</li>
        </ul>
        <p className="text-sm italic">Verifica la configuración de Storage RLS en el panel de Supabase.</p>
      </div>
    </div>
  );
} 