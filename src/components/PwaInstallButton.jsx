import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PwaInstallButton() {
    const [prompt, setPrompt] = useState(null);
    const [installed, setInstalled] = useState(false);

    useEffect(() => {
        const onBeforeInstall = (e) => {
            e.preventDefault();
            setPrompt(e);
        };
        const onInstalled = () => {
            setInstalled(true);
            setPrompt(null);
        };
        // Already running in standalone mode? Hide the button.
        const standalone =
            window.matchMedia?.("(display-mode: standalone)").matches ||
            window.navigator.standalone === true;
        if (standalone) setInstalled(true);

        window.addEventListener("beforeinstallprompt", onBeforeInstall);
        window.addEventListener("appinstalled", onInstalled);
        return () => {
            window.removeEventListener("beforeinstallprompt", onBeforeInstall);
            window.removeEventListener("appinstalled", onInstalled);
        };
    }, []);

    if (installed || !prompt) return null;

    const handleInstall = async () => {
        try {
            await prompt.prompt();
            const choice = await prompt.userChoice;
            if (choice?.outcome === "accepted") {
                setPrompt(null);
            }
        } catch {
            // ignore
        }
    };

    return (
        <Button
            data-testid="btn-pwa-install"
            variant="ghost"
            size="sm"
            onClick={handleInstall}
            className="h-9 px-2 gap-1.5 text-[#32D74B] hover:text-white hover:bg-[#32D74B]/20 rounded-none"
        >
            <Download className="h-4 w-4" strokeWidth={2.5} />
            <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">
                Zainstaluj
            </span>
        </Button>
    );
}
