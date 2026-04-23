import { useEffect, useState } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, NavLink, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { Flame, Users, History as HistoryIcon, Activity } from "lucide-react";
import Dashboard from "@/pages/Dashboard";
import FirefightersDb from "@/pages/FirefightersDb";
import HistoryPage from "@/pages/HistoryPage";
import SettingsDialog from "@/components/SettingsDialog";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import PwaInstallButton from "@/components/PwaInstallButton";
import { unlockAudio } from "@/lib/sound";
import { useLang } from "@/lib/i18n";

function LiveClock() {
    const [now, setNow] = useState(new Date());
    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(t);
    }, []);
    const pad = (n) => String(n).padStart(2, "0");
    return (
        <div
            data-testid="header-clock"
            className="font-mono-tac text-lg md:text-xl tracking-wider text-white hidden sm:block"
        >
            {pad(now.getHours())}:{pad(now.getMinutes())}:{pad(now.getSeconds())}
        </div>
    );
}

function Header() {
    const location = useLocation();
    const { t } = useLang();
    const tabs = [
        { to: "/", label: t("tab_active"), icon: Activity, testid: "tab-active" },
        { to: "/firefighters", label: t("tab_firefighters"), icon: Users, testid: "tab-firefighters" },
        { to: "/history", label: t("tab_history"), icon: HistoryIcon, testid: "tab-history" },
    ];
    return (
        <header
            data-testid="app-header"
            className="sticky top-0 z-40 border-b border-[#222] bg-[#0a0a0a]/95 backdrop-blur"
        >
            <div className="flex items-center justify-between px-4 md:px-6 py-3">
                <div className="flex items-center gap-3">
                    <div
                        data-testid="app-logo"
                        className="flex items-center gap-1.5 bg-[#FF3B30] h-10 pl-2 pr-3"
                    >
                        <Flame className="h-6 w-6 text-white" strokeWidth={2.5} />
                        <span className="font-heading text-xl font-black tracking-tight text-white leading-none">
                            AIR
                        </span>
                    </div>
                    <div>
                        <div
                            data-testid="app-title"
                            className="font-heading text-lg md:text-xl font-black tracking-tight text-white leading-none"
                        >
                            CHECK THE AIR
                        </div>
                        <div className="text-[10px] tracking-[0.2em] uppercase text-[#888] mt-1">
                            {t("app_sub")}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <LiveClock />
                    <PwaInstallButton />
                    <LanguageSwitcher />
                    <SettingsDialog />
                </div>
            </div>
            <nav className="flex border-t border-[#1a1a1a] overflow-x-auto">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const active = location.pathname === tab.to;
                    return (
                        <NavLink
                            key={tab.to}
                            to={tab.to}
                            data-testid={tab.testid}
                            className={`flex items-center gap-2 px-4 md:px-6 py-3 text-xs md:text-sm font-bold uppercase tracking-[0.1em] transition-colors duration-200 border-r border-[#1a1a1a] whitespace-nowrap ${
                                active
                                    ? "text-white bg-[#111] border-b-2 border-b-[#FF3B30]"
                                    : "text-[#666] hover:text-white hover:bg-[#0f0f0f]"
                            }`}
                        >
                            <Icon className="h-4 w-4" strokeWidth={2.5} />
                            {tab.label}
                        </NavLink>
                    );
                })}
            </nav>
        </header>
    );
}

function Footer() {
    return (
        <footer
            data-testid="app-footer"
            className="border-t border-[#1a1a1a] mt-8 py-5 px-4 md:px-6 text-center"
        >
            <div className="text-[10px] tracking-[0.2em] uppercase text-[#555]">
                © 2026 Damian Dąbek
            </div>
        </footer>
    );
}

function AppLayout({ children }) {
    useEffect(() => {
        const unlock = () => unlockAudio();
        window.addEventListener("click", unlock, { once: true });
        window.addEventListener("keydown", unlock, { once: true });
        return () => {
            window.removeEventListener("click", unlock);
            window.removeEventListener("keydown", unlock);
        };
    }, []);
    return (
        <div className="min-h-screen bg-[#050505] flex flex-col">
            <Header />
            <main className="px-4 md:px-6 py-4 md:py-6 flex-1">{children}</main>
            <Footer />
            <Toaster
                theme="dark"
                position="top-right"
                toastOptions={{
                    style: {
                        background: "#111",
                        color: "#fff",
                        border: "1px solid #222",
                        borderRadius: "2px",
                    },
                }}
            />
        </div>
    );
}

function App() {
    return (
        <div className="App">
            <BrowserRouter>
                <AppLayout>
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/firefighters" element={<FirefightersDb />} />
                        <Route path="/history" element={<HistoryPage />} />
                    </Routes>
                </AppLayout>
            </BrowserRouter>
        </div>
    );
}

export default App;
