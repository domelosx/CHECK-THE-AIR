import { Globe } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { LANGUAGES, useLang } from "@/lib/i18n";

export default function LanguageSwitcher() {
    const { lang, setLang } = useLang();
    const current = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    data-testid="btn-language"
                    variant="ghost"
                    size="sm"
                    className="h-9 px-2 gap-1.5 text-[#888] hover:text-white hover:bg-[#1a1a1a] rounded-none"
                >
                    <Globe className="h-4 w-4" strokeWidth={2} />
                    <span className="text-base leading-none">{current.flag}</span>
                    <span className="text-xs font-bold uppercase">{current.code}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                data-testid="menu-language"
                className="bg-[#0a0a0a] border-[#222] rounded-none text-white min-w-[180px]"
                align="end"
            >
                {LANGUAGES.map((l) => (
                    <DropdownMenuItem
                        key={l.code}
                        data-testid={`lang-${l.code}`}
                        onClick={() => setLang(l.code)}
                        className={`rounded-none cursor-pointer focus:bg-[#1a1a1a] focus:text-white gap-2 ${
                            l.code === lang ? "bg-[#111] text-white" : "text-[#aaa]"
                        }`}
                    >
                        <span className="text-base">{l.flag}</span>
                        <span className="flex-1">{l.label}</span>
                        {l.code === lang && (
                            <span className="text-[#007AFF] font-bold text-xs">●</span>
                        )}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
