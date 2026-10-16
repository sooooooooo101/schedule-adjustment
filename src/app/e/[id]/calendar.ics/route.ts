import type { NextRequest } from "next/server";
import { buildIcs } from "@/lib/calendar";
import { getEvent } from "@/lib/events";

// 確定した予定を .ics で配る（iPhone 標準カレンダーなど Google 以外向け）
export async function GET(_request: NextRequest, ctx: RouteContext<"/e/[id]/calendar.ics">) {
  const { id } = await ctx.params;
  const event = await getEvent(id);
  if (!event?.confirmation) return new Response("Not found", { status: 404 });

  const { slot, meetUrl } = event.confirmation;
  const ics = buildIcs({
    uid: `${event.id}@schedule-adjustment`,
    title: event.title,
    start: slot.startAt,
    end: slot.endAt,
    description: meetUrl ? `Google Meet: ${meetUrl}` : undefined,
    url: meetUrl ?? undefined,
  });
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="event.ics"`,
    },
  });
}
