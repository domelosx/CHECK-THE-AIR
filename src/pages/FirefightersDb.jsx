import { useEffect, useRef, useState } from "react";
import { Download, Plus, QrCode, Trash2, Upload, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { listFirefighters, createFirefighter, deleteFirefighter } from "@/lib/api";
import { useLang } from "@/lib/i18n";
import { downloadCsv, firefightersToCsv, parseFirefightersCsv } from "@/lib/csv";
import FirefighterQrDialog from "@/components/FirefighterQrDialog";

export default function FirefightersDb() {
    const { t } = useLang();
    const [firefighters, setFirefighters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({ first_name: "", last_name: "", rank: "" });
    const [toDelete, setToDelete] = useState(null);
    const [qrFor, setQrFor] = useState(null);
    const fileInputRef = useRef(null);

    const refresh = async () => {
        try {
            const data = await listFirefighters();
            setFirefighters(data);
        } catch (e) {
            toast.error("Error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refresh();
    }, []);

    const handleCreate = async () => {
        if (!form.first_name.trim() || !form.last_name.trim()) {
            toast.error("Required");
            return;
        }
        try {
            await createFirefighter(form);
            toast.success("+");
            setForm({ first_name: "", last_name: "", rank: "" });
            setOpen(false);
            refresh();
        } catch (e) {
            toast.error("Error");
        }
    };

    const handleDelete = async () => {
        if (!toDelete) return;
        try {
            await deleteFirefighter(toDelete.id);
            toast.success("✓");
            setToDelete(null);
            refresh();
        } catch (e) {
            toast.error("Error");
        }
    };

    const handleExportCsv = () => {
        const csv = firefightersToCsv(firefighters);
        const date = new Date().toISOString().slice(0, 10);
        downloadCsv(`check-the-air_firefighters_${date}.csv`, csv);
    };

    const handleImportCsv = async (file) => {
        try {
            const text = await file.text();
            const rows = parseFirefightersCsv(text);
            if (rows.length === 0) {
                toast.error("CSV: 0");
                return;
            }
            let imported = 0;
            for (const row of rows) {
                try {
                    await createFirefighter(row);
                    imported++;
                } catch (e) {
                    // skip errors silently
                }
            }
            toast.success(t("imported_count", imported));
            refresh();
        } catch (e) {
            toast.error("CSV error");
        }
    };

    return (
        <div data-testid="firefighters-root" className="max-w-[1400px] mx-auto">
            <div className="flex items-center justify-between mb-4 md:mb-6 gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                    <Users className="h-6 w-6 text-[#007AFF] shrink-0" strokeWidth={2.5} />
                    <div className="min-w-0">
                        <h1 className="font-heading text-2xl md:text-3xl font-black tracking-tight text-white">
                            {t("firefighters_db")}
                        </h1>
                        <div className="text-xs tracking-[0.15em] uppercase text-[#666]">
                            {t("ff_count", firefighters.length)}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,text/csv"
                        className="hidden"
                        data-testid="input-csv-file"
                        onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleImportCsv(f);
                            e.target.value = "";
                        }}
                    />
                    <Button
                        data-testid="btn-import-csv"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-none bg-transparent border-[#333] text-white hover:bg-[#111] hover:text-white h-11 px-4"
                    >
                        <Upload className="h-4 w-4 mr-2" strokeWidth={2.5} />
                        {t("import_csv")}
                    </Button>
                    <Button
                        data-testid="btn-export-csv"
                        variant="outline"
                        onClick={handleExportCsv}
                        disabled={firefighters.length === 0}
                        className="rounded-none bg-transparent border-[#333] text-white hover:bg-[#111] hover:text-white h-11 px-4 disabled:opacity-40"
                    >
                        <Download className="h-4 w-4 mr-2" strokeWidth={2.5} />
                        {t("export_csv")}
                    </Button>
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button
                                data-testid="btn-add-firefighter"
                                className="bg-[#007AFF] hover:bg-[#1a8cff] text-white rounded-none font-bold uppercase tracking-wider h-11 px-5 shrink-0"
                            >
                                <Plus className="h-5 w-5 mr-2" strokeWidth={3} />
                                {t("add_ff")}
                            </Button>
                        </DialogTrigger>
                        <DialogContent
                            data-testid="dialog-add-firefighter"
                            className="bg-[#0a0a0a] border-[#222] rounded-none text-white"
                        >
                            <DialogHeader>
                                <DialogTitle className="font-heading text-xl font-black uppercase tracking-tight">
                                    {t("new_ff")}
                                </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-2">
                                <div>
                                    <Label className="text-xs tracking-[0.1em] uppercase text-[#888] font-bold">
                                        {t("first_name")}
                                    </Label>
                                    <Input
                                        data-testid="input-firstname"
                                        value={form.first_name}
                                        onChange={(e) =>
                                            setForm({ ...form, first_name: e.target.value })
                                        }
                                        className="bg-[#111] border-[#222] rounded-none h-11 text-white focus-visible:ring-[#007AFF] mt-1"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs tracking-[0.1em] uppercase text-[#888] font-bold">
                                        {t("last_name")}
                                    </Label>
                                    <Input
                                        data-testid="input-lastname"
                                        value={form.last_name}
                                        onChange={(e) =>
                                            setForm({ ...form, last_name: e.target.value })
                                        }
                                        className="bg-[#111] border-[#222] rounded-none h-11 text-white focus-visible:ring-[#007AFF] mt-1"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs tracking-[0.1em] uppercase text-[#888] font-bold">
                                        {t("rank")}
                                    </Label>
                                    <Input
                                        data-testid="input-rank"
                                        value={form.rank}
                                        onChange={(e) => setForm({ ...form, rank: e.target.value })}
                                        className="bg-[#111] border-[#222] rounded-none h-11 text-white focus-visible:ring-[#007AFF] mt-1"
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button
                                    data-testid="btn-cancel-firefighter"
                                    variant="outline"
                                    onClick={() => setOpen(false)}
                                    className="rounded-none bg-transparent border-[#333] text-white hover:bg-[#111] hover:text-white"
                                >
                                    {t("cancel")}
                                </Button>
                                <Button
                                    data-testid="btn-save-firefighter"
                                    onClick={handleCreate}
                                    className="bg-[#007AFF] hover:bg-[#1a8cff] text-white rounded-none font-bold uppercase"
                                >
                                    {t("save")}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-20 text-[#666]">{t("loading")}</div>
            ) : firefighters.length === 0 ? (
                <div
                    data-testid="empty-firefighters"
                    className="border border-dashed border-[#222] py-16 text-center"
                >
                    <Users className="h-12 w-12 mx-auto mb-4 text-[#333]" strokeWidth={2} />
                    <div className="font-heading text-xl text-white font-bold">—</div>
                </div>
            ) : (
                <div className="border border-[#1a1a1a] bg-[#0a0a0a]">
                    <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-4 px-4 py-3 border-b border-[#1a1a1a] text-[10px] tracking-[0.15em] uppercase font-bold text-[#666]">
                        <div>{t("first_name")}</div>
                        <div>{t("last_name")}</div>
                        <div>{t("rank").replace(/\s*\(.*\)/, "")}</div>
                        <div></div>
                    </div>
                    {firefighters.map((ff) => (
                        <div
                            key={ff.id}
                            data-testid={`firefighter-row-${ff.id}`}
                            className="grid grid-cols-[1fr_1fr_1fr_auto] gap-4 px-4 py-3 border-b border-[#111] hover:bg-[#0f0f0f] transition-colors"
                        >
                            <div className="text-white font-medium">{ff.first_name}</div>
                            <div className="text-white font-medium">{ff.last_name}</div>
                            <div className="text-[#888] text-sm">{ff.rank || "—"}</div>
                            <div className="flex items-center gap-1 justify-end">
                                <Button
                                    data-testid={`btn-qr-ff-${ff.id}`}
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setQrFor(ff)}
                                    title="QR"
                                    className="text-[#007AFF] hover:bg-[#00254d] hover:text-white rounded-none h-8 w-8 p-0"
                                >
                                    <QrCode className="h-4 w-4" />
                                </Button>
                                <Button
                                    data-testid={`btn-delete-ff-${ff.id}`}
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setToDelete(ff)}
                                    className="text-[#FF3B30] hover:bg-[#2A0000] hover:text-[#FF5247] rounded-none h-8 w-8 p-0"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <FirefighterQrDialog
                firefighter={qrFor}
                open={!!qrFor}
                onOpenChange={(v) => !v && setQrFor(null)}
            />

            <AlertDialog open={!!toDelete} onOpenChange={(v) => !v && setToDelete(null)}>
                <AlertDialogContent
                    data-testid="dialog-delete-firefighter"
                    className="bg-[#0a0a0a] border-[#222] rounded-none text-white"
                >
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-heading uppercase">
                            {t("delete_ff_q")}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-[#888]">
                            {toDelete && `${toDelete.first_name} ${toDelete.last_name}`}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-none bg-transparent border-[#333] text-white hover:bg-[#111] hover:text-white">
                            {t("cancel")}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            data-testid="btn-confirm-delete-ff"
                            onClick={handleDelete}
                            className="bg-[#FF3B30] hover:bg-[#FF5247] text-white rounded-none"
                        >
                            {t("delete")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
