import { useRef, useState } from "react";
import { Camera, Check, X, RotateCcw, Upload } from "lucide-react";
import { Button } from "./ui/button";
import { getPhotoUrl } from "../lib/api";

const POSITIONS = [
  { id: "front", label: "Front View" },
  { id: "back", label: "Rear View" },
  { id: "left", label: "Left Side" },
  { id: "right", label: "Right Side" }
];

export default function PhotoUploader({ photos = [], onUpload, disabled = false }) {
  const fileInputRef = useRef(null);
  const [activePosition, setActivePosition] = useState(null);
  const [previews, setPreviews] = useState({});
  const [uploading, setUploading] = useState({});

  const getPhotoForPosition = (position) => {
    return photos.find(p => p.position === position);
  };

  const handleFileSelect = async (e, position) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviews(prev => ({ ...prev, [position]: e.target.result }));
    };
    reader.readAsDataURL(file);

    // Upload
    setUploading(prev => ({ ...prev, [position]: true }));
    try {
      await onUpload(position, file);
      setPreviews(prev => {
        const newPreviews = { ...prev };
        delete newPreviews[position];
        return newPreviews;
      });
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setUploading(prev => ({ ...prev, [position]: false }));
      setActivePosition(null);
    }
  };

  const handleCapture = (position) => {
    setActivePosition(position);
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {POSITIONS.map(({ id, label }) => {
          const photo = getPhotoForPosition(id);
          const preview = previews[id];
          const isUploading = uploading[id];
          const hasPhoto = photo || preview;

          return (
            <div key={id} className="space-y-2">
              <label className="text-sm font-medium text-neutral-700">{label}</label>
              <div
                className={`photo-upload-zone ${hasPhoto ? "has-photo" : ""}`}
                onClick={() => !disabled && !isUploading && handleCapture(id)}
              >
                {isUploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="spinner border-[#0056D2] border-t-transparent"></div>
                    <span className="text-xs text-neutral-500">Uploading...</span>
                  </div>
                ) : hasPhoto ? (
                  <div className="relative w-full h-full">
                    <img
                      src={preview || getPhotoUrl(photo.filename)}
                      alt={label}
                      className="photo-preview rounded-lg"
                    />
                    <div className="absolute top-2 right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    {!disabled && (
                      <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                        <div className="flex items-center gap-2 text-white text-sm">
                          <RotateCcw className="w-4 h-4" />
                          Replace
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <Camera className="w-8 h-8 text-neutral-400" />
                    <span className="text-xs text-neutral-500">Tap to capture</span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => activePosition && handleFileSelect(e, activePosition)}
        data-testid="photo-input"
      />

      <div className="flex items-center justify-between text-sm">
        <span className="text-neutral-500">
          {photos.length} of 4 photos uploaded
        </span>
        {photos.length === 4 && (
          <span className="text-green-600 font-medium flex items-center gap-1">
            <Check className="w-4 h-4" />
            All photos captured
          </span>
        )}
      </div>
    </div>
  );
}
