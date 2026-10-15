// 作成者としてログインを許可する Google アカウントの一覧（OWNER_EMAILS、カンマ区切り）。

export function parseOwnerEmails(raw: string): string[] {
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);
}

export function isOwnerEmail(email: string, owners: string[]): boolean {
  return owners.includes(email.trim().toLowerCase());
}
