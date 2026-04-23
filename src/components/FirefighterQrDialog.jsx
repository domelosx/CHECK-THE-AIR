import { useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";
import { toast } from "sonner";
import { encodeFirefighter, generateQrDataUrl } from "@/lib/qr";
import { useLang } from "@/lib/i18n";

export default function FirefighterQrDialog({ firefighter, open, onOpenChange }) {
    const { t } = useLang();
    const [dataUrl, setDataUrl] = useState("");

    useEffect(() => {
        if (!open || !firefighter) return;
        const text = encodeFirefighter(firefighter);
        generateQrDataUrl(text, 512).then(setDataUrl).catch(() => toast.error("QR error"));
    }, [open, firefighter]);

    if (!firefighter) return null;

    const handleDownload = () => {
        if (!dataUrl) return;
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `qr-${firefighter.last_name}-${firefighter.first_name}.png`.replace(/\s+/g, "_");
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const handlePrint = () => {
        if (!dataUrl) return;
        const html = `<!doctype html><html><head><meta charset="utf-8"><title>QR — ${firefighter.first_name} ${firefighter.last_name}</title>
<style>
  @page { size: 70mm 70mm; margin: 5mm; }
  body { font-family: Arial, sans-serif; display:flex; flex-direction:column; align-items:center; justify-content:center; margin:0; padding:6mm; }
  .name { font-size: 14px; font-weight: bold; margin-top: 6px; text-align: center; }
  .rank { font-size: 10px; color: #666; }
  .brand { font-size: 8px; color: #999; margin-top: 4px; letter-spacing: 2px; }
  img { width: 50mm; height: 50mm; }
</style></head><body>
  <img src="${dataUrl}" alt="QR"/>
  <div class="name">${firefighter.first_name} ${firefighter.last_name}</div>
  ${firefighter.rank ? `<div class="rank">${firefighter.rank}</div>` : ""}
  <div class="brand">CHECK THE AIR</div>
<script>window.onload=()=>window.print();</script>
</body></html>`;
        const w = window.open("", "_blank");
        if (w) {
            w.document.write(html);
            w.document.close();
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                data-testid="dialog-qr-firefighter"
                className="bg-[#0a0a0a] border-[#222] rounded-none text-white max-w-sm"
            >
                <DialogHeader>
                    <DialogTitle className="font-heading text-xl font-black uppercase tracking-tight">
                        {firefighter.first_name} {firefighter.last_name}
                    </DialogTitle>
                    {firefighter.rank && (
                        <div className="text-[11px] text-[#888] uppercase tracking-[0.15em]">
                            {firefighter.rank}
                        </div>
                    )}
                </DialogHeader>
                <div className="flex flex-col items-center py-3">
                    {dataUrl ? (
                        <img
                            src={dataUrl}
                            alt="QR"
                            data-testid="qr-image"
                            className="w-64 h-64 bg-white p-2"
                        />
                    ) : (
                        <div className="w-64 h-64 flex items-center justify-center bg-[#111] text-[#666]">
                            {t("loading")}
                        </div>
                    )}
                    <div className="text-[10px] text-[#666] tracking-[0.2em] uppercase mt-3 font-bold">
                        Check the air · ID: {firefighter.id.slice(0, 8)}
                    </div>
                </div>
                <div className="flex gap-2 pt-2">
                    <Button
                        data-testid="btn-qr-download"
                        variant="outline"
                        onClick={handleDownload}
                        className="flex-1 rounded-none bg-transparent border-[#333] text-white hover:bg-[#111] hover:text-white"
                    >
                        <Download className="h-4 w-4 mr-2" strokeWidth={2.5} />
                        PNG
                    </Button>
                    <Button
                        data-testid="btn-qr-print"
                        onClick={handlePrint}
                        className="flex-1 bg-[#007AFF] hover:bg-[#1a8cff] text-white rounded-none font-bold uppercase tracking-wider"
                    >
                        <Printer className="h-4 w-4 mr-2" strokeWidth={2.5} />
                        {t("print")}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
