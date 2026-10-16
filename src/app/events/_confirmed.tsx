import type { Confirmation } from "@/lib/events";
import { formatSlot } from "@/lib/time";

// 確定した日時と、Meet・カレンダーへの導線
export function ConfirmedCard({
  confirmation,
  links,
}: {
  confirmation: Confirmation;
  links: { href: string; label: string; download?: boolean }[];
}) {
  return (
    <section className="flex flex-col gap-1.5">
      <h2 className="section-header">確定した日時</h2>
      <ul className="grouped">
        <li className="row font-semibold">{formatSlot(confirmation.slot.startAt, confirmation.slot.endAt)}</li>
        {confirmation.meetUrl && (
          <li>
            <a href={confirmation.meetUrl} target="_blank" rel="noopener noreferrer" className="row pressable text-accent">
              <span className="flex-1">Google Meet に参加</span>
              <span aria-hidden>›</span>
            </a>
          </li>
        )}
        {links.map((l) => (
          <li key={l.href}>
            <a
              href={l.href}
              {...(l.download ? { download: true } : { target: "_blank", rel: "noopener noreferrer" })}
              className="row pressable text-accent"
            >
              <span className="flex-1">{l.label}</span>
              <span aria-hidden>›</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
