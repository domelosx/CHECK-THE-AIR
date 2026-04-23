import { useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Flame, QrCode, UserRoundPlus } from "lucide-react";
import { createRota, listFirefighters } from "@/lib/api";
import { useLang } from "@/lib/i18n";
import QrScannerDialog from "@/components/QrScannerDialog";

const CAPACITY_OPTIONS = ["6", "6.8", "9"];

const emptyFF = (position) => ({
    position,
    firefighter_id: "",
    first_name: "",
    last_name: "",
    rank: "",
    cylinder_capacity: "6.8",
    initial_pressure: "300",
});

export default function NewRotaDialog({ open, onOpenChange, onCreated }) {
    const { t } = useLang();
    const [firefighters, setFirefighters] = useState([]);
    const [przodownik, setPrzodownik] = useState(emptyFF("przodownik"));
    const [pomocnik, setPomocnik] = useState(emptyFF("pomocnik"));
    const [submitting, setSubmitting] = useState(false);
    const [scanFor, setScanFor] = useState(null); // "przodownik" | "pomocnik" | null

    useEffect(() => {
        if (open) {
            listFirefighters().then(setFirefighters).catch(() => {});
            setPrzodownik(emptyFF("przodownik"));
            setPomocnik(emptyFF("pomocnik"));
        }
    }, [open]);

    const handleSelectFF = (setter, ff, id) => {
        if (id === "manual") {
            setter({ ...ff, firefighter_id: "", first_name: "", last_name: "", rank: "" });
            return;
        }
        const found = firefighters.find((f) => f.id === id);
        if (found) {
            setter({
                ...ff,
                firefighter_id: found.id,
                first_name: found.first_name,
                last_name: found.last_name,
                rank: found.rank || "",
            });
        }
    };

    const validate = (ff, label) => {
        if (!ff.first_name.trim() || !ff.last_name.trim()) {
            toast.error(`${label}: ${t("first_name")} + ${t("last_name")}`);
            return false;
        }
        const cap = parseFloat(ff.cylinder_capacity);
        const pres = parseFloat(ff.initial_pressure);
        if (!Number.isFinite(cap) || cap <= 0) {
            toast.error(`${label}: ${t("cylinder_l")}`);
            return false;
        }
        // Accept manually-entered pressure up to 500 bar — some cylinders can
        // be topped up above the manufacturer-recommended 300/330 bar value.
        if (!Number.isFinite(pres) || pres < 50 || pres > 500) {
            toast.error(`${label}: ${t("initial_pressure")} (50-500 bar)`);
            return false;
        }
        return true;
    };

    const handleSubmit = async () => {
        if (!validate(przodownik, t("przodownik"))) return;
        if (!validate(pomocnik, t("pomocnik"))) return;
        setSubmitting(true);
        try {
            const payload = {
                firefighters: [
                    {
                        ...przodownik,
                        cylinder_capacity: parseFloat(przodownik.cylinder_capacity),
                        initial_pressure: parseFloat(przodownik.initial_pressure),
                        readings: [],
                    },
                    {
                        ...pomocnik,
                        cylinder_capacity: parseFloat(pomocnik.cylinder_capacity),
                        initial_pressure: parseFloat(pomocnik.initial_pressure),
                        readings: [],
                    },
                ],
            };
            await createRota(payload);
            onCreated();
        } catch (e) {
            toast.error(e?.response?.data?.detail || "Error");
        } finally {
            setSubmitting(false);
        }
    };

    const renderFFForm = (label, ff, setter, color, testPrefix) => (
        <div className="border border-[#1a1a1a] p-3 md:p-4 bg-[#060606]">
            <div className="flex items-center justify-between mb-3">
                <div className="text-xs tracking-[0.2em] uppercase font-bold" style={{ color }}>
                    {label}
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        data-testid={`btn-qr-scan-${testPrefix}`}
                        size="sm"
                        variant="outline"
                        onClick={() => setScanFor(testPrefix)}
                        className="h-7 px-2 rounded-none bg-transparent border-[#333] text-[#007AFF] hover:bg-[#001a33] hover:text-white"
                    >
                        <QrCode className="h-3.5 w-3.5 mr-1" strokeWidth={2.5} />
                        <span className="text-[10px] uppercase tracking-wider">QR</span>
                    </Button>
                    <UserRoundPlus className="h-4 w-4" style={{ color }} strokeWidth={2.5} />
                </div>
            </div>

            <div className="space-y-3">
                <div>
                    <Label className="text-[10px] tracking-[0.15em] uppercase text-[#888] font-bold">
                        {t("select_from_db")}
                    </Label>
                    <Select
                        value={ff.firefighter_id || "manual"}
                        onValueChange={(v) => handleSelectFF(setter, ff, v)}
                    >
                        <SelectTrigger
                            data-testid={`select-${testPrefix}`}
                            className="bg-[#111] border-[#222] rounded-none h-10 text-white mt-1"
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0a0a0a] border-[#222] text-white rounded-none">
                            <SelectItem value="manual" className="rounded-none">
                                {t("manual_entry")}
                            </SelectItem>
                            {firefighters.map((f) => (
                                <SelectItem key={f.id} value={f.id} className="rounded-none">
                                    {f.last_name} {f.first_name} {f.rank && `(${f.rank})`}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <Label className="text-[10px] tracking-[0.15em] uppercase text-[#888] font-bold">
                            {t("first_name")}
                        </Label>
                        <Input
                            data-testid={`input-${testPrefix}-first`}
                            value={ff.first_name}
                            onChange={(e) => setter({ ...ff, first_name: e.target.value })}
                            className="bg-[#111] border-[#222] rounded-none h-10 text-white mt-1"
                        />
                    </div>
                    <div>
                        <Label className="text-[10px] tracking-[0.15em] uppercase text-[#888] font-bold">
                            {t("last_name")}
                        </Label>
                        <Input
                            data-testid={`input-${testPrefix}-last`}
                            value={ff.last_name}
                            onChange={(e) => setter({ ...ff, last_name: e.target.value })}
                            className="bg-[#111] border-[#222] rounded-none h-10 text-white mt-1"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <Label className="text-[10px] tracking-[0.15em] uppercase text-[#888] font-bold">
                            {t("cylinder_l")}
                        </Label>
                        <Select
                            value={ff.cylinder_capacity}
                            onValueChange={(v) => setter({ ...ff, cylinder_capacity: v })}
                        >
                            <SelectTrigger
                                data-testid={`select-capacity-${testPrefix}`}
                                className="bg-[#111] border-[#222] rounded-none h-10 text-white font-mono-tac mt-1"
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#0a0a0a] border-[#222] text-white rounded-none">
                                {CAPACITY_OPTIONS.map((c) => (
                                    <SelectItem key={c} value={c} className="rounded-none">
                                        {c} L
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label className="text-[10px] tracking-[0.15em] uppercase text-[#888] font-bold">
                            {t("initial_pressure")}
                        </Label>
                        <Input
                            data-testid={`input-${testPrefix}-pressure`}
                            type="number"
                            value={ff.initial_pressure}
                            onChange={(e) =>
                                setter({ ...ff, initial_pressure: e.target.value })
                            }
                            className="bg-[#111] border-[#222] rounded-none h-10 text-white font-mono-tac mt-1"
                        />
                    </div>
                </div>
            </div>
        </div>
    );

    const handleScanned = (parsed) => {
        const setter = scanFor === "przodownik" ? setPrzodownik : setPomocnik;
        const current = scanFor === "przodownik" ? przodownik : pomocnik;
        setter({
            ...current,
            firefighter_id: parsed.id || "",
            first_name: parsed.first_name || "",
            last_name: parsed.last_name || "",
            rank: parsed.rank || "",
        });
        setScanFor(null);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                data-testid="dialog-new-rota"
                className="bg-[#0a0a0a] border-[#222] rounded-none text-white max-w-2xl max-h-[90vh] overflow-y-auto"
            >
                <DialogHeader>
                    <DialogTitle className="font-heading text-xl font-black uppercase tracking-tight flex items-center gap-2">
                        <Flame className="h-5 w-5 text-[#FF3B30]" strokeWidth={2.5} />
                        {t("new_rota")}
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                    {renderFFForm(t("przodownik"), przodownik, setPrzodownik, "#FF3B30", "przodownik")}
                    {renderFFForm(t("pomocnik"), pomocnik, setPomocnik, "#007AFF", "pomocnik")}
                </div>
                <DialogFooter>
                    <Button
                        data-testid="btn-cancel-rota"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="rounded-none bg-transparent border-[#333] text-white hover:bg-[#111] hover:text-white"
                    >
                        {t("cancel")}
                    </Button>
                    <Button
                        data-testid="btn-start-rota"
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="bg-[#FF3B30] hover:bg-[#FF5247] text-white rounded-none font-bold uppercase tracking-wider h-11 px-6"
                    >
                        <Flame className="h-4 w-4 mr-2" strokeWidth={2.5} />
                        {t("start_stoper")}
                    </Button>
                </DialogFooter>
            </DialogContent>
            <QrScannerDialog
                open={!!scanFor}
                onOpenChange={(v) => !v && setScanFor(null)}
                onScanned={handleScanned}
            />
        </Dialog>
    );
}
