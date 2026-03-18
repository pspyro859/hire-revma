import { useRef, useEffect, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "./ui/button";
import { Eraser, Check, RotateCcw } from "lucide-react";

export default function SignaturePad({ onSave, onClear, disabled = false }) {
  const sigCanvas = useRef(null);
  const containerRef = useRef(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [dimensions, setDimensions] = useState({ width: 400, height: 200 });

  // Responsive canvas sizing
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        setDimensions({
          width: width,
          height: Math.min(200, width * 0.5)
        });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  const handleClear = () => {
    sigCanvas.current?.clear();
    setIsEmpty(true);
    onClear?.();
  };

  const handleSave = () => {
    if (sigCanvas.current && !isEmpty) {
      const dataUrl = sigCanvas.current.toDataURL("image/png");
      onSave(dataUrl);
    }
  };

  const handleEnd = () => {
    setIsEmpty(sigCanvas.current?.isEmpty() ?? true);
  };

  return (
    <div className="space-y-4">
      <div 
        ref={containerRef}
        className="signature-wrapper relative border-2 border-dashed border-neutral-300 rounded-lg overflow-hidden"
      >
        {/* Grid background for signature area */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(to right, #CBD5E1 1px, transparent 1px),
              linear-gradient(to bottom, #CBD5E1 1px, transparent 1px)
            `,
            backgroundSize: "20px 20px"
          }}
        />
        
        <SignatureCanvas
          ref={sigCanvas}
          penColor="#1E293B"
          canvasProps={{
            width: dimensions.width,
            height: dimensions.height,
            className: "sig-canvas relative z-10",
            style: { 
              backgroundColor: "rgba(255, 255, 255, 0.9)",
              touchAction: "none"
            }
          }}
          onEnd={handleEnd}
          clearOnResize={false}
        />
        
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
            <p className="text-neutral-400 text-sm">Sign here</p>
          </div>
        )}
        
        {disabled && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-20">
            <p className="text-neutral-500 text-sm">Signature disabled</p>
          </div>
        )}
      </div>
      
      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={handleClear}
          disabled={disabled || isEmpty}
          className="flex items-center gap-2"
          data-testid="clear-signature-btn"
        >
          <RotateCcw className="w-4 h-4" />
          Clear
        </Button>
        
        <Button
          type="button"
          onClick={handleSave}
          disabled={disabled || isEmpty}
          className="btn-primary flex items-center gap-2"
          data-testid="save-signature-btn"
        >
          <Check className="w-4 h-4" />
          Confirm Signature
        </Button>
      </div>
      
      <p className="text-xs text-neutral-500 text-center">
        By signing above, you acknowledge that you have read and agree to the terms and conditions of this hire agreement.
      </p>
    </div>
  );
}
