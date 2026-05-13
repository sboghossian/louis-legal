import React from "react";

interface Tab<T extends string> {
    id: T;
    label: string;
}

interface Props<T extends string> {
    tabs: Tab<T>[];
    active: T;
    onChange: (id: T) => void;
    /** Optional content rendered on the right side of the toolbar */
    actions?: React.ReactNode;
}

export function ToolbarTabs<T extends string>({
    tabs,
    active,
    onChange,
    actions,
}: Props<T>) {
    return (
        <div className="flex items-center h-10 px-8 border-b border-border">
            <div className="flex-1 flex items-center gap-5">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => onChange(tab.id)}
                        className={`text-xs transition-colors ${
                            active === tab.id
                                ? "font-medium text-foreground/80"
                                : "font-normal text-muted-foreground hover:text-foreground/80"
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            {actions && (
                <div className="flex items-center gap-1">{actions}</div>
            )}
        </div>
    );
}
