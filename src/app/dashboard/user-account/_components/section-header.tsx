import { LucideIcon } from "lucide-react"

interface SectionHeaderProps {
    title: string
    description?: string
    icon?: LucideIcon
    iconColor?: "default" | "blue" | "green" | "orange" | "red" | "purple"
}

const iconColorStyles = {
    default: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400",
    green: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400",
    orange: "bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-400",
    red: "bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400",
    purple: "bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400",
}

export function SectionHeader({
    title,
    description,
    icon: Icon,
    iconColor = "default"
}: SectionHeaderProps) {
    return (
        <div className="flex items-center gap-3 border-b border-border/50 pb-3 pt-6 first:pt-0">
            {Icon && (
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconColorStyles[iconColor]}`}>
                    <Icon className="h-4 w-4" />
                </div>
            )}
            <div className="flex-1">
                <h2 className="text-base font-semibold tracking-tight text-foreground">
                    {title}
                </h2>
                {description && (
                    <p className="text-[13px] text-muted-foreground/80">{description}</p>
                )}
            </div>
        </div>
    )
}
