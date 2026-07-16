type JsonRecord = Record<string, unknown>;

const ANXIETY_TYPES = [
  "DEADLINE_TERROR",
  "AI_REPLACEMENT",
  "SOCIAL_DREAD",
  "EXISTENTIAL_CRISIS",
  "FINANCIAL_PANIC",
  "CAREER_VERTIGO",
  "COMPARISON_SYNDROME",
  "INFORMATION_OVERLOAD",
  "GENERAL_ANXIETY",
] as const;

export interface TriageResult {
  type: (typeof ANXIETY_TYPES)[number];
  typeName: string;
  level: number;
  diagnosis: string;
  recommendation: string;
  nurseComment: string;
}

export interface DecoderResult {
  original: string;
  surface: string;
  subtext: string;
  truth: string;
  suggested_reply: string;
  danger_level: number;
}

export interface RouletteResult {
  profession: string;
  verdict: "SAFE" | "DANGER" | "UNKNOWN";
  probability: number;
  reasons: { pessimistic: string; optimistic: string; absurd: string };
  ai_scene: string;
  fortune_cookie: string;
}

export interface ThreatItem {
  name: string;
  danger: number;
  description: string;
}

export interface SurvivalReport {
  threat_level: "GREEN" | "YELLOW" | "ORANGE" | "RED" | "ULTRAVIOLET";
  survival_rate: string;
  threats: ThreatItem[];
  survival_tips: string[];
  weather_forecast: string;
  motivational_quote: string;
}

export interface ReportData {
  diagnosis: string;
  treatment_summary: string;
  prescription: string[];
  doctor_note: string;
  survival_rate: string;
  next_visit: string;
}

function parseObject(content: string): JsonRecord {
  if (typeof content !== "string") throw new Error("Model result is not text");
  const cleaned = content.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("Model result does not contain a JSON object");
  const value: unknown = JSON.parse(cleaned.slice(start, end + 1));
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Model result must be a JSON object");
  }
  return value as JsonRecord;
}

function record(value: unknown, field: string): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${field} must be an object`);
  }
  return value as JsonRecord;
}

function text(value: unknown, field: string, maxLength = 2000): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${field} must be non-empty text`);
  return value.trim().slice(0, maxLength);
}

function integer(value: unknown, field: string, min: number, max: number): number {
  if (!Number.isInteger(value) || (value as number) < min || (value as number) > max) {
    throw new Error(`${field} must be an integer from ${min} to ${max}`);
  }
  return value as number;
}

function oneOf<T extends readonly string[]>(value: unknown, field: string, allowed: T): T[number] {
  if (typeof value !== "string" || !allowed.includes(value)) {
    throw new Error(`${field} is outside the allowed values`);
  }
  return value as T[number];
}

function stringArray(value: unknown, field: string, min = 1, max = 8): string[] {
  if (!Array.isArray(value)) throw new Error(`${field} must be an array`);
  const values = value.map((item, index) => text(item, `${field}[${index}]`, 500));
  if (values.length < min || values.length > max) throw new Error(`${field} must contain ${min}-${max} items`);
  return values;
}

export function parseTriageResult(content: string): TriageResult {
  const value = parseObject(content);
  return {
    type: oneOf(value.type, "type", ANXIETY_TYPES),
    typeName: text(value.typeName, "typeName", 120),
    level: integer(value.level, "level", 1, 5),
    diagnosis: text(value.diagnosis, "diagnosis"),
    recommendation: text(value.recommendation, "recommendation"),
    nurseComment: text(value.nurseComment, "nurseComment"),
  };
}

export function parseDecoderResult(content: string): DecoderResult {
  const value = parseObject(content);
  return {
    original: text(value.original, "original"),
    surface: text(value.surface, "surface"),
    subtext: text(value.subtext, "subtext"),
    truth: text(value.truth, "truth"),
    suggested_reply: text(value.suggested_reply, "suggested_reply"),
    danger_level: integer(value.danger_level, "danger_level", 1, 5),
  };
}

export function parseRouletteResult(content: string): RouletteResult {
  const value = parseObject(content);
  const reasons = record(value.reasons, "reasons");
  return {
    profession: text(value.profession, "profession"),
    verdict: oneOf(value.verdict, "verdict", ["SAFE", "DANGER", "UNKNOWN"] as const),
    probability: integer(value.probability, "probability", 0, 100),
    reasons: {
      pessimistic: text(reasons.pessimistic, "reasons.pessimistic"),
      optimistic: text(reasons.optimistic, "reasons.optimistic"),
      absurd: text(reasons.absurd, "reasons.absurd"),
    },
    ai_scene: text(value.ai_scene, "ai_scene"),
    fortune_cookie: text(value.fortune_cookie, "fortune_cookie"),
  };
}

export function parseSurvivalReport(content: string): SurvivalReport {
  const value = parseObject(content);
  if (!Array.isArray(value.threats) || value.threats.length < 1 || value.threats.length > 5) {
    throw new Error("threats must contain 1-5 items");
  }
  const threats = value.threats.map((item, index) => {
    const threat = record(item, `threats[${index}]`);
    return {
      name: text(threat.name, `threats[${index}].name`),
      danger: integer(threat.danger, `threats[${index}].danger`, 1, 5),
      description: text(threat.description, `threats[${index}].description`),
    };
  });
  return {
    threat_level: oneOf(value.threat_level, "threat_level", ["GREEN", "YELLOW", "ORANGE", "RED", "ULTRAVIOLET"] as const),
    survival_rate: text(value.survival_rate, "survival_rate", 80),
    threats,
    survival_tips: stringArray(value.survival_tips, "survival_tips", 1, 5),
    weather_forecast: text(value.weather_forecast, "weather_forecast"),
    motivational_quote: text(value.motivational_quote, "motivational_quote"),
  };
}

export function parseReportData(content: string): ReportData {
  const value = parseObject(content);
  const prescription = typeof value.prescription === "string"
    ? value.prescription.split(/[;；\n]/).map((item) => item.trim()).filter(Boolean)
    : value.prescription;
  return {
    diagnosis: text(value.diagnosis, "diagnosis"),
    treatment_summary: text(value.treatment_summary, "treatment_summary"),
    prescription: stringArray(prescription, "prescription", 1, 5),
    doctor_note: text(value.doctor_note, "doctor_note"),
    survival_rate: text(value.survival_rate, "survival_rate", 80),
    next_visit: text(value.next_visit, "next_visit"),
  };
}
