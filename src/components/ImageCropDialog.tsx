import { useCallback, useMemo, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ImageCropDialogProps = {
  open: boolean;
  imageSrc: string | null;
  aspect: number;
  title: string;
  description?: string;
  outputWidth: number;
  outputHeight: number;
  onOpenChange: (open: boolean) => void;
  onConfirm: (croppedImage: string) => void;
};

export function ImageCropDialog({
  open,
  imageSrc,
  aspect,
  title,
  description,
  outputWidth,
  outputHeight,
  onOpenChange,
  onConfirm,
}: ImageCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const helpText = useMemo(
    () => description ?? `Ajuste a imagem para o formato ${outputWidth} x ${outputHeight} px.`,
    [description, outputHeight, outputWidth],
  );

  const handleComplete = useCallback((_croppedArea: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setSubmitting(true);
    try {
      const croppedImage = await getCroppedImage(imageSrc, croppedAreaPixels, outputWidth, outputHeight);
      onConfirm(croppedImage);
      onOpenChange(false);
      setZoom(1);
      setCrop({ x: 0, y: 0 });
      setCroppedAreaPixels(null);
    } finally {
      setSubmitting(false);
    }
  }, [croppedAreaPixels, imageSrc, onConfirm, onOpenChange, outputHeight, outputWidth]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{helpText}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 pb-6">
          <div className="relative h-[420px] overflow-hidden rounded-xl bg-slate-950">
            {imageSrc && (
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={aspect}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={handleComplete}
                showGrid={false}
                objectFit="contain"
              />
            )}
          </div>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium">Zoom</span>
            <input
              type="range"
              min="1"
              max="3"
              step="0.01"
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
            />
          </label>
        </div>

        <DialogFooter className="border-t px-6 py-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={!imageSrc || !croppedAreaPixels || submitting}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Aplicando..." : "Aplicar recorte"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

async function getCroppedImage(
  imageSrc: string,
  crop: Area,
  outputWidth: number,
  outputHeight: number,
): Promise<string> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Nao foi possivel preparar o recorte da imagem.");
  }

  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    outputWidth,
    outputHeight,
  );

  return canvasToDataUrl(canvas);
}

async function canvasToDataUrl(canvas: HTMLCanvasElement): Promise<string> {
  const webpBlob = await canvasToBlob(canvas, "image/webp", 0.88);
  if (webpBlob) {
    return blobToDataUrl(webpBlob);
  }

  const pngBlob = await canvasToBlob(canvas, "image/png");
  if (pngBlob) {
    return blobToDataUrl(pngBlob);
  }

  return canvas.toDataURL("image/png");
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Falha ao converter imagem."));
    };
    reader.onerror = () => reject(new Error("Falha ao converter imagem."));
    reader.readAsDataURL(blob);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () => reject(new Error("Falha ao carregar imagem.")));
    image.src = src;
  });
}
