"use client";

import { useState } from "react";

// スマホでは共有シート（LINE などに送れる）、使えない環境ではリンクをコピーする
export function ShareButton({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: `「${title}」の日程調整にご回答ください`, url });
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button type="button" onClick={share} className="button-primary pressable">
      {copied ? "リンクをコピーしました" : "回答用リンクを送る"}
    </button>
  );
}
