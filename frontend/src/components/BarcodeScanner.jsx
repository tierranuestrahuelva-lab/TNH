import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X, Camera, Loader2, Keyboard } from "lucide-react";

export default function BarcodeScanner({ onClose, onDetected }) {
    const scannerRef = useRef(null);
    const regionId = "tnh-scanner-region";
    const [error, setError] = useState("");
    const [starting, setStarting] = useState(true);
    const [manual, setManual] = useState("");

    useEffect(() => {
        let scanner;
        const start = async () => {
            try {
                scanner = new Html5Qrcode(regionId, { verbose: false });
                scannerRef.current = scanner;
                const cameras = await Html5Qrcode.getCameras();
                if (!cameras?.length) throw new Error("No se detectó ninguna cámara.");
                // Prefer back camera
                const cam = cameras.find((c) => /back|trás|environment/i.test(c.label)) || cameras[0];
                await scanner.start(
                    cam.id,
                    {
                        fps: 10,
                        qrbox: { width: 260, height: 140 },
                        aspectRatio: 1.6,
                    },
                    (decoded) => {
                        onDetected(decoded);
                    },
                    () => {}
                );
                setStarting(false);
            } catch (err) {
                setStarting(false);
                setError(
                    err?.message ||
                        "No se pudo iniciar la cámara. Verifica permisos o usa entrada manual."
                );
            }
        };
        start();
        return () => {
            try {
                if (scannerRef.current && scannerRef.current.isScanning) {
                    scannerRef.current.stop().then(() => scannerRef.current.clear());
                }
            } catch (e) {}
        };
    }, [onDetected]);

    const submitManual = () => {
        if (manual.trim()) onDetected(manual.trim());
    };

    return (
        <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            data-testid="scanner-modal"
        >
            <div className="card-thin bg-card w-full max-w-lg overflow-hidden shadow-2xl">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                    <div className="flex items-center gap-2">
                        <Camera className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold">Escaneo de código</h3>
                    </div>
                    <button
                        data-testid="scanner-close-btn"
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-5">
                    <div
                        id={regionId}
                        className="rounded-lg overflow-hidden bg-black aspect-[16/10] flex items-center justify-center"
                    >
                        {starting && (
                            <div className="flex flex-col items-center text-white/80 text-sm">
                                <Loader2 className="h-8 w-8 animate-spin" />
                                <span className="mt-2">Iniciando cámara…</span>
                            </div>
                        )}
                    </div>
                    {error && (
                        <div
                            className="mt-3 text-sm text-destructive bg-destructive/10 rounded-lg p-3"
                            data-testid="scanner-error"
                        >
                            {error}
                        </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-3">
                        Apunta al código de barras o QR. Se buscará por código exacto y, si no
                        hay coincidencia, por similitud (nombre / abreviatura).
                    </p>

                    <div className="mt-5 border-t border-border pt-4">
                        <div className="overline mb-2 flex items-center gap-1.5">
                            <Keyboard className="h-3 w-3" /> Entrada manual
                        </div>
                        <div className="flex gap-2">
                            <input
                                data-testid="scanner-manual-input"
                                value={manual}
                                onChange={(e) => setManual(e.target.value)}
                                placeholder="Código o texto…"
                                className="flex-1 px-3 py-2 rounded-lg bg-card border border-input text-sm outline-none focus:border-primary"
                                onKeyDown={(e) => e.key === "Enter" && submitManual()}
                            />
                            <button
                                data-testid="scanner-manual-submit"
                                onClick={submitManual}
                                className="btn-pill bg-primary text-primary-foreground border-primary"
                            >
                                Buscar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
