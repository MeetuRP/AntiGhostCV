import { cn } from "../lib/cn";
import { Accordion, AccordionContent, AccordionHeader, AccordionItem } from "./Accordion";
import type { UnifiedFeedback } from "../types";

const DetailScoreBadge = ({ score }: { score: number }) => (
    <div className={cn("flex flex-row gap-1 items-center px-2 py-0.5 rounded-[96px]",
        score > 69 ? "bg-badge-green" : score > 39 ? "bg-badge-yellow" : "bg-badge-red")}>
        <img src={score > 69 ? "/icons/check.svg" : "/icons/warning.svg"} alt="score" className="size-4" />
        <p className={cn("text-sm font-medium",
            score > 69 ? "text-badge-green-text" : score > 39 ? "text-badge-yellow-text" : "text-badge-red-text")}>
            {score}/100
        </p>
    </div>
);

const CategoryContent = ({ tips }: { tips: { type: "good" | "improve"; tip: string; explanation?: string }[] }) => (
    <div className="flex flex-col gap-4 items-center w-full">
        <div className="bg-gray-50 w-full rounded-lg px-5 py-4 grid grid-cols-2 gap-4">
            {tips.map((tip, index) => (
                <div className="flex flex-row gap-2 items-center" key={index}>
                    <img src={tip.type === "good" ? "/icons/check.svg" : "/icons/warning.svg"} alt="score" className="size-5" />
                    <p className="text-xl text-gray-500">{tip.tip}</p>
                </div>
            ))}
        </div>
    </div>
);

const Details = ({ feedback }: { feedback: UnifiedFeedback }) => (
    <div className="flex flex-col gap-4 w-full">
        <Accordion>
            <AccordionItem id="skills">
                <AccordionHeader itemId="skills">
                    <div className="flex flex-row gap-4 items-center py-2">
                        <p className="text-2xl font-semibold">Technical Skills</p>
                        <DetailScoreBadge score={feedback.skills.score} />
                    </div>
                </AccordionHeader>
                <AccordionContent itemId="skills">
                    <CategoryContent tips={feedback.skills.tips} />
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    </div>
);

export default Details;
