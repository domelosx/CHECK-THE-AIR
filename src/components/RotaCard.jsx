import { useEffect, useState, useCallback, useRef } from "react";
import {
    AlertTriangle,
    CheckCircle2,
    Gauge,
    Power,
    Printer,
    ShieldAlert,
    Timer,
    TrendingDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { addReading, finishRota } from "@/lib/api";
import {
    currentEstimatedLiters,
    currentEstimatedPressure,
    elapsedSecondsSince,
    formatTime,
    lastPressure,
    projectedRemainingSeconds,
    projectedSecondsTo60Bar,
    realConsumptionLPerMin,
} from "@/lib/calculations";
import { useSettings } from "@/hooks/useSettings";
import { useLang } from "@/lib/i18n";
import { playReminderChime, startAlarmLoop, stopAlarmLoop } from "@/lib/sound";
import { printRotaReport } from "@/lib/print";

function FirefighterPanel({ rota, ff, elapsed, onReading, settings, t }) {
    const [pressure, setPressure] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const chimeFiredRef = useRef(false);

    const measuredPressure = lastPressure(ff);
    const estimatedPressure = currentEstimatedPressure(ff, elapsed);
    const liters = currentEstimatedLiters(ff, elapsed);
    const remaining = projectedRemainingSeconds(ff, elapsed);
    const readings = ff.readings || [];
    const lastElapsed = readings.length > 0 ? readings[readings.length - 1].elapsed_seconds : 0;
    const nextDue = lastElapsed + settings.readingIntervalSeconds;
    const secondsUntilNext = nextDue - elapsed;
    const readingDue = secondsUntilNext <= 0;

    // Live ticking: is regression producing a real-time decreasing estimate?
    const isLiveEstimate =
        readings.length >= 1 && elapsed > lastElapsed && estimatedPressure < measuredPressure;

    const critical =
        estimatedPressure < settings.pressureWarningBar || remaining < settings.timeWarningSeconds;
    const advisory = !critical && estimatedPressure <= settings.pressureAdvisoryBar;

    const realConsumption = realConsumptionLPerMin(ff);
    const secondsTo60Bar = projectedSecondsTo60Bar(ff, elapsed);

    // Play reminder chime exactly once each time a new reading becomes due
    useEffect(() => {
        if (!settings.soundEnabled) {
            chimeFiredRef.current = false;
            return;
        }
        if (readingDue && !chimeFiredRef.current) {
            playReminderChime();
            chimeFiredRef.current = true;
        } else if (!readingDue) {
            chimeFiredRef.current = false;
        }
    }, [readingDue, settings.soundEnabled]);

    const handleSubmit = async () => {
        const val = parseFloat(pressure);
        if (!Number.isFinite(val) || val <= 0 || val > 500) {
            toast.error("Invalid pressure (1-500 bar)");
            return;
        }
        const lastP = lastPressure(ff);
        if (val > lastP) {
            toast.error(`Pressure cannot increase (prev: ${lastP} bar)`);
            return;
        }
        setSubmitting(true);
        try {
            await addReading(rota.id, {
                position: ff.position,
                pressure: val,
                elapsed_seconds: elapsed,
            });
            toast.success(`${val} bar`);
            setPressure("");
            onReading();
        } catch (e) {
            toast.error("Error");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div
            data-testid={`ff-panel-${rota.id}-${ff.position}`}
            className={`border p-3 md:p-4 ${
                critical
                    ? "border-[#FF3B30] critical-alert"
                    : advisory
                      ? "border-[#FFCC00] bg-[#1a1500]"
                      : "border-[#1a1a1a] bg-[#0a0a0a]"
            }`}
        >
            <div className="flex items-center justify-between mb-3">
                <div>
                    <div
                        className={`text-[10px] tracking-[0.2em] uppercase font-bold ${
                            ff.position === "przodownik" ? "text-[#FF3B30]" : "text-[#007AFF]"
                        }`}
                    >
                        {ff.position === "przodownik" ? t("przodownik") : t("pomocnik")}
                    </div>
                    <div
                        className={`font-heading text-lg font-bold ${
                            critical ? "text-[#FF5247]" : "text-white"
                        }`}
                    >
                        {ff.first_name} {ff.last_name}
                    </div>
                    {ff.rank && <div className="text-[10px] text-[#666] uppercase">{ff.rank}</div>}
                </div>
                {critical && (
                    <AlertTriangle
                        className="h-6 w-6 text-[#FF5247] warning-blink"
                        strokeWidth={2.5}
                    />
                )}
                {advisory && (
                    <ShieldAlert
                        className="h-6 w-6 text-[#FFCC00]"
                        strokeWidth={2.5}
                    />
                )}
            </div>

            {advisory && (
                <div
                    data-testid={`advisory-175-${rota.id}-${ff.position}`}
                    className="border border-[#FFCC00] bg-[#2a2000] px-3 py-2 mb-3 flex items-center gap-2"
                >
                    <ShieldAlert className="h-5 w-5 text-[#FFCC00] shrink-0" strokeWidth={2.5} />
                    <div>
                        <div className="text-[11px] tracking-[0.15em] uppercase text-[#FFCC00] font-black">
                            {t("return_recommended")}
                        </div>
                        <div className="text-[10px] text-[#ccaa00] mt-0.5">
                            {t("return_recommended_desc")}
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-[#060606] border border-[#1a1a1a] p-2">
                    <div className="text-[9px] tracking-[0.15em] uppercase text-[#666] font-bold flex items-center gap-1">
                        {t("pressure")}
                        {isLiveEstimate && (
                            <span
                                className="inline-block w-1.5 h-1.5 bg-[#32D74B] rounded-full warning-blink"
                                title="live"
                            />
                        )}
                    </div>
                    <div
                        data-testid={`pressure-${rota.id}-${ff.position}`}
                        className={`font-mono-tac text-2xl font-black tabular-nums ${
                            estimatedPressure < settings.pressureWarningBar
                                ? "text-[#FF5247]"
                                : estimatedPressure <= settings.pressureAdvisoryBar
                                  ? "text-[#FFCC00]"
                                  : "text-white"
                        }`}
                    >
                        {Math.round(estimatedPressure)}
                    </div>
                    <div className="text-[9px] text-[#666] uppercase">{t("bar")}</div>
                </div>
                <div className="bg-[#060606] border border-[#1a1a1a] p-2">
                    <div className="text-[9px] tracking-[0.15em] uppercase text-[#666] font-bold flex items-center gap-1">
                        {t("air")}
                        {isLiveEstimate && (
                            <span className="inline-block w-1.5 h-1.5 bg-[#32D74B] rounded-full warning-blink" />
                        )}
                    </div>
                    <div
                        data-testid={`liters-${rota.id}-${ff.position}`}
                        className="font-mono-tac text-2xl font-black text-white tabular-nums"
                    >
                        {Math.round(liters)}
                    </div>
                    <div className="text-[9px] text-[#666] uppercase">{t("liters")}</div>
                </div>
                <div className="bg-[#060606] border border-[#1a1a1a] p-2">
                    <div className="text-[9px] tracking-[0.15em] uppercase text-[#666] font-bold">
                        {t("remaining")}
                    </div>
                    <div
                        data-testid={`remaining-${rota.id}-${ff.position}`}
                        className={`font-mono-tac text-2xl font-black tabular-nums ${
                            remaining < settings.timeWarningSeconds
                                ? "text-[#FF5247]"
                                : "text-[#32D74B]"
                        }`}
                    >
                        {formatTime(remaining)}
                    </div>
                    <div className="text-[9px] text-[#666] uppercase">{t("min_sec")}</div>
                </div>
            </div>

            {realConsumption !== null && (
                <div
                    data-testid={`real-consumption-${rota.id}-${ff.position}`}
                    className="grid grid-cols-2 gap-2 mb-3"
                >
                    <div className="bg-[#060606] border border-[#007AFF]/40 p-2">
                        <div className="flex items-center gap-1 text-[9px] tracking-[0.15em] uppercase text-[#007AFF] font-bold">
                            <TrendingDown className="h-3 w-3" strokeWidth={2.5} />
                            {t("real_consumption")}
                        </div>
                        <div className="font-mono-tac text-xl font-black text-[#007AFF] tabular-nums">
                            {realConsumption.toFixed(0)}
                        </div>
                        <div className="text-[9px] text-[#666] uppercase">{t("l_per_min")}</div>
                    </div>
                    <div className="bg-[#060606] border border-[#007AFF]/40 p-2">
                        <div className="flex items-center gap-1 text-[9px] tracking-[0.15em] uppercase text-[#007AFF] font-bold">
                            <Timer className="h-3 w-3" strokeWidth={2.5} />
                            {t("to_60_bar")}
                        </div>
                        <div
                            className={`font-mono-tac text-xl font-black tabular-nums ${
                                secondsTo60Bar !== null && secondsTo60Bar < 5 * 60
                                    ? "text-[#FF5247]"
                                    : "text-[#007AFF]"
                            }`}
                        >
                            {secondsTo60Bar === null ? "—" : formatTime(secondsTo60Bar)}
                        </div>
                        <div className="text-[9px] text-[#666] uppercase">{t("min_sec")}</div>
                    </div>
                </div>
            )}

            <div
                className={`border p-2 ${
                    readingDue
                        ? "border-[#FFCC00] bg-[#1a1500] warning-blink"
                        : "border-[#1a1a1a] bg-[#060606]"
                }`}
            >
                <div className="flex items-center justify-between mb-2">
                    <div className="text-[10px] tracking-[0.15em] uppercase font-bold">
                        {readingDue ? (
                            <span className="text-[#FFCC00]">{t("reading_required")}</span>
                        ) : (
                            <span className="text-[#666]">
                                {t("next_reading_in")}{" "}
                                {formatTime(Math.max(0, secondsUntilNext))}
                            </span>
                        )}
                    </div>
                    <div className="text-[10px] text-[#666] font-mono-tac">
                        {t("readings_count", ff.readings.length)}
                    </div>
                </div>
                <div className="flex gap-2">
                    <Input
                        data-testid={`input-pressure-${rota.id}-${ff.position}`}
                        type="number"
                        placeholder={`< ${measuredPressure} ${t("bar")}`}
                        value={pressure}
                        onChange={(e) => setPressure(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                        className="bg-[#111] border-[#2a2a2a] rounded-none h-11 text-white font-mono-tac text-lg focus-visible:ring-[#007AFF]"
                    />
                    <Button
                        data-testid={`btn-submit-reading-${rota.id}-${ff.position}`}
                        onClick={handleSubmit}
                        disabled={submitting || !pressure}
                        className="bg-[#007AFF] hover:bg-[#1a8cff] text-white rounded-none font-bold uppercase tracking-wider h-11 px-4 active:scale-[0.98] transition-transform"
                    >
                        <Gauge className="h-4 w-4 mr-1.5" strokeWidth={2.5} />
                        {t("save")}
                    </Button>
                </div>
            </div>

            {ff.readings.length > 0 && (
                <div className="mt-3 grid grid-cols-6 gap-1">
                    {ff.readings.map((r, idx) => (
                        <div
                            key={idx}
                            data-testid={`reading-box-${rota.id}-${ff.position}-${idx}`}
                            className={`border p-1.5 text-center ${
                                r.pressure < settings.pressureWarningBar
                                    ? "border-[#FF3B30] bg-[#2A0000]"
                                    : r.pressure <= settings.pressureAdvisoryBar
                                      ? "border-[#FFCC00] bg-[#1a1500]"
                                      : "border-[#1a1a1a] bg-[#060606]"
                            }`}
                        >
                            <div className="text-[8px] text-[#666] font-mono-tac">
                                {formatTime(r.elapsed_seconds)}
                            </div>
                            <div
                                className={`font-mono-tac text-sm font-bold tabular-nums ${
                                    r.pressure < settings.pressureWarningBar
                                        ? "text-[#FF5247]"
                                        : r.pressure <= settings.pressureAdvisoryBar
                                          ? "text-[#FFCC00]"
                                          : "text-white"
                                }`}
                            >
                                {r.pressure}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function RotaCard({ rota, onChange }) {
    const { t } = useLang();
    const [now, setNow] = useState(Date.now());
    const [finishOpen, setFinishOpen] = useState(false);
    const settings = useSettings();
    const alarmActiveRef = useRef(false);

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    const elapsed = elapsedSecondsSince(rota.started_at, now);

    const handleFinish = useCallback(async () => {
        try {
            await finishRota(rota.id);
            toast.success(`${t("stoper")} ${rota.stoper_number} — ${t("finish")}`);
            setFinishOpen(false);
            onChange();
        } catch (e) {
            toast.error("Error");
        }
    }, [rota.id, rota.stoper_number, onChange, t]);

    const anyCritical = rota.firefighters.some((ff) => {
        const p = currentEstimatedPressure(ff, elapsed);
        const r = projectedRemainingSeconds(ff, elapsed);
        return p < settings.pressureWarningBar || r < settings.timeWarningSeconds;
    });

    useEffect(() => {
        if (!settings.soundEnabled) {
            if (alarmActiveRef.current) {
                stopAlarmLoop();
                alarmActiveRef.current = false;
            }
            return;
        }
        if (anyCritical && !alarmActiveRef.current) {
            startAlarmLoop();
            alarmActiveRef.current = true;
        } else if (!anyCritical && alarmActiveRef.current) {
            stopAlarmLoop();
            alarmActiveRef.current = false;
        }
    }, [anyCritical, settings.soundEnabled]);

    useEffect(() => {
        return () => {
            if (alarmActiveRef.current) {
                stopAlarmLoop();
                alarmActiveRef.current = false;
            }
        };
    }, []);

    return (
        <div
            data-testid={`rota-card-${rota.id}`}
            className={`border ${anyCritical ? "border-[#FF3B30]" : "border-[#222]"} bg-[#080808]`}
        >
            <div
                className={`flex items-center justify-between px-4 py-3 border-b ${
                    anyCritical ? "border-[#FF3B30] bg-[#1a0505]" : "border-[#1a1a1a] bg-[#0a0a0a]"
                }`}
            >
                <div className="flex items-center gap-3">
                    <div
                        className={`flex h-10 w-10 items-center justify-center font-heading font-black ${
                            anyCritical ? "bg-[#FF3B30]" : "bg-[#007AFF]"
                        } text-white`}
                    >
                        {rota.stoper_number}
                    </div>
                    <div>
                        <div className="font-heading text-xl font-black tracking-tight text-white leading-none">
                            {t("stoper")} {rota.stoper_number}
                        </div>
                        <div className="text-[10px] tracking-[0.15em] uppercase text-[#666] mt-1">
                            {t("started_at")}{" "}
                            {new Date(rota.started_at).toLocaleTimeString("pl-PL", {
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                            })}
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="flex items-center justify-end gap-1.5 text-[10px] tracking-[0.15em] uppercase text-[#666] font-bold">
                        <Timer className="h-3 w-3" strokeWidth={2.5} />
                        {t("time_in_action")}
                    </div>
                    <div
                        data-testid={`rota-timer-${rota.id}`}
                        className={`font-mono-tac text-3xl md:text-4xl font-black tabular-nums ${
                            anyCritical ? "text-[#FF5247]" : "text-white"
                        }`}
                    >
                        {formatTime(elapsed)}
                    </div>
                </div>
            </div>

            <div className="p-3 md:p-4 space-y-3">
                {rota.firefighters.map((ff) => (
                    <FirefighterPanel
                        key={ff.position}
                        rota={rota}
                        ff={ff}
                        elapsed={elapsed}
                        onReading={onChange}
                        settings={settings}
                        t={t}
                    />
                ))}
            </div>

            <div className="flex border-t border-[#1a1a1a]">
                <Button
                    data-testid={`btn-print-rota-${rota.id}`}
                    onClick={() => printRotaReport(rota)}
                    variant="ghost"
                    className="bg-transparent hover:bg-[#111] text-[#888] hover:text-white rounded-none font-bold uppercase tracking-wider h-12 px-6 border-r border-[#1a1a1a]"
                >
                    <Printer className="h-4 w-4 mr-2" strokeWidth={2.5} />
                    {t("print")}
                </Button>
                <Button
                    data-testid={`btn-finish-rota-${rota.id}`}
                    onClick={() => setFinishOpen(true)}
                    className="flex-1 bg-[#FF3B30] hover:bg-[#FF5247] text-white rounded-none font-bold uppercase tracking-wider h-12 active:scale-[0.99] transition-transform"
                >
                    <Power className="h-4 w-4 mr-2" strokeWidth={2.5} />
                    {t("finish_op")}
                </Button>
            </div>

            <AlertDialog open={finishOpen} onOpenChange={setFinishOpen}>
                <AlertDialogContent className="bg-[#0a0a0a] border-[#222] rounded-none text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-heading uppercase flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-[#32D74B]" />
                            {t("finish_q")} {t("stoper")} {rota.stoper_number}?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-[#888]">
                            {t("finish_desc")}{" "}
                            <span className="font-mono-tac text-white">{formatTime(elapsed)}</span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-none bg-transparent border-[#333] text-white hover:bg-[#111] hover:text-white">
                            {t("cancel")}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            data-testid={`btn-confirm-finish-${rota.id}`}
                            onClick={handleFinish}
                            className="bg-[#FF3B30] hover:bg-[#FF5247] text-white rounded-none"
                        >
                            {t("finish")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
