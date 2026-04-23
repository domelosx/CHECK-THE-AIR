import { useEffect, useState } from "react";
import { loadSettings } from "@/lib/settings";

export function useSettings() {
    const [settings, setSettings] = useState(loadSettings());
    useEffect(() => {
        const onChange = () => setSettings(loadSettings());
        window.addEventListener("scba-settings-change", onChange);
        window.addEventListener("storage", onChange);
        return () => {
            window.removeEventListener("scba-settings-change", onChange);
            window.removeEventListener("storage", onChange);
        };
    }, []);
    return settings;
}
