import React, { useState } from "react";
import { cn } from "../lib/cn";

const AccordionContext = React.createContext<{
    activeItems: string[];
    toggleItem: (id: string) => void;
    isItemActive: (id: string) => boolean;
} | null>(null);

export const Accordion = ({ children, defaultOpen, allowMultiple = false }: any) => {
    const [activeItems, setActiveItems] = useState<string[]>(defaultOpen ? [defaultOpen] : []);
    const toggleItem = (id: string) => {
        setActiveItems((prev) => {
            if (allowMultiple) {
                return prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
            } else {
                return prev.includes(id) ? [] : [id];
            }
        });
    };
    const isItemActive = (id: string) => activeItems.includes(id);
    return (
        <AccordionContext.Provider value={{ activeItems, toggleItem, isItemActive }}>
            <div className="space-y-2">{children}</div>
        </AccordionContext.Provider>
    );
};

export const AccordionItem = ({ id, children }: any) => (
    <div className="overflow-hidden border-b border-gray-200">{children}</div>
);

export const AccordionHeader = ({ itemId, children }: any) => {
    const context = React.useContext(AccordionContext);
    const isActive = context?.isItemActive(itemId);
    return (
        <button
            onClick={() => context?.toggleItem(itemId)}
            className="w-full px-4 py-3 text-left focus:outline-none transition-colors duration-200 flex items-center justify-between cursor-pointer"
        >
            <div className="flex-1">{children}</div>
            <svg
                className={cn("w-5 h-5 transition-transform duration-200", { "rotate-180": isActive })}
                fill="none"
                stroke="#98A2B3"
                viewBox="0 0 24 24"
            >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
        </button>
    );
};

export const AccordionContent = ({ itemId, children }: any) => {
    const context = React.useContext(AccordionContext);
    const isActive = context?.isItemActive(itemId);
    return (
        <div className={cn("overflow-hidden transition-all duration-300 ease-in-out", isActive ? "max-h-fit opacity-100" : "max-h-0 opacity-0")}>
            <div className="px-4 py-3">{children}</div>
        </div>
    );
};
