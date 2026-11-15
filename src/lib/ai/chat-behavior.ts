export const vagueHealthClarification = (question: string) => {
  const value = question.trim().toLowerCase().replace(/[.!?]+$/g, "");
  return /^(?:i feel|i'm feeling|im feeling) (?:bad|off|unwell|weird|not right|terrible|awful)$/.test(value)
    || /^(?:i am|i'm|im) (?:not feeling well|unwell|sick|not okay|not ok)$/.test(value)
    || /^(?:something is wrong|i don't feel right|i do not feel right)$/.test(value);
};

export const isTriageHealthQuestion = (question: string) => {
  const value = question.trim().toLowerCase();
  if (!value || vagueHealthClarification(value)) return false;
  if (/\b(?:compare|comparison|versus|\bvs\b|trend|changed|change|weather|forecast|define|what is|who is|when is)\b/.test(value)) return false;
  return /\b(?:pain|ache|hurt|injur|bleed|cut|burn|rash|fever|nausea|vomit|dizz|breath|chest|headache|symptom|unwell|sick|tired|fatigue|feel|health|medical|assessment|sleep|heart rate|blood pressure|oxygen|spo2|temperature|glucose|vital|am i okay|am i ok|how am i doing|my readings|my vitals|my symptoms|what should i do)\b/.test(value);
};

export const CLARIFY_HEALTH_QUESTION = "Can you tell me more — pain, tiredness, or mood?";
