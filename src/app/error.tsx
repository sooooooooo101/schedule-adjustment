"use client";

export default function Error({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 pt-[max(env(safe-area-inset-top),1rem)]">
      <h1 className="large-title pt-12">接続できません</h1>
      <p className="text-[1.0625rem] leading-relaxed text-label-secondary">
        データベースか Google との接続に失敗しました。詳しくはサーバーのログを確認してください。
      </p>
      <button type="button" onClick={() => retry()} className="button-primary pressable">
        もう一度読み込む
      </button>
    </main>
  );
}
