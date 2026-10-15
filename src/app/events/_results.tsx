import { tally, type EventDetail } from "@/lib/events";
import { formatSlot } from "@/lib/time";

const MARK = { yes: "○", maybe: "△", no: "×" } as const;

// 候補ごとの回答状況。○の多い候補を強調する
export function Results({ event }: { event: EventDetail }) {
  const rows = tally(event);
  const best = Math.max(0, ...rows.map((r) => r.score));

  return (
    <ul className="grouped">
      {rows.map(({ slot, yes, maybe, no, score }) => {
        const isBest = best > 0 && score === best;
        return (
          <li key={slot.id} className="flex flex-col gap-1 px-4 py-3">
            <div className="flex items-baseline justify-between gap-3">
              <span className={isBest ? "font-semibold" : undefined}>
                {formatSlot(slot.startAt, slot.endAt)}
              </span>
              <span className="shrink-0 text-[0.9375rem] tabular-nums text-label-secondary">
                ○{yes} △{maybe} ×{no}
              </span>
            </div>
            {event.responses.length > 0 && (
              <p className="text-[0.8125rem] leading-relaxed text-label-secondary">
                {event.responses
                  .filter((r) => r.answers[slot.id])
                  .map((r) => `${MARK[r.answers[slot.id]]}${r.name}`)
                  .join("　")}
              </p>
            )}
            {isBest && <span className="text-[0.8125rem] font-semibold text-accent">いちばん集まっています</span>}
          </li>
        );
      })}
    </ul>
  );
}
