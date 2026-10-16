import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "プライバシーポリシー | 日程調整" };

const CONTACT = "gajml84460@gmail.com";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-[1.0625rem] font-semibold">{title}</h2>
      <div className="flex flex-col gap-2 text-[0.9375rem] leading-relaxed text-label-secondary">{children}</div>
    </section>
  );
}

export default function Privacy() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-8 px-4 pt-[max(env(safe-area-inset-top),0.5rem)] pb-[max(env(safe-area-inset-bottom),2rem)]">
      <Link href="/" className="back-link pressable self-start">‹ トップ</Link>
      <h1 className="large-title">プライバシーポリシー</h1>
      <p className="text-[0.9375rem] text-label-secondary">最終更新日: 2026年10月16日</p>

      <Section title="このサービスについて">
        <p>「日程調整」（以下、本サービス）は、個人が運営する日程調整ツールです。本ポリシーは、本サービスが取得する情報とその扱いを説明します。</p>
      </Section>

      <Section title="取得する情報">
        <p>作成者（Google でログインする方）について、次の情報を取得します。</p>
        <ul className="list-disc pl-5">
          <li>Google アカウントのメールアドレスと識別子</li>
          <li>Google カレンダーにアクセスするための認可情報（リフレッシュトークン。暗号化して保存します）</li>
          <li>作成した調整の内容（タイトル、候補日時など）</li>
        </ul>
        <p>回答者について、入力された名前、メールアドレス（任意）、コメント（任意）、各候補への回答を取得します。</p>
      </Section>

      <Section title="Google ユーザーデータの利用">
        <p>本サービスは、作成者の許可を得て、Google カレンダーに次の操作を行います。</p>
        <ul className="list-disc pl-5">
          <li>候補日時を提案するため、カレンダーの空き時間（予定の有無のみ）を参照します。予定の内容は参照しません</li>
          <li>日程を確定したとき、作成者のカレンダーに予定を作成し、Google Meet の URL の発行と参加者への招待を行います</li>
        </ul>
        <p>
          本サービスによる Google API から受け取った情報の使用および他のアプリへの転送は、
          <a href="https://developers.google.com/terms/api-services-user-data-policy" className="text-accent underline">
            Google API サービスのユーザーデータに関するポリシー
          </a>
          （限定使用の要件を含む）に従います。Google ユーザーデータを広告に使用したり、第三者に販売したりすることはありません。
        </p>
      </Section>

      <Section title="AI の利用">
        <p>
          「来週火曜の午後」のような入力文を日時に変換するため、入力文と当日の日付を Google の Gemini API に送信する場合があります。カレンダーの予定や空き時間は送信しません。Gemini API の無料枠では、送信内容が Google のサービス改善に使われることがあります。
        </p>
      </Section>

      <Section title="保存と第三者への提供">
        <p>情報は、本サービスの運用に使う Vercel（ホスティング）と Neon（データベース）に保存します。法令に基づく場合を除き、本人の同意なく第三者に提供しません。</p>
      </Section>

      <Section title="削除と問い合わせ">
        <p>
          作成者は、Google アカウントの設定からいつでも本サービスへのアクセス許可を取り消せます。保存された情報の削除やその他の問い合わせは、
          <a href={`mailto:${CONTACT}`} className="text-accent underline">{CONTACT}</a>
          までご連絡ください。
        </p>
      </Section>

      <Section title="改定">
        <p>本ポリシーを変更する場合は、このページで告知します。</p>
      </Section>
    </main>
  );
}
