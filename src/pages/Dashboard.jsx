import { useEffect, useState, useCallback } from "react";
import { Plus, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { listRotas } from "@/lib/api";
import { useLang } from "@/lib/i18n";
import RotaCard from "@/components/RotaCard";
import NewRotaDialog from "@/components/NewRotaDialog";

export default function Dashboard() {
    const { t } = useLang();
    const [rotas, setRotas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openNew, setOpenNew] = useState(false);

    const refresh = useCallback(async () => {
        try {
            const data = await listRotas("active");
            setRotas(data);
        } catch (e) {
            toast.error("Error");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return (
        <div data-testid="dashboard-root" className="max-w-[1800px] mx-auto">
            <div className="flex items-center justify-between mb-4 md:mb-6 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <Radio
                        className="h-6 w-6 text-[#FF3B30] warning-blink shrink-0"
                        strokeWidth={2.5}
                    />
                    <div className="min-w-0">
                        <h1 className="font-heading text-2xl md:text-3xl font-black tracking-tight text-white">
                            {t("active_ops")}
                        </h1>
                        <div className="text-xs tracking-[0.15em] uppercase text-[#666]">
                            {t("rotas_in_action", rotas.length)}
                        </div>
                    </div>
                </div>
                <Button
                    data-testid="btn-add-rota"
                    onClick={() => setOpenNew(true)}
                    className="bg-[#007AFF] hover:bg-[#1a8cff] text-white rounded-none font-bold uppercase tracking-wider h-11 px-5 active:scale-[0.98] transition-transform shrink-0"
                >
                    <Plus className="h-5 w-5 mr-2" strokeWidth={3} />
                    {t("add_rota")}
                </Button>
            </div>

            {loading ? (
                <div className="text-center py-20 text-[#666]">{t("loading")}</div>
            ) : rotas.length === 0 ? (
                <div
                    data-testid="empty-rotas"
                    className="border border-dashed border-[#222] py-16 md:py-24 text-center"
                >
                    <Radio className="h-12 w-12 mx-auto mb-4 text-[#333]" strokeWidth={2} />
                    <div className="font-heading text-xl text-white font-bold mb-2">
                        {t("no_active")}
                    </div>
                    <div className="text-sm text-[#666] mb-6">{t("start_hint")}</div>
                    <Button
                        data-testid="btn-add-rota-empty"
                        onClick={() => setOpenNew(true)}
                        className="bg-[#007AFF] hover:bg-[#1a8cff] text-white rounded-none font-bold uppercase tracking-wider h-11 px-5"
                    >
                        <Plus className="h-5 w-5 mr-2" strokeWidth={3} />
                        {t("stoper")} 1
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
                    {rotas.map((rota) => (
                        <RotaCard key={rota.id} rota={rota} onChange={refresh} />
                    ))}
                </div>
            )}

            <NewRotaDialog
                open={openNew}
                onOpenChange={setOpenNew}
                onCreated={() => {
                    setOpenNew(false);
                    refresh();
                }}
            />
        </div>
    );
}
