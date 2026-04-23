import { useEffect, useState } from "react";
import {
    History as HistoryIcon,
    ChevronDown,
    ChevronUp,
    Printer,
    FileDown,
    Trash2,
    TrendingUp,
    Clock,
    Gauge,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { deleteRota, listRotas } from "@/lib/api";
import { formatTime, calcLiters } from "@/lib/calculations";
import { printRotaReport } from "@/lib/print";
import { exportRotaToPdf, exportHistoryToPdf } from "@/lib/pdf";
import { useLang } from "@/lib/i18n";

function RotaHistoryCard({ rota, t, onDelete }) {
    const [open, setOpen] = useState(false);
    const duration =
        rota.finished_at && rota.started_at
            ? Math.floor(
                  (new Date(rota.finished_at).getTime() - new Date(rota.started_at).getTime()) /
                      1000,
              )
            : 0;
    const startDate = new Date(rota.started_at);

    return (
        <div data-testid={`history-rota-${rota.id}`} className="border border-[#1a1a1a] bg-[#0a0a0a]">
            <button
                onClick={() => setOpen(!open)}
                className="w-full grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] gap-3 items-center px-4 py-3 text-left hover:bg-[#111] transition-colors"
            >
                <div className="font-heading text-lg font-black text-[#FF3B30]">
                    {t("stoper")} {rota.stoper_number}
                </div>
                <div>
                    <div className="text-sm text-white">
                        {rota.firefighters.map((f) => `${f.first_name} ${f.last_name}`).join(" + ")}
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.1em] text-[#666] mt-0.5">
                        {startDate.toLocaleString()}
                    </div>
                </div>
                <div className="font-mono-tac text-xl text-white tabular-nums">
                    {formatTime(duration)}
                </div>
                <span
                    data-testid={`btn-pdf-history-${rota.id}`}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                        e.stopPropagation();
                        exportRotaToPdf(rota);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.stopPropagation();
                            exportRotaToPdf(rota);
                        }
                    }}
                    title={t("export_pdf")}
                    className="inline-flex items-center justify-center h-8 w-8 text-[#007AFF] hover:text-white hover:bg-[#007AFF]/20 cursor-pointer transition-colors"
                >
                    <FileDown className="h-4 w-4" strokeWidth={2} />
                </span>
                <span
                    data-testid={`btn-print-history-${rota.id}`}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                        e.stopPropagation();
                        printRotaReport(rota);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.stopPropagation();
                            printRotaReport(rota);
                        }
                    }}
                    title={t("print")}
                    className="inline-flex items-center justify-center h-8 w-8 text-[#888] hover:text-white hover:bg-[#1a1a1a] cursor-pointer transition-colors"
                >
                    <Printer className="h-4 w-4" strokeWidth={2} />
                </span>
                <span
                    data-testid={`btn-delete-history-${rota.id}`}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(rota);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.stopPropagation();
                            onDelete(rota);
                        }
                    }}
                    title={t("delete")}
                    className="inline-flex items-center justify-center h-8 w-8 text-[#FF3B30] hover:text-[#FF5247] hover:bg-[#2A0000] cursor-pointer transition-colors"
                >
                    <Trash2 className="h-4 w-4" strokeWidth={2} />
                </span>
                {open ? (
                    <ChevronUp className="h-5 w-5 text-[#666]" />
                ) : (
                    <ChevronDown className="h-5 w-5 text-[#666]" />
                )}
            </button>
            {open && (
                <div className="border-t border-[#1a1a1a] p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {rota.firefighters.map((ff) => (
                        <div key={ff.position} className="border border-[#1a1a1a] p-3 bg-[#060606]">
                            <div className="text-[10px] uppercase tracking-[0.15em] text-[#888] font-bold">
                                {ff.position === "przodownik" ? t("przodownik") : t("pomocnik")}
                            </div>
                            <div className="text-white font-bold">
                                {ff.first_name} {ff.last_name}
                            </div>
                            <div className="text-xs text-[#666] mt-1">
                                {t("cylinder")}: {ff.cylinder_capacity}L · {t("start")}:{" "}
                                <span className="font-mono-tac">{ff.initial_pressure}</span>{" "}
                                {t("bar")}
                            </div>
                            <div className="mt-3">
                                <div className="text-[10px] uppercase tracking-[0.15em] text-[#888] font-bold mb-2">
                                    {t("readings")}
                                </div>
                                <div className="space-y-1">
                                    {ff.readings.length === 0 && (
                                        <div className="text-xs text-[#555]">
                                            {t("no_readings")}
                                        </div>
                                    )}
                                    {ff.readings.map((r, idx) => (
                                        <div
                                            key={idx}
                                            className="grid grid-cols-3 gap-2 text-xs font-mono-tac tabular-nums"
                                        >
                                            <div className="text-[#666]">
                                                {formatTime(r.elapsed_seconds)}
                                            </div>
                                            <div className="text-white">
                                                {r.pressure} {t("bar")}
                                            </div>
                                            <div className="text-[#888]">
                                                {Math.round(
                                                    calcLiters(ff.cylinder_capacity, r.pressure),
                                                )}{" "}
                                                L
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function HistoryPage() {
    const { t } = useLang();
    const [rotas, setRotas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toDelete, setToDelete] = useState(null);

    const refresh = () => {
        setLoading(true);
        listRotas("finished")
            .then(setRotas)
            .catch(() => toast.error("Error"))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        refresh();
    }, []);

    const handleDelete = async () => {
        if (!toDelete) return;
        try {
            await deleteRota(toDelete.id);
            toast.success(`✓ ${t("stoper")} ${toDelete.stoper_number}`);
            setToDelete(null);
            refresh();
        } catch (e) {
            toast.error("Error");
        }
    };

    const stats = (() => {
        if (rotas.length === 0)
            return { avgDuration: 0, maxDuration: 0, totalReadings: 0 };
        let totalDuration = 0;
        let maxDuration = 0;
        let totalReadings = 0;
        for (const r of rotas) {
            const d =
                r.finished_at && r.started_at
                    ? Math.floor(
                          (new Date(r.finished_at).getTime() -
                              new Date(r.started_at).getTime()) /
                              1000,
                      )
                    : 0;
            totalDuration += d;
            if (d > maxDuration) maxDuration = d;
            for (const ff of r.firefighters) totalReadings += ff.readings.length;
        }
        return {
            avgDuration: Math.floor(totalDuration / rotas.length),
            maxDuration,
            totalReadings,
        };
    })();

    return (
        <div data-testid="history-root" className="max-w-[1400px] mx-auto">
            <div className="flex items-center justify-between mb-4 md:mb-6 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <HistoryIcon className="h-6 w-6 text-[#888] shrink-0" strokeWidth={2.5} />
                    <div className="min-w-0">
                        <h1 className="font-heading text-2xl md:text-3xl font-black tracking-tight text-white">
                            {t("history_title")}
                        </h1>
                        <div className="text-xs tracking-[0.15em] uppercase text-[#666]">
                            {t("history_count", rotas.length)}
                        </div>
                    </div>
                </div>
                {rotas.length > 0 && (
                    <Button
                        data-testid="btn-export-all-pdf"
                        onClick={() => exportHistoryToPdf(rotas)}
                        className="bg-[#007AFF] hover:bg-[#1a8cff] text-white rounded-none font-bold uppercase tracking-wider h-11 px-5 shrink-0"
                    >
                        <FileDown className="h-5 w-5 mr-2" strokeWidth={2.5} />
                        {t("export_all_pdf")}
                    </Button>
                )}
            </div>

            {rotas.length > 0 && (
                <div
                    data-testid="history-stats"
                    className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4"
                >
                    <div className="border border-[#1a1a1a] bg-[#0a0a0a] p-3">
                        <div className="flex items-center gap-1.5 text-[9px] tracking-[0.15em] uppercase text-[#666] font-bold">
                            <TrendingUp className="h-3 w-3" strokeWidth={2.5} />
                            {t("stat_all")}
                        </div>
                        <div className="font-mono-tac text-2xl font-black text-white tabular-nums mt-1">
                            {rotas.length}
                        </div>
                    </div>
                    <div className="border border-[#1a1a1a] bg-[#0a0a0a] p-3">
                        <div className="flex items-center gap-1.5 text-[9px] tracking-[0.15em] uppercase text-[#666] font-bold">
                            <Clock className="h-3 w-3" strokeWidth={2.5} />
                            {t("stat_avg")}
                        </div>
                        <div className="font-mono-tac text-2xl font-black text-white tabular-nums mt-1">
                            {formatTime(stats.avgDuration)}
                        </div>
                    </div>
                    <div className="border border-[#1a1a1a] bg-[#0a0a0a] p-3">
                        <div className="flex items-center gap-1.5 text-[9px] tracking-[0.15em] uppercase text-[#666] font-bold">
                            <Clock className="h-3 w-3" strokeWidth={2.5} />
                            {t("stat_max")}
                        </div>
                        <div className="font-mono-tac text-2xl font-black text-[#FF5247] tabular-nums mt-1">
                            {formatTime(stats.maxDuration)}
                        </div>
                    </div>
                    <div className="border border-[#1a1a1a] bg-[#0a0a0a] p-3">
                        <div className="flex items-center gap-1.5 text-[9px] tracking-[0.15em] uppercase text-[#666] font-bold">
                            <Gauge className="h-3 w-3" strokeWidth={2.5} />
                            {t("stat_readings")}
                        </div>
                        <div className="font-mono-tac text-2xl font-black text-[#007AFF] tabular-nums mt-1">
                            {stats.totalReadings}
                        </div>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="text-center py-20 text-[#666]">{t("loading")}</div>
            ) : rotas.length === 0 ? (
                <div
                    data-testid="empty-history"
                    className="border border-dashed border-[#222] py-16 text-center"
                >
                    <HistoryIcon className="h-12 w-12 mx-auto mb-4 text-[#333]" strokeWidth={2} />
                    <div className="font-heading text-xl text-white font-bold mb-2">
                        {t("no_history")}
                    </div>
                    <div className="text-sm text-[#666]">{t("no_history_desc")}</div>
                </div>
            ) : (
                <div className="space-y-2">
                    {rotas.map((r) => (
                        <RotaHistoryCard key={r.id} rota={r} t={t} onDelete={setToDelete} />
                    ))}
                </div>
            )}

            <AlertDialog open={!!toDelete} onOpenChange={(v) => !v && setToDelete(null)}>
                <AlertDialogContent
                    data-testid="dialog-delete-rota"
                    className="bg-[#0a0a0a] border-[#222] rounded-none text-white"
                >
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-heading uppercase">
                            {t("delete")} {t("stoper")} {toDelete?.stoper_number}?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-[#888]">
                            {toDelete &&
                                toDelete.firefighters
                                    .map((f) => `${f.first_name} ${f.last_name}`)
                                    .join(" + ")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-none bg-transparent border-[#333] text-white hover:bg-[#111] hover:text-white">
                            {t("cancel")}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            data-testid="btn-confirm-delete-rota"
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
