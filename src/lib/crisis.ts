export const CRISIS_SUPPORT_EVENT = "copium:crisis-support";
export const CRISIS_RESPONSE_STATUS = 422;

const CRISIS_PATTERNS: RegExp[] = [
  /\b(?:suicide|suicidal)\b/i,
  /\b(?:kill|hurt|cut)\s+myself\b/i,
  /(?:^|[.!?]\s*)(?:please\s+)?kill\s+me(?:[.!?]|$)/i,
  /\bi\s+want\s+(?:you|someone)\s+to\s+kill\s+me\b/i,
  /\b(?:end|take)\s+my\s+(?:own\s+)?life\b/i,
  /\b(?:want|wish|plan|planning|going)\s+to\s+die\b/i,
  /\b(?:do\s+not|don['’]?t|no\s+longer)\s+want\s+to\s+(?:live|be\s+alive)\b/i,
  /\b(?:better\s+off\s+dead|no\s+reason\s+to\s+live)\b/i,
  /\bcan['’]?t\s+go\s+on(?:[.!?]|$)/i,
  /\bself[- ]harm\b/i,
  /\boverdose\b[^\n]{0,40}\b(?:myself|die|suicide)\b/i,
  /\bjump\s+off\b[^\n]{0,40}\b(?:bridge|building|roof)\b/i,
  /(?:自杀|轻生|自残|割腕|跳楼|寻死)/,
  /(?:我|自己)(?:\s*(?:现在|真的|已经|可能|也|很|就|只)){0,3}\s*(?:想|要|准备|打算|计划|考虑)(?:去)?(?:死(?!你|他|她|它|们)|结束生命|结束自己|伤害自己)/,
  /(?:准备|打算|计划|考虑)(?:去)?(?:死|结束生命|结束自己|伤害自己)/,
  /(?:不想活了?|没有活下去的理由|一死了之|死了算了)/,
  /(?:我|自己|真的|实在|感觉)(?:已经|真的|快要|再也)?活不下去/,
];

/**
 * A deliberately conservative local safety gate, not a diagnosis. It catches
 * explicit crisis language before any text is sent to an LLM provider.
 */
export function containsCrisisLanguage(text: string): boolean {
  const normalized = text.normalize("NFKC").replace(/\s+/g, " ").trim();
  return normalized.length > 0 && CRISIS_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function requestCrisisSupport(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CRISIS_SUPPORT_EVENT));
  }
}

export function containsCrisisLanguageInUserHistory(
  messages: Array<{ role: string; content: string }>,
): boolean {
  return messages.some(
    (message) =>
      message.role === "user" && containsCrisisLanguage(message.content || ""),
  );
}
