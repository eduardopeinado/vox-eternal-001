import { useRef } from "react";
import { ArrowLeft, Upload, User as UserIcon } from "lucide-react";
import type { UserProfile } from "../../types/friendship";
import { useRouter, usePathname } from "next/navigation";
import { useTour } from "@reactour/tour";
import TourIcon from "../icons/TourIcon";
import { supabase } from "../../lib/supabase/client";

interface ProfileEditorProps {
  profile: UserProfile | null;
  formData: {
    nombre: string;
    apellido: string;
    pais: string;
    avatar_url: string;
    bio: string;
  };
  loading: boolean;
  uploading: boolean;
  error: string | null;
  countries: string[];
  activePlan: string;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
  onUpgradePlan: () => void;
}

export function ProfileEditor({
  profile,
  formData,
  loading,
  uploading,
  error,
  countries,
  activePlan,
  onInputChange,
  onAvatarUpload,
  onSubmit,
  onBack,
  onUpgradePlan,
}: ProfileEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { setIsOpen } = useTour();
  const pathname = usePathname();

  const handleTourClick = async () => {
    try {
      if (profile?.id) {
        const { error } = await supabase
          .from("usuarios")
          .update({ show_onboarding: true })
          .eq("id", profile.id);
        if (error) {
          console.error("Error actualizando show_onboarding:", error);
        }
      }
    } catch (err) {
      console.error("Error inesperado al actualizar show_onboarding:", err);
    }

    if (pathname === "/dashboard") {
      setIsOpen(true);
    } else {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("openTour", "true");
      }
      router.push("/dashboard");
    }
  };

  return (
    <div className="max-w-xl mx-auto p-4">
      <button
        onClick={onBack}
        className="mb-4 text-azul-profundo hover:underline flex items-center text-sm font-medium"
      >
        <ArrowLeft size={16} className="mr-1" /> Volver al Dashboard
      </button>
      <h1 className="text-2xl font-bold mb-4">Editar Perfil</h1>
      {error && <p className="text-red-600 mb-4">{error}</p>}
      <form onSubmit={onSubmit} className="space-y-6">
        {/* Avatar */}
        <div>
          <label className="block font-medium mb-1">Foto de perfil</label>
          <div className="flex items-center gap-4">
            {formData.avatar_url ? (
              <img
                src={formData.avatar_url}
                alt="Avatar"
                className="w-20 h-20 rounded-full object-cover border"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center border">
                <UserIcon size={40} className="text-gray-400" />
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium"
              disabled={uploading}
            >
              <Upload size={16} className="mr-2" />
              {uploading ? "Subiendo..." : "Subir foto"}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={onAvatarUpload}
              accept="image/*"
              className="hidden"
              disabled={uploading}
            />
          </div>
        </div>
        {/* Nombre */}
        <div>
          <label htmlFor="nombre" className="block font-medium mb-1">
            Nombre
          </label>
          <input
            type="text"
            id="nombre"
            name="nombre"
            value={formData.nombre}
            onChange={onInputChange}
            className="w-full border border-gray-300 rounded px-3 py-2"
            required
          />
        </div>
        {/* Apellido */}
        <div>
          <label htmlFor="apellido" className="block font-medium mb-1">
            Apellido
          </label>
          <input
            type="text"
            id="apellido"
            name="apellido"
            value={formData.apellido}
            onChange={onInputChange}
            className="w-full border border-gray-300 rounded px-3 py-2"
            required
          />
        </div>
        {/* País */}
        <div>
          <label htmlFor="pais" className="block font-medium mb-1">
            País
          </label>
          <select
            id="pais"
            name="pais"
            value={formData.pais}
            onChange={onInputChange}
            className="w-full border border-gray-300 rounded px-3 py-2"
            required
          >
            <option value="" disabled>
              Selecciona tu país
            </option>
            <optgroup label="🌎 Latinoamérica">
              <option value="Argentina">Argentina</option>
              <option value="Bolivia">Bolivia</option>
              <option value="Brasil">Brasil</option>
              <option value="Chile">Chile</option>
              <option value="Colombia">Colombia</option>
              <option value="Costa Rica">Costa Rica</option>
              <option value="Cuba">Cuba</option>
              <option value="Ecuador">Ecuador</option>
              <option value="El Salvador">El Salvador</option>
              <option value="Guatemala">Guatemala</option>
              <option value="Honduras">Honduras</option>
              <option value="México">México</option>
              <option value="Nicaragua">Nicaragua</option>
              <option value="Panamá">Panamá</option>
              <option value="Paraguay">Paraguay</option>
              <option value="Perú">Perú</option>
              <option value="Puerto Rico">Puerto Rico</option>
              <option value="República Dominicana">República Dominicana</option>
              <option value="Uruguay">Uruguay</option>
              <option value="Venezuela">Venezuela</option>
            </optgroup>
            <optgroup label="🇪🇺 Europa y Nórdicos">
              <option value="Deutschland (Alemania)">Deutschland (Alemania)</option>
              <option value="France (Francia)">France (Francia)</option>
              <option value="Italia">Italia</option>
              <option value="España">España</option>
              <option value="United Kingdom (Reino Unido)">United Kingdom (Reino Unido)</option>
              <option value="Suisse (Suiza)">Suisse (Suiza)</option>
              <option value="Norge (Noruega)">Norge (Noruega)</option>
              <option value="Sverige (Suecia)">Sverige (Suecia)</option>
              <option value="Suomi (Finlandia)">Suomi (Finlandia)</option>
              <option value="Nederland (Países Bajos)">Nederland (Países Bajos)</option>
              <option value="Danmark (Dinamarca)">Danmark (Dinamarca)</option>
              <option value="Österreich (Austria)">Österreich (Austria)</option>
              <option value="België/Belgique (Bélgica)">België/Belgique (Bélgica)</option>
              <option value="Ireland (Irlanda)">Ireland (Irlanda)</option>
              <option value="Luxembourg (Luxemburgo)">Luxembourg (Luxemburgo)</option>
            </optgroup>
            <optgroup label="🌏 Norteamérica y Oceanía">
              <option value="United States">United States</option>
              <option value="Canada">Canada</option>
              <option value="Australia">Australia</option>
              <option value="New Zealand">New Zealand</option>
            </optgroup>
            <optgroup label="🌏 Asia y Medio Oriente">
              <option value="日本 (Japón)">日本 (Japón)</option>
              <option value="대한민국 (Corea del Sur)">대한민국 (Corea del Sur)</option>
              <option value="Singapore">Singapore</option>
              <option value="Hong Kong">Hong Kong</option>
              <option value="ישראל (Israel)">ישראל (Israel)</option>
            </optgroup>
            <optgroup label="🕌 Medio Oriente y Golfo">
              <option value="الإمارات العربية المتحدة (Emiratos Árabes Unidos)">الإمارات العربية المتحدة (Emiratos Árabes Unidos)</option>
              <option value="المملكة العربية السعودية (Arabia Saudita)">المملكة العربية السعودية (Arabia Saudita)</option>
              <option value="قطر (Qatar)">قطر (Qatar)</option>
            </optgroup>
            <option value="Otro">Otro</option>
          </select>
          <div className="my-2 border-t border-dashed border-gray-300" />
        </div>
        {/* Biografía */}
        <div>
          <label htmlFor="bio" className="block font-medium mb-1">
            Biografía
          </label>
          <textarea
            id="bio"
            name="bio"
            value={formData.bio}
            onChange={onInputChange}
            className="w-full border border-gray-300 rounded px-3 py-2 min-h-[80px] resize-vertical"
            placeholder="Cuéntanos algo sobre ti (opcional)"
            maxLength={500}
          />
          <div className="text-xs text-gray-400 text-right">{formData.bio.length}/500</div>
        </div>
        {/* Email y Plan */}
        {profile && (
          <div className="text-sm text-gray-600 flex flex-col gap-1">
            <div>
              <span className="font-semibold">Email:</span> {profile.email}
            </div>
            <div className="flex items-center">
              <div className="plan-section flex items-center gap-2">
                <span>
                  <span className="font-semibold">Plan:</span> {activePlan || "No especificado"}
                </span>
                <button
                  type="button"
                  onClick={onUpgradePlan}
                  className="px-3 py-1 bg-dorado-claro text-azul-profundo rounded hover:bg-yellow-400 transition-colors text-xs font-semibold"
                >
                  Mejorar plan
                </button>
              </div>
              <button
                type="button"
                onClick={handleTourClick}
                className="ml-auto flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-xs font-semibold"
                title="Tour de la aplicación"
              >
                <TourIcon width={18} height={18} className="mr-1" />
                <span>Tour de la aplicación</span>
              </button>
            </div>
          </div>
        )}
        {/* Guardar */}
        <button
          type="submit"
          disabled={loading || uploading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Guardar cambios
        </button>
      </form>
    </div>
  );
}

export default ProfileEditor;
