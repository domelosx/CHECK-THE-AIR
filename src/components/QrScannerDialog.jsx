import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, Check, FileImage, Info, X } from "lucide-react";
import { toast } from "sonner";
import { decodeFirefighter } from "@/lib/qr";
import { useLang } from "@/lib/i18n";

export default function QrScannerDialog({ open, onOpenChange, onScanned }) {
    const { t } = useLang();
    const scannerRef = useRef(null);
    const fileInputRef = useRef(null);
    const regionId = "qr-reader-region";
    const [status, setStatus] = useState("idle"); // idle | starting | scanning | error
    const [errorMsg, setErrorMsg] = useState("");

    useEffect(() => {
        if (!open) {
            setStatus("idle");
            setErrorMsg("");
            return;
        }

        let cancelled = false;
        setStatus("starting");
        setErrorMsg("");

        // Defer to let the portal mount DialogContent and the region div
        const timer = setTimeout(() => {
            if (cancelled) return;
            try {
                const scanner = new Html5Qrcode(regionId, { verbose: false });
                scannerRef.current = scanner;

                const onSuccess = (text) => {
                    const parsed = decodeFirefighter(text);
                    if (!parsed) {
                        toast.error("QR: " + text.slice(0, 30));
                        return;
                    }
                    toast.success(`✓ ${parsed.first_name} ${parsed.last_name}`);
                    scanner
                        .stop()
                        .catch(() => {})
                        .finally(() => {
                            onScanned(parsed);
                            onOpenChange(false);
                        });
                };

                const config = { fps: 10, qrbox: { width: 240, height: 240 } };

                scanner
                    .start({ facingMode: "environment" }, config, onSuccess)
                    .then(() => {
                        if (!cancelled) setStatus("scanning");
                    })
                    .catch((err) => {
                        if (cancelled) return;
                        setStatus("error");
                        setErrorMsg(err?.message || String(err));
                    });
            } catch (e) {
                setStatus("error");
                setErrorMsg(e?.message || String(e));
            }
        }, 250);

        return () => {
            cancelled = true;
            clearTimeout(timer);
            const scanner = scannerRef.current;
            if (scanner) {
                try {
                    if (scanner.getState && scanner.getState() === 2) {
                        scanner.stop().catch(() => {});
                    }
                    scanner.clear();
                } catch {
                    // ignore
                }
            }
            scannerRef.current = null;
        };
    }, [open, onOpenChange, onScanned]);

    const handleFilePick = async (file) => {
        if (!file) return;
        try {
            // Stop camera scanner if running to free the region
            const cam = scannerRef.current;
            if (cam) {
                try {
                    if (cam.getState && cam.getState() === 2) await cam.stop();
                    cam.clear();
                } catch {
                    // ignore
                }
            }
            const fileScanner = new Html5Qrcode(regionId, { verbose: false });
            const result = await fileScanner.scanFile(file, false);
            const parsed = decodeFirefighter(result);
            if (!parsed) {
                toast.error("QR: " + result.slice(0, 30));
                return;
            }
            toast.success(`✓ ${parsed.first_name} ${parsed.last_name}`);
            onScanned(parsed);
            onOpenChange(false);
        } catch (e) {
            toast.error("QR scan file: " + (e?.message || e));
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                data-testid="dialog-qr-scanner"
                className="bg-[#0a0a0a] border-[#222] rounded-none text-white max-w-md"
            >
                <DialogHeader>
                    <DialogTitle className="font-heading text-xl font-black uppercase tracking-tight flex items-center gap-2">
                        <Camera className="h-5 w-5 text-[#007AFF]" strokeWidth={2.5} />
                        QR Scanner
                    </DialogTitle>
                </DialogHeader>

                <div className="py-2 space-y-3">
                    <div
                        id={regionId}
                        data-testid="qr-reader-region"
                        className="w-full aspect-square bg-[#060606] border border-[#1a1a1a] overflow-hidden"
                    />

                    <div className="text-[10px] tracking-[0.15em] uppercase text-center min-h-[16px]">
                        {status === "starting" && (
                            <span className="text-[#888]">START CAMERA...</span>
                        )}
                        {status === "scanning" && (
                            <span className="text-[#32D74B] flex items-center justify-center gap-1">
                                <Check className="h-3 w-3" /> SCAN...
                            </span>
                        )}
                        {status === "error" && (
                            <span className="text-[#FF5247]">{errorMsg || "CAMERA ERROR"}</span>
                        )}
                    </div>

                    <div className="border border-[#1a1a1a] bg-[#060606] p-3 flex gap-2 items-start">
                        <Info className="h-4 w-4 text-[#007AFF] shrink-0 mt-0.5" strokeWidth={2.5} />
                        <div className="text-[11px] text-[#aaa] leading-snug">
                            {t("qr_scan_hint")}
                        </div>
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        data-testid="input-qr-file"
                        onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleFilePick(f);
                            e.target.value = "";
                        }}
                    />
                    <Button
                        data-testid="btn-qr-file-pick"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full rounded-none bg-transparent border-[#333] text-white hover:bg-[#111] hover:text-white"
                    >
                        <FileImage className="h-4 w-4 mr-2" strokeWidth={2.5} />
                        {t("qr_scan_from_file")}
                    </Button>
                </div>
                <div className="flex justify-end">
                    <Button
                        data-testid="btn-qr-scanner-close"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="rounded-none bg-transparent border-[#333] text-white hover:bg-[#111] hover:text-white"
                    >
                        <X className="h-4 w-4 mr-2" />
                        {t("cancel")}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
