import { useState, useEffect } from "react";
import { Settings as SettingsIcon, Volume2, VolumeX, RotateCcw, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from "@/lib/settings";
import { playAlarm, unlockAudio } from "@/lib/sound";
import { useLang } from "@/lib/i18n";

export default function SettingsDialog() {
    const { t } = useLang();
    const [open, setOpen] = useState(false);
    const [settings, setSettings] = useState(loadSettings());

    useEffect(() => {
        if (open) setSettings(loadSettings());
    }, [open]);

    const handleSave = () => {
        const pressure = parseFloat(settings.pressureWarningBar);
        const advisory = parseFloat(settings.pressureAdvisoryBar);
        const minutes = parseFloat(settings.timeWarningSeconds) / 60;
        if (!Number.isFinite(pressure) || pressure < 10 || pressure > 200) {
            toast.error("10-200 bar");
            return;
        }
        if (!Number.isFinite(advisory) || advisory < pressure || advisory > 300) {
            toast.error(`> ${pressure} bar`);
            return;
        }
        if (!Number.isFinite(minutes) || minutes < 1 || minutes > 60) {
            toast.error("1-60 min");
            return;
        }
        saveSettings({
            ...settings,
            pressureWarningBar: pressure,
            pressureAdvisoryBar: advisory,
            timeWarningSeconds: Math.round(minutes * 60),
        });
        toast.success("✓");
        setOpen(false);
    };

    const handleReset = () => setSettings({ ...DEFAULT_SETTINGS });

    const handleTestSound = () => {
        unlockAudio();
        playAlarm();
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    data-testid="btn-open-settings"
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0 text-[#888] hover:text-white hover:bg-[#1a1a1a] rounded-none"
                >
                    <SettingsIcon className="h-5 w-5" strokeWidth={2} />
                </Button>
            </DialogTrigger>
            <DialogContent
                data-testid="dialog-settings"
                className="bg-[#0a0a0a] border-[#222] rounded-none text-white max-w-md max-h-[90vh] overflow-y-auto"
            >
                <DialogHeader>
                    <DialogTitle className="font-heading text-xl font-black uppercase tracking-tight flex items-center gap-2">
                        <SettingsIcon className="h-5 w-5 text-[#007AFF]" strokeWidth={2.5} />
                        {t("settings_title")}
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-5 py-3">
                    <div>
                        <Label className="text-[10px] tracking-[0.15em] uppercase text-[#FFCC00] font-bold flex items-center gap-1">
                            <ShieldAlert className="h-3 w-3" strokeWidth={2.5} />
                            {t("return_recommended")} (bar)
                        </Label>
                        <Input
                            data-testid="input-threshold-advisory"
                            type="number"
                            value={settings.pressureAdvisoryBar}
                            onChange={(e) =>
                                setSettings({
                                    ...settings,
                                    pressureAdvisoryBar: e.target.value,
                                })
                            }
                            className="bg-[#111] border-[#2a2000] rounded-none h-11 text-white font-mono-tac text-lg mt-1"
                        />
                        <div className="text-[10px] text-[#666] mt-1">175 bar</div>
                    </div>
                    <div>
                        <Label className="text-[10px] tracking-[0.15em] uppercase text-[#888] font-bold">
                            {t("th_pressure")}
                        </Label>
                        <Input
                            data-testid="input-threshold-pressure"
                            type="number"
                            value={settings.pressureWarningBar}
                            onChange={(e) =>
                                setSettings({ ...settings, pressureWarningBar: e.target.value })
                            }
                            className="bg-[#111] border-[#222] rounded-none h-11 text-white font-mono-tac text-lg mt-1"
                        />
                        <div className="text-[10px] text-[#666] mt-1">{t("th_pressure_hint")}</div>
                    </div>
                    <div>
                        <Label className="text-[10px] tracking-[0.15em] uppercase text-[#888] font-bold">
                            {t("th_minutes")}
                        </Label>
                        <Input
                            data-testid="input-threshold-minutes"
                            type="number"
                            value={Math.round(settings.timeWarningSeconds / 60)}
                            onChange={(e) =>
                                setSettings({
                                    ...settings,
                                    timeWarningSeconds: (parseFloat(e.target.value) || 0) * 60,
                                })
                            }
                            className="bg-[#111] border-[#222] rounded-none h-11 text-white font-mono-tac text-lg mt-1"
                        />
                        <div className="text-[10px] text-[#666] mt-1">{t("th_minutes_hint")}</div>
                    </div>
                    <div className="flex items-center justify-between border-t border-[#1a1a1a] pt-4">
                        <div className="flex items-center gap-2">
                            {settings.soundEnabled ? (
                                <Volume2 className="h-5 w-5 text-[#32D74B]" strokeWidth={2} />
                            ) : (
                                <VolumeX className="h-5 w-5 text-[#666]" strokeWidth={2} />
                            )}
                            <div>
                                <Label className="text-sm font-bold text-white">
                                    {t("sound_alarm")}
                                </Label>
                                <div className="text-[10px] text-[#666] uppercase tracking-[0.1em]">
                                    {t("sound_hint")}
                                </div>
                            </div>
                        </div>
                        <Switch
                            data-testid="switch-sound"
                            checked={settings.soundEnabled}
                            onCheckedChange={(v) => setSettings({ ...settings, soundEnabled: v })}
                        />
                    </div>
                    <Button
                        data-testid="btn-test-sound"
                        variant="outline"
                        onClick={handleTestSound}
                        className="w-full rounded-none bg-transparent border-[#333] text-white hover:bg-[#111] hover:text-white"
                    >
                        <Volume2 className="h-4 w-4 mr-2" /> {t("test_sound")}
                    </Button>
                </div>
                <DialogFooter className="gap-2">
                    <Button
                        data-testid="btn-reset-settings"
                        variant="outline"
                        onClick={handleReset}
                        className="rounded-none bg-transparent border-[#333] text-white hover:bg-[#111] hover:text-white"
                    >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        {t("default")}
                    </Button>
                    <Button
                        data-testid="btn-save-settings"
                        onClick={handleSave}
                        className="bg-[#007AFF] hover:bg-[#1a8cff] text-white rounded-none font-bold uppercase tracking-wider"
                    >
                        {t("save_settings")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
