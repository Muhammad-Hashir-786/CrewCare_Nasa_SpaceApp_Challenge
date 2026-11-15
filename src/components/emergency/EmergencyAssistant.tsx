"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AlertOctagon, ArrowLeft, Check, ChevronRight, Clipboard, Mic, MicOff, Send, Volume2, VolumeX } from "lucide-react";
import { EMERGENCY_TYPES, getFirstAidSteps, getSpaceRiskNote, SAMPLE_MEDICAL_KIT, type EmergencyType } from "@/lib/emergency/first-aid-guidance";
import type { EmergencyScreen } from "@/lib/emergency/decision-support";
import type { HealthRecord } from "@/types";
import { DEMO_ASTRONAUTS } from "@/lib/demo-data";
import { BodyTrendDashboard } from "@/components/health/BodyTrendDashboard";
import { useMicrophoneLevel } from "@/hooks/useMicrophoneLevel";
import { useAstronaut } from "@/lib/astronaut-context";
import type { AIHealthResponse } from "@/lib/ai/ai-types";
import { APP_NOW_ISO, formatAppDate, formatAppDateTime, mergeDailyRecords } from "@/lib/health/checkin-store";

type RecognitionEvent = { results: ArrayLike<ArrayLike<{ transcript: string }>> };
type RecognitionLike = { lang: string; interimResults: boolean; maxAlternatives: number; onresult: ((event: RecognitionEvent) => void) | null; onerror: ((event: { error?: string }) => void) | null; onend: (() => void) | null; start: () => void; stop: () => void; abort: () => void };
type RecognitionConstructor = new () => RecognitionLike;
export type EmergencyContext = {
  astronautId?: string; callsign: string; assessment: string; activeCriticalAlerts: Array<{ title: string; message: string }>;
  lastMeasuredAt: string | null; healthRecords?: HealthRecord[]; isSimulated?: boolean;
  latestAssessment?: { id: string; userId: string; status: "GREEN" | "AMBER" | "RED"; summary: string; details?: string | null; guidance?: string | null; flags: string[]; createdAt: string } | null;
  activeAlerts?: Array<{ id: string; userId: string; severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"; status: "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED"; title: string; message: string; createdAt: string }>;
};
type VoiceState = "IDLE" | "LISTENING" | "PROCESSING" | "SPEAKING" | "WAITING" | "INTERRUPTED" | "CONNECTION_ERROR";
type Message = { role: "crew" | "assistant"; text: string; at: string };
type QuickAnswer = "YES" | "NO" | null;
type CrewProfile = typeof DEMO_ASTRONAUTS[number] & { knownAllergies?: string[] | null; knownConditions?: string[] | null; allergies?: string[] | null; conditions?: string[] | null };
type EmergencyTest = { id: string; label: string; placeholder: string };
type EmergencyTestResult = { result: string; time: string };

const TRIAGE_QUESTIONS = [
  { key: "responsive", label: "Is the person conscious?" },
  { key: "breathingNormally", label: "Is the person breathing normally?" },
  { key: "severeBleeding", label: "Is there heavy bleeding?" },
] as const;
const metricDefinitions: Array<{ key: keyof HealthRecord; label: string; unit: string }> = [
  { key: "heartRate", label: "Heart rate", unit: "bpm" }, { key: "systolicBP", label: "Systolic BP", unit: "mmHg" },
  { key: "diastolicBP", label: "Diastolic BP", unit: "mmHg" }, { key: "bodyTemp", label: "Body temperature", unit: "°C" },
  { key: "oxygenSat", label: "Oxygen saturation", unit: "%" }, { key: "bloodGlucose", label: "Blood glucose", unit: "mg/dL" },
  { key: "sleepDuration", label: "Sleep duration", unit: "h" },
];
const SOURCE_URL = "https://cpr.heart.org/en/resuscitation-science/2024-first-aid-guidelines";
const CPR_URL = "https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/adult-basic-life-support";
const RED_CROSS_BURN = "https://www.redcross.org/take-a-class/resources/guidelines";
const FRACTURE_URL = "https://www.redcross.org/take-a-class/resources/learn-first-aid/muscle-bone-joint-injury";
const NASA_RADIATION_URL = "https://www.nasa.gov/reference/crew-systems/";
const NASA_DCS_URL = "https://www.nasa.gov/reference/risk-of-decompression-sickness/";
const NASA_SANS_URL = "https://www.nasa.gov/reference/risk-of-spaceflight-associated-neuro-ocular-syndrome-sans/";
const NASA_MEDICAL_URL = "https://www.nasa.gov/reference/medical-operations-and-clinical-care/";
const defaultScreen: EmergencyScreen = { responsive: "", breathingNormally: "", severeBleeding: "" };
const localSafetyLine = "CrewCare is not a doctor — this is first-aid guidance until professional help arrives.";

export function EmergencyAssistant({ context, fullPage = false, exitHref = "/" }: { context?: EmergencyContext; fullPage?: boolean; exitHref?: string }) {
  const router = useRouter();
  const { addHealthRecord } = useAstronaut();
  const [open, setOpen] = useState(fullPage);
  const [mounted, setMounted] = useState(false);
  const [selectedType, setSelectedType] = useState<EmergencyType | null>(null);
  const [selectedCrewId, setSelectedCrewId] = useState("");
  const [someoneElse, setSomeoneElse] = useState(false);
  const [storedCrewRecords, setStoredCrewRecords] = useState<Record<string, HealthRecord[]>>({});
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [screen, setScreen] = useState<EmergencyScreen>(defaultScreen);
  const [doneSteps, setDoneSteps] = useState<boolean[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [handsFree, setHandsFree] = useState(false);
  const [allergy, setAllergy] = useState<QuickAnswer>(null);
  const [canSwallow, setCanSwallow] = useState<QuickAnswer>(null);
  const [toldToAvoidAspirin, setToldToAvoidAspirin] = useState<QuickAnswer>(null);
  const [kitAspirinConfirmed, setKitAspirinConfirmed] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, EmergencyTestResult>>({});
  const [updatedAnalysis, setUpdatedAnalysis] = useState<AIHealthResponse | null>(null);
  const [analyzingTests, setAnalyzingTests] = useState(false);
  const [analysisUpdated, setAnalysisUpdated] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>("IDLE");
  const [elapsed, setElapsed] = useState(0);
  const speechRate = 0.92;
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState("");
  const [requestStatus, setRequestStatus] = useState<"NOT_REQUESTED" | "LOCAL_REQUEST_RECORDED">("NOT_REQUESTED");
  const [novaMuted, setNovaMuted] = useState(false);
  const micLevel = useMicrophoneLevel();
  const stopMicrophone = micLevel.stop;
  const recognition = useRef<RecognitionLike | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const voiceInteraction = useRef(false);
  const handsFreeActive = useRef(false);
  const mutedRef = useRef(false);
  const welcomePending = useRef(false);
  const novaInputRef = useRef<HTMLTextAreaElement>(null);
  const novaFormRef = useRef<HTMLFormElement>(null);
  const stepsPanelRef = useRef<HTMLElement>(null);
  const startedClock = useRef<number | null>(null);
  const selectedCrew = (DEMO_ASTRONAUTS.find((member) => member.id === selectedCrewId) as CrewProfile | undefined) ?? null;
  useEffect(() => {
    if (!selectedCrewId) return;
    const timer = window.setTimeout(() => {
      const crewMember = DEMO_ASTRONAUTS.find((person) => person.id === selectedCrewId);
      if (!crewMember) return;
      try {
        const local = JSON.parse(window.localStorage.getItem(`crewcare_checkins_${selectedCrewId}`) ?? "[]") as HealthRecord[];
        if (Array.isArray(local)) {
          const merged = mergeDailyRecords(crewMember.healthRecords ?? [], local.filter((record) => record?.id && record.userId === selectedCrewId));
          setStoredCrewRecords((previous) => ({ ...previous, [selectedCrewId]: merged }));
        }
      } catch { /* Retain the shared demo roster if browser data cannot be read. */ }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [selectedCrewId]);
  useEffect(() => { if (micLevel.micOff && voiceState === "LISTENING") { recognition.current?.stop(); setVoiceState("WAITING"); } }, [micLevel.micOff, voiceState]);
  const selectedCrewHistory = selectedCrew ? storedCrewRecords[selectedCrew.id] ?? selectedCrew.healthRecords ?? [] : [];
  const history = selectedCrew?.id === context?.astronautId && context?.healthRecords?.length ? context.healthRecords : selectedCrewHistory;
  const latest = history.at(-1);
  const selectedAssessment = selectedCrew && selectedCrew.id === context?.astronautId ? context?.latestAssessment ?? selectedCrew.latestAssessment : selectedCrew?.latestAssessment;
  const selectedAlerts = selectedCrew && selectedCrew.id === context?.astronautId ? context?.activeAlerts ?? [] : selectedCrew?.activeAlerts ?? [];
  const knownAllergies = selectedCrew?.knownAllergies ?? selectedCrew?.allergies ?? null;
  const knownConditions = selectedCrew?.knownConditions ?? selectedCrew?.conditions ?? null;
  const storedAspirinAllergy = knownAllergies?.some((item) => item.toLowerCase().includes("aspirin")) ?? false;
  const emergency = EMERGENCY_TYPES.find((item) => item.id === selectedType);
  const breathingAnswer = screen.breathingNormally === "YES" || screen.breathingNormally === "NO" ? screen.breathingNormally : null;
  const steps = selectedType ? getFirstAidSteps(selectedType, breathingAnswer) : [];
  const aspirinEligible = !storedAspirinAllergy && allergy === "NO" && screen.responsive === "YES" && canSwallow === "YES" && toldToAvoidAspirin === "NO" && screen.severeBleeding === "NO" && kitAspirinConfirmed;
  const emergencyTests: EmergencyTest[] = selectedType ? [
    { id: "repeat-reading", label: "Repeat the relevant reading after 15 minutes", placeholder: "Enter the re-check result" },
    ...(selectedType === "chest-pain" ? [
      { id: "blood-pressure", label: "Re-check blood pressure", placeholder: "e.g. 118/76 mmHg" },
      { id: "ecg", label: "ECG result", placeholder: "Enter the recorded ECG result" },
    ] : []),
    ...(selectedType === "fever-infection" ? [{ id: "temperature", label: "Re-check temperature", placeholder: "Enter temperature in °C" }] : []),
    ...(selectedType === "collapsed" || selectedType === "panic-confusion" ? [{ id: "glucose", label: "Re-check blood glucose", placeholder: "Enter blood glucose in mg/dL" }] : []),
    ...(selectedType === "breathing-trouble" ? [{ id: "oxygen", label: "Re-check oxygen saturation", placeholder: "Enter SpO₂ in %" }] : []),
    ...(selectedType === "vision-change" ? [{ id: "eye-scan", label: "Eye scan result", placeholder: "Enter the recorded eye-scan result" }] : []),
    ...(selectedType === "radiation" ? [{ id: "dosimeter", label: "Dosimeter reading", placeholder: "Enter the displayed reading and unit" }] : []),
  ] : [];

  useEffect(() => {
    if (!open || !mounted) return;
    startedClock.current = Date.now();
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - (startedClock.current ?? Date.now())) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [open]);
  useEffect(() => () => { recognition.current?.abort(); micLevel.stop(); if (typeof window !== "undefined") window.speechSynthesis?.cancel(); }, [micLevel.stop]);

  const speak = (value: string, chain = false) => {
    if (mutedRef.current) return;
    if (!("speechSynthesis" in window)) { setVoiceState("CONNECTION_ERROR"); setError("Voice playback is unavailable. The written steps remain on screen."); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(value); utterance.rate = speechRate;
    utterance.onstart = () => setVoiceState("SPEAKING");
    utterance.onend = () => {
      if (chain && handsFreeActive.current && currentStep < steps.length - 1) {
        const next = currentStep + 1;
        setCurrentStep(next);
        const step = steps[next];
        speak(`Step ${next + 1}. ${step.title}. ${step.instruction}`, true);
      }
      else { if (chain) setHandsFree(false); setVoiceState("WAITING"); }
    };
    utterance.onerror = () => { setVoiceState("CONNECTION_ERROR"); setHandsFree(false); };
    window.speechSynthesis.speak(utterance);
  };
  const sayCurrentStep = (chain = false) => {
    if (!steps[currentStep]) return;
    speak(`Step ${currentStep + 1}. ${steps[currentStep].title}. ${steps[currentStep].instruction}`, chain);
  };
  const speakWelcome = useCallback(() => {
    welcomePending.current = true;
    if (!("speechSynthesis" in window)) { setVoiceState("CONNECTION_ERROR"); setError("Voice playback is unavailable. The written steps remain on screen."); return; }
    try {
      window.speechSynthesis.cancel();
      const greeting = new SpeechSynthesisUtterance("What happened? Tell me, or tap a situation below.");
      greeting.rate = 0.94;
      greeting.onstart = () => { welcomePending.current = false; setVoiceState("SPEAKING"); };
      greeting.onend = () => setVoiceState("WAITING");
      greeting.onerror = () => { setVoiceState("CONNECTION_ERROR"); welcomePending.current = true; };
      window.speechSynthesis.speak(greeting);
    } catch { setVoiceState("CONNECTION_ERROR"); welcomePending.current = true; }
  }, []);
  useEffect(() => {
    if (!fullPage) return;
    const timer = window.setTimeout(speakWelcome, 0);
    return () => window.clearTimeout(timer);
  }, [fullPage, speakWelcome]);
  const retryWelcomeFromGesture = () => { if (welcomePending.current && !novaMuted) speakWelcome(); };
  const resetSession = () => {
    window.speechSynthesis?.cancel(); recognition.current?.abort(); micLevel.stop(); handsFreeActive.current = false; mutedRef.current = false; welcomePending.current = false; setNovaMuted(false); setOpen(true); setSelectedType(null); setSelectedCrewId(""); setSomeoneElse(false); setStartedAt(null); setScreen(defaultScreen); setDoneSteps([]); setCurrentStep(0); setHandsFree(false);
    setAllergy(null); setCanSwallow(null); setToldToAvoidAspirin(null); setKitAspirinConfirmed(false); setTestResults({}); setUpdatedAnalysis(null); setAnalysisUpdated(false); setAnalyzingTests(false); setError(""); setMessages([]); setText(""); setElapsed(0);
    setRequestStatus("NOT_REQUESTED"); setVoiceState("IDLE"); voiceInteraction.current = false;
    speakWelcome();
  };
  const chooseEmergency = (type: EmergencyType) => {
    window.speechSynthesis?.cancel(); handsFreeActive.current = false; setSelectedType(type); setStartedAt(new Date(APP_NOW_ISO)); setDoneSteps([]); setCurrentStep(0); setHandsFree(false); setError("");
    setAllergy(type === "chest-pain" && knownAllergies ? storedAspirinAllergy ? "YES" : "NO" : null); setCanSwallow(null); setToldToAvoidAspirin(null); setKitAspirinConfirmed(false); setTestResults({}); setUpdatedAnalysis(null); setAnalysisUpdated(false);
    setScreen({ responsive: type === "collapsed" ? "NO" : "", breathingNormally: "", severeBleeding: type === "heavy-bleeding" ? "YES" : "" });
    setVoiceState("WAITING");
    const first = getFirstAidSteps(type, null)[0];
    if (first) speak(`First step. ${first.title}. ${first.instruction}`);
    window.setTimeout(() => stepsPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  };
  const selectCrew = (id: string) => {
    setSelectedCrewId(id); setSomeoneElse(!id); setError("");
    const person = DEMO_ASTRONAUTS.find((member) => member.id === id) as CrewProfile | undefined;
    const allergies = person?.knownAllergies ?? person?.allergies ?? null;
    if (selectedType === "chest-pain") { setAllergy(allergies ? allergies.some((item) => item.toLowerCase().includes("aspirin")) ? "YES" : "NO" : null); setKitAspirinConfirmed(false); }
  };
  const updateScreen = (key: keyof EmergencyScreen, value: "YES" | "NO") => {
    setScreen((previous) => ({ ...previous, [key]: value })); setError("");
  };
  const toggleDone = (index: number) => {
    const markingDone = !(doneSteps[index] ?? false);
    setDoneSteps((previous) => steps.map((_, current) => current === index ? !(previous[current] ?? false) : previous[current] ?? false));
    if (markingDone && currentStep === index) {
      const nextUnfinished = steps.findIndex((_, current) => current > index && !doneSteps[current]);
      if (nextUnfinished >= 0) setCurrentStep(nextUnfinished);
    }
  };
  const nextStep = () => {
    window.speechSynthesis?.cancel(); handsFreeActive.current = false; setHandsFree(false); setCurrentStep((previous) => Math.min(steps.length - 1, previous + 1)); setVoiceState("WAITING");
  };
  const toggleHandsFree = () => {
    if (handsFree) { handsFreeActive.current = false; window.speechSynthesis?.cancel(); setHandsFree(false); setVoiceState("INTERRUPTED"); return; }
    handsFreeActive.current = true; setHandsFree(true); sayCurrentStep(true);
  };
  const stopListening = () => { recognition.current?.stop(); micLevel.stop(); if (voiceState === "LISTENING") setVoiceState("INTERRUPTED"); };
  const listen = async () => {
    voiceInteraction.current = true; window.speechSynthesis?.cancel(); setVoiceState("PROCESSING");
    const host = window as Window & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
    const SpeechRecognition = host.SpeechRecognition ?? host.webkitSpeechRecognition;
    if (!SpeechRecognition) { micLevel.markOff(); setVoiceState("WAITING"); setError("Voice input is not supported here. The first-aid steps remain available on screen."); return; }
    setError("");
    if (!await micLevel.start()) { setVoiceState("WAITING"); setError("Mic off — tap to allow microphone access. You can type details instead."); return; }
    try {
      const instance = new SpeechRecognition(); instance.lang = navigator.language || "en-US"; instance.interimResults = false; instance.maxAlternatives = 1;
      instance.onresult = (event) => { setVoiceState("PROCESSING"); const transcript = event.results[0]?.[0]?.transcript?.trim(); if (transcript) { setText(transcript); window.setTimeout(() => novaFormRef.current?.requestSubmit(), 0); } else setVoiceState("WAITING"); };
      instance.onerror = (event) => { micLevel.stop(); if (event.error === "not-allowed") micLevel.markOff(); setVoiceState("WAITING"); setError(event.error === "not-allowed" ? "Mic off — tap to allow microphone access. The first-aid steps and typed input remain available." : "Voice input stopped. You can type details instead."); };
      instance.onend = () => { micLevel.stop(); setVoiceState((current) => current === "LISTENING" ? "WAITING" : current); }; recognition.current = instance; instance.start(); setVoiceState("LISTENING");
    } catch { micLevel.stop(); setVoiceState("CONNECTION_ERROR"); setError("Could not start speech recognition. You can type details instead."); }
  };
  const addMessage = (role: Message["role"], value: string) => setMessages((previous) => [...previous, { role, text: value, at: APP_NOW_ISO }]);
  const situationSummary = [
    `What happened: ${emergency?.label ?? "not selected"}`,
    `Started: ${startedAt ? startedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "not started"}`,
    `Conscious: ${screen.responsive || "not answered"}`,
    `Breathing: ${screen.breathingNormally || "not answered"}`,
    `Heavy bleeding: ${screen.severeBleeding || "not answered"}`,
    `Steps done: ${doneSteps.filter(Boolean).length}/${steps.length}`,
    text.trim() ? `Details: ${text.trim()}` : "",
  ].filter(Boolean).join(" · ");
  const copySummary = async () => {
    try { await navigator.clipboard.writeText(`${situationSummary}\n${localSafetyLine}\nSIMULATED FIRST-AID GUIDANCE`); setError("Situation summary copied. Send it over the approved mission communication channel; this app has not sent it."); }
    catch { setError("Copy is unavailable. Read the live situation summary above over the approved mission communication channel."); }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); const report = text.trim();
    const activeType = selectedType ?? "other";
    if (!selectedType) { setSelectedType("other"); setStartedAt(new Date(APP_NOW_ISO)); setCurrentStep(0); setDoneSteps([]); }
    if (!report) { setError("Tell Nova what happened, or tap one of the situation shortcuts below."); return; }
    stopListening(); window.speechSynthesis?.cancel(); setVoiceState("PROCESSING"); addMessage("crew", report);
    const firstAction = getFirstAidSteps(activeType, breathingAnswer)[0];
    if (firstAction) speak(`First step. ${firstAction.title}. ${firstAction.instruction}`);
    const demoState = selectedCrew ? {
      astronautId: selectedCrew.id,
      records: history.slice(-180).map((record) => ({
        id: record.id, userId: record.userId, recordedAt: new Date(record.recordedAt).toISOString(), heartRate: record.heartRate ?? null,
        systolicBP: record.systolicBP ?? null, diastolicBP: record.diastolicBP ?? null, bodyTemp: record.bodyTemp ?? null,
        bloodGlucose: record.bloodGlucose ?? null, oxygenSat: record.oxygenSat ?? null, sleepDuration: record.sleepDuration ?? null,
        sleepQuality: record.sleepQuality ?? null, mood: record.mood ?? null, fatigue: record.fatigue ?? null,
        stressLevel: record.stressLevel ?? null, anxietyLevel: record.anxietyLevel ?? null, symptoms: record.symptoms ?? null,
        symptomSeverity: record.symptomSeverity ?? null, notes: record.notes ?? null, isMeasured: record.isMeasured, isSimulated: true,
      })), latestAssessment: selectedAssessment ? {
        id: selectedAssessment.id, userId: selectedAssessment.userId, status: selectedAssessment.status, summary: selectedAssessment.summary,
        details: selectedAssessment.details ?? null, guidance: selectedAssessment.guidance ?? null, flags: selectedAssessment.flags,
        createdAt: new Date(selectedAssessment.createdAt).toISOString(),
      } : null,
      activeAlerts: selectedAlerts.map((alert) => ({
        id: alert.id, userId: alert.userId, severity: alert.severity, status: alert.status, title: alert.title, message: alert.message,
        metric: "metric" in alert ? alert.metric ?? null : null, value: "value" in alert ? alert.value ?? null : null, threshold: "threshold" in alert ? alert.threshold ?? null : null,
        createdAt: new Date(alert.createdAt).toISOString(), acknowledgedAt: "acknowledgedAt" in alert && alert.acknowledgedAt ? new Date(alert.acknowledgedAt).toISOString() : null,
        acknowledgedBy: "acknowledgedBy" in alert ? alert.acknowledgedBy ?? null : null,
      })),
    } : undefined;
    const screenForApi = { responsive: screen.responsive || "UNKNOWN", breathingNormally: screen.breathingNormally || "UNKNOWN", severeBleeding: screen.severeBleeding || "UNKNOWN" };
    try {
      const response = await fetch("/api/emergency/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        identity: selectedCrew ? "OTHER_KNOWN" : "UNKNOWN", astronautId: demoState?.astronautId, screen: screenForApi,
        concern: `${EMERGENCY_TYPES.find((item) => item.id === activeType)?.label ?? "Emergency"}. ${report}. First-aid guidance has already been shown locally; add only relevant next steps. Patient: ${selectedCrew?.name ?? "no crew member selected"}. Stored allergies: ${knownAllergies?.join(", ") ?? "not recorded"}. Stored conditions: ${knownConditions?.join(", ") ?? "not recorded"}.`,
        conversationHistory: [...messages.slice(-10), { role: "crew" as const, text: report }], demoState,
      }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "AI follow-up is unavailable. Your local first-aid steps remain on screen.");
      const references = Array.isArray(payload.evidenceReferences) && payload.evidenceReferences.length ? `References: ${payload.evidenceReferences.map((item: { label: string; timestamp: string | null }) => `${item.label}${item.timestamp ? ` · ${formatAppDate(item.timestamp)}` : ""}`).join("; ")}.` : "";
      const assistantReply = [payload.reply, references, payload.nextQuestion ? `One quick question: ${payload.nextQuestion}` : "", localSafetyLine, "SIMULATED DATA · Follow the displayed first-aid steps and confirm all actions against the current mission kit and approved procedures."].filter(Boolean).join("\n\n");
      addMessage("assistant", assistantReply); speak(assistantReply); setText("");
    } catch (cause) {
      const fallback = cause instanceof Error ? cause.message : "AI follow-up is unavailable.";
      setError(`${fallback} The local ${emergency?.label.toLowerCase() ?? "first-aid"} steps remain available above; continue with them and the approved mission kit.`);
      addMessage("assistant", `AI follow-up is unavailable. Continue with the numbered first-aid steps shown on this screen.\n\n${localSafetyLine}\n\nSIMULATED DATA. The application has not contacted anyone.`);
      setVoiceState("CONNECTION_ERROR");
    }
  };
  const analyzeTestResults = async () => {
    if (!selectedType || analyzingTests) return;
    const entered = emergencyTests.flatMap((test) => {
      const entry = testResults[test.id];
      return entry?.result.trim() ? [{ ...test, result: entry.result.trim(), time: entry.time }] : [];
    });
    if (!entered.length) { setError("Enter at least one test result before asking Nova to analyze it."); return; }
    setAnalyzingTests(true); setError("");
    const testContext = entered.map((item) => `${item.label}: ${item.result}${item.time ? ` (recorded ${formatAppDateTime(item.time)})` : " (time not entered)"}`).join("; ");
    const query = `Reassess this emergency using the person's stored check-in data and the new test results. Emergency: ${emergency?.label ?? selectedType}. Started: ${startedAt?.toISOString() ?? "not recorded"}. Situation: ${situationSummary}. Patient: ${selectedCrew?.name ?? "no crew member selected"}. Stored allergies: ${knownAllergies?.join(", ") ?? "not recorded"}. Stored conditions: ${knownConditions?.join(", ") ?? "not recorded"}. Configured sample medical kit: ${SAMPLE_MEDICAL_KIT.items.map((item) => `${item.name} — ${item.dose}`).join("; ")}. Recommend only these exact listed items after allergy checks; otherwise say no medicine in the kit for this and use the physical steps. Latest stored check-in: ${latest ? JSON.stringify({ recordedAt: latest.recordedAt, heartRate: latest.heartRate, systolicBP: latest.systolicBP, diastolicBP: latest.diastolicBP, bodyTemp: latest.bodyTemp, bloodGlucose: latest.bloodGlucose, oxygenSat: latest.oxygenSat, sleepDuration: latest.sleepDuration, symptoms: latest.symptoms, notes: latest.notes }) : "No stored check-in"}. New test results: ${testContext}. Give an updated verdict, plain-language meaning, up to five next actions relevant to this emergency, warning signs, and precautions. Do not diagnose, invent measurements, tests, medicines, or doses. Preserve the first-aid steps already shown unless the results require a clear update. End urgent help guidance with contact mission medical support / the flight surgeon.`;
    const demoState = selectedCrew ? [{
      astronautId: selectedCrew.id,
      records: history.slice(-180).map((record) => ({
        id: record.id, userId: record.userId, recordedAt: new Date(record.recordedAt).toISOString(), heartRate: record.heartRate ?? null,
        systolicBP: record.systolicBP ?? null, diastolicBP: record.diastolicBP ?? null, bodyTemp: record.bodyTemp ?? null,
        bloodGlucose: record.bloodGlucose ?? null, oxygenSat: record.oxygenSat ?? null, sleepDuration: record.sleepDuration ?? null,
        sleepQuality: record.sleepQuality ?? null, mood: record.mood ?? null, fatigue: record.fatigue ?? null,
        stressLevel: record.stressLevel ?? null, anxietyLevel: record.anxietyLevel ?? null, symptoms: record.symptoms ?? null,
        symptomSeverity: record.symptomSeverity ?? null, notes: record.notes ?? null, isMeasured: record.isMeasured, isSimulated: true,
      })),
      latestAssessment: selectedAssessment ? { id: selectedAssessment.id, userId: selectedAssessment.userId, status: selectedAssessment.status, summary: selectedAssessment.summary, details: selectedAssessment.details ?? null, guidance: selectedAssessment.guidance ?? null, flags: selectedAssessment.flags, createdAt: new Date(selectedAssessment.createdAt).toISOString() } : null,
      activeAlerts: selectedAlerts.map((alert) => ({ id: alert.id, userId: alert.userId, severity: alert.severity, status: alert.status, title: alert.title, message: alert.message, metric: "metric" in alert ? alert.metric ?? null : null, value: "value" in alert ? alert.value ?? null : null, threshold: "threshold" in alert ? alert.threshold ?? null : null, createdAt: new Date(alert.createdAt).toISOString(), acknowledgedAt: "acknowledgedAt" in alert && alert.acknowledgedAt ? new Date(alert.acknowledgedAt).toISOString() : null, acknowledgedBy: "acknowledgedBy" in alert ? alert.acknowledgedBy ?? null : null })),
    }] : [];
    try {
      const response = await fetch("/api/ai/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scope: selectedCrew ? "astronaut" : "general", ...(selectedCrew ? { astronautId: selectedCrew.id } : {}), question: query, period: "30d", conversationHistory: [], demoStates: demoState }) });
      const payload = await response.json();
      if (!response.ok || !payload.analysis) throw new Error(payload.error ?? "AI analysis is unavailable. Continue the displayed first-aid steps.");
      const analysis = payload.analysis as AIHealthResponse;
      setUpdatedAnalysis(analysis); setAnalysisUpdated(true);

      if (selectedCrew) {
        const numeric = (id: string) => { const value = testResults[id]?.result.trim(); if (!value) return undefined; const match = value.match(/-?\d+(?:\.\d+)?/); return match ? Number(match[0]) : undefined; };
        const bpMatch = testResults["blood-pressure"]?.result.match(/(\d{2,3})\s*\/\s*(\d{2,3})/);
        const createdAt = APP_NOW_ISO;
        const newVitals = {
          heartRate: latest?.heartRate ?? null,
          systolicBP: bpMatch ? Number(bpMatch[1]) : latest?.systolicBP ?? null,
          diastolicBP: bpMatch ? Number(bpMatch[2]) : latest?.diastolicBP ?? null,
          bodyTemp: numeric("temperature") ?? latest?.bodyTemp ?? null,
          bloodGlucose: numeric("glucose") ?? latest?.bloodGlucose ?? null,
          oxygenSat: numeric("oxygen") ?? latest?.oxygenSat ?? null,
          sleepDuration: latest?.sleepDuration ?? null,
          sleepQuality: latest?.sleepQuality ?? null,
          mood: latest?.mood ?? null,
          fatigueLevel: latest?.fatigue ?? null,
          stressLevel: latest?.stressLevel ?? null,
          anxietyLevel: latest?.anxietyLevel ?? null,
        };
        const note = `Emergency: ${emergency?.label}. Test results: ${testContext}. Updated after your new test results — here is what changed: ${analysis.summary}`;
        const record: HealthRecord = { id: `emergency-${selectedCrew.id}-${Date.now()}`, userId: selectedCrew.id, recordedAt: createdAt, ...newVitals, symptoms: [emergency?.label, text.trim(), latest?.symptoms].filter(Boolean).join(" · ") || null, symptomSeverity: latest?.symptomSeverity ?? null, notes: [latest?.notes, note].filter(Boolean).join(" | "), isMeasured: true, isSimulated: true, measurementSource: "MANUAL_ENTRY" };
        const phaseStatus = analysis.verdict === "ACT_NOW" ? "RED" : analysis.verdict === "WATCH" ? "AMBER" : "GREEN";
        const savedAssessment = { id: `emergency-assessment-${selectedCrew.id}-${Date.now()}`, userId: selectedCrew.id, status: phaseStatus as "RED" | "AMBER" | "GREEN", summary: analysis.summary, details: analysis.whatThisCouldMean, guidance: analysis.whatToDoNow.join(" "), flags: ["EMERGENCY_SYMPTOM"], createdAt };
        const recordPayload = {
          userId: selectedCrew.id, source: "MANUAL_ENTRY" as const,
          heartRate: newVitals.heartRate, systolicBP: newVitals.systolicBP, diastolicBP: newVitals.diastolicBP,
          bodyTemp: newVitals.bodyTemp, bloodGlucose: newVitals.bloodGlucose, oxygenSat: newVitals.oxygenSat,
          sleepDuration: newVitals.sleepDuration, sleepQuality: newVitals.sleepQuality, mood: newVitals.mood,
          fatigueLevel: newVitals.fatigueLevel, stressLevel: newVitals.stressLevel, anxietyLevel: newVitals.anxietyLevel,
          symptoms: record.symptoms, notes: record.notes,
        };
        try {
          const persisted = await fetch("/api/assessments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(recordPayload) });
          if (persisted.ok) {
            const saved = await persisted.json();
            if (saved.record?.id) record.id = saved.record.id;
          }
        } catch { /* Keep the assessment in the local demo record if the database is unavailable. */ }
        addHealthRecord(record, savedAssessment, true);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "AI analysis failed. Continue the displayed first-aid steps.");
    } finally { setAnalyzingTests(false); }
  };
  const requestMedicalSupport = () => {
    setRequestStatus("LOCAL_REQUEST_RECORDED");
    addMessage("crew", "Requested medical assistance in this interface.");
    addMessage("assistant", `This request is recorded only on this screen and has not been delivered. Keep following the numbered first-aid steps and use the approved mission communication channel as soon as available.\n\n${localSafetyLine}`);
    setVoiceState("WAITING");
  };
  const toggleNovaMute = () => {
    const next = !mutedRef.current;
    mutedRef.current = next;
    setNovaMuted(next);
    if (next) { window.speechSynthesis?.cancel(); welcomePending.current = false; setVoiceState("INTERRUPTED"); }
    else if (selectedType) sayCurrentStep();
    else speakWelcome();
  };
  const close = useCallback(() => { recognition.current?.abort(); stopMicrophone(); window.speechSynthesis?.cancel(); handsFreeActive.current = false; welcomePending.current = false; setHandsFree(false); setVoiceState("IDLE"); if (fullPage) router.push(exitHref); else setOpen(false); }, [exitHref, fullPage, router, stopMicrophone]);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    dialog?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'));
      if (!focusable.length) { event.preventDefault(); dialog.focus(); return; }
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => { window.removeEventListener("keydown", onKeyDown); document.body.style.overflow = previousOverflow; previousFocus?.focus(); };
  }, [open, fullPage, close, mounted]);
  const displayMetrics = latest ? metricDefinitions.flatMap((metric) => { const value = latest[metric.key]; return typeof value === "number" ? [{ ...metric, value }] : []; }) : [];
  const sourceUrl = selectedType === "radiation" ? NASA_RADIATION_URL : selectedType === "decompression-sickness" ? NASA_DCS_URL : selectedType === "vision-change" ? NASA_SANS_URL : selectedType === "toxic-air" || selectedType === "fever-infection" ? NASA_MEDICAL_URL : selectedType === "collapsed" || selectedType === "choking" ? CPR_URL : selectedType === "burn" ? RED_CROSS_BURN : selectedType === "broken-bone" ? FRACTURE_URL : SOURCE_URL;

  return <>
    {!fullPage && <button className="emergency-btn" onClick={resetSession} aria-haspopup="dialog" aria-label="CrewCare · Demo"><AlertOctagon size={22} strokeWidth={1.9}/><span>Emergency</span></button>}
    {open && mounted && createPortal(<div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="emergency-title" className="emergency-screen" onPointerDownCapture={retryWelcomeFromGesture} onKeyDownCapture={retryWelcomeFromGesture}>
      <header className="emergency-header"><button onClick={close} className="emergency-back"><ArrowLeft size={18}/> Exit emergency assistant</button><span className="emergency-session-time">SESSION {Math.floor(elapsed / 60).toString().padStart(2, "0")}:{(elapsed % 60).toString().padStart(2, "0")}</span></header>
      <main className="emergency-main emergency-fast-main">
        <section className="nova-emergency-card emergency-card" aria-label="Nova emergency assistant">
          <div className="emergency-nova-head">
            <div className={`emergency-nova-avatar ${voiceState === "SPEAKING" ? "speaking" : ""}`} role="img" aria-label="Nova doctor assistant">
              <span className="emergency-nova-ring ring-one"/><span className="emergency-nova-ring ring-two"/>
              <svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="63" r="38" className="agent-face"/><path d="M34 44q2-19 26-19t26 19" className="agent-cap"/><path d="M51 25v-8h18v8" className="agent-cap-top"/><path d="M60 17v8m-4-4h8" className="agent-cross"/><circle cx="47" cy="62" r="3" className="agent-eye"/><circle cx="73" cy="62" r="3" className="agent-eye"/><path d="M49 75q11 10 22 0" className="agent-smile"/><path d="M27 67v15q0 13 13 13h5" className="agent-stethoscope"/><circle cx="49" cy="95" r="6" className="agent-stethoscope-head"/></svg>
            </div>
            <div className="emergency-nova-copy"><span className="emergency-demo-pill">CrewCare · Demo</span><h1 id="emergency-title">Tell Nova what happened</h1><p>This is where custom problems go. The options below are shortcuts; a real emergency may not match any of them.</p></div>
            <div className={`nova-waveform ${voiceState === "SPEAKING" ? "active" : ""}`} role="img" aria-label={voiceState === "SPEAKING" ? "Nova is speaking" : "Nova voice is idle"}><i/><i/><i/><i/><i/><i/><i/></div>
            <button type="button" className="nova-mute-button" onClick={toggleNovaMute} aria-label={novaMuted ? "Unmute Nova" : "Mute Nova"}>{novaMuted ? <Volume2 size={18}/> : <VolumeX size={18}/>}<span>{novaMuted ? "Unmute Nova" : "Mute Nova"}</span></button>
          </div>
          <form ref={novaFormRef} onSubmit={submit} className="nova-input-form">
            <textarea ref={novaInputRef} aria-label="Tell Nova what happened" value={text} onChange={(event) => setText(event.target.value)} placeholder="Type what happened…" rows={2} maxLength={1200}/>
            <div className="nova-input-actions"><div className={`nova-mic-control ${voiceState === "LISTENING" ? "is-listening" : ""}`} style={{ "--mic-level": micLevel.level } as React.CSSProperties}>
              {voiceState === "LISTENING" && <><span className="nova-mic-ring nova-mic-ring-one" style={{ transform: `scale(${1 + micLevel.level * .5})`, opacity: .08 + micLevel.level * .22 }}/><span className="nova-mic-ring nova-mic-ring-two" style={{ transform: `scale(${1 + micLevel.level * .85})`, opacity: .05 + micLevel.level * .14 }}/><span className="nova-mic-live-wave" aria-label="Live microphone level">{[.45,.8,1,.66,.9,.52,.75].map((factor,index)=><i key={index} style={{ height: `${3 + micLevel.level * 24 * factor}px` }}/>)}</span></>}
              <button type="button" onClick={voiceState === "LISTENING" ? stopListening : () => void listen()} className={`nova-mic-button ${voiceState === "LISTENING" ? "listening" : ""}`} style={voiceState === "LISTENING" ? { transform: `scale(${1 + micLevel.level * .15})`, boxShadow: `0 0 ${5 + micLevel.level * 20}px rgba(88,215,196,${.15 + micLevel.level * .48})` } : undefined} aria-pressed={voiceState === "LISTENING"} aria-label={voiceState === "LISTENING" ? "Stop voice input" : micLevel.micOff ? "Mic off — tap to allow" : "Speak to Nova"} title={micLevel.micOff ? "Mic off — tap to allow" : undefined}>{voiceState === "LISTENING" ? <MicOff size={23}/> : <Mic size={23}/>}<span>{voiceState === "LISTENING" ? "Stop" : "Speak"}</span></button>
            </div><button type="submit" className="nova-send-button" disabled={!text.trim()}><Send size={19}/> Ask Nova</button></div>
          </form>
          <div className="nova-voice-status" role="status" aria-live="polite">{voiceState === "SPEAKING" ? "Nova is speaking" : voiceState === "LISTENING" ? <><i className="nova-listening-dot"/>Listening… tap to stop</> : micLevel.micOff ? "Mic off — tap to allow. Typed input is available." : voiceState === "PROCESSING" ? "Nova is preparing a response" : "Voice guidance is ready"}</div>
          {error && <p role="alert" className="emergency-error">{error}</p>}
          {messages.length > 0 && <section className="emergency-transcript" aria-label="Nova conversation">{messages.map((message, index) => <article key={`${message.at}-${index}`} className={`emergency-message emergency-message-${message.role}`}><span>{message.role === "crew" ? "YOU" : "NOVA · SIMULATED GUIDANCE"}</span><p>{message.text}</p><time>{formatAppDateTime(message.at, { hour: "numeric", minute: "2-digit" })}</time></article>)}</section>}
        </section>

        <section className="emergency-options-section" aria-label="Emergency shortcuts"><h2>Or tap the closest situation — shortcuts</h2>
          <div className="emergency-triage-types">{EMERGENCY_TYPES.map((item) => <button key={item.id} type="button" className={`emergency-type-card ${selectedType === item.id ? "selected" : ""}`} aria-pressed={selectedType === item.id} onClick={() => { chooseEmergency(item.id); if (item.id === "other") window.setTimeout(() => novaInputRef.current?.focus(), 0); }}><span aria-hidden="true">{item.symbol}</span>{item.label}</button>)}</div>
        </section>

        <section className="emergency-people-section emergency-card" aria-label="Choose the crew member who needs help"><h2>Who needs help?</h2><p>Select a person if known. First aid starts even when nobody is selected.</p>
          {DEMO_ASTRONAUTS.length ? <div className="emergency-crew-grid">{DEMO_ASTRONAUTS.map((member) => <button key={member.id} type="button" className={`emergency-crew-card ${selectedCrewId === member.id ? "selected" : ""}`} aria-pressed={selectedCrewId === member.id} onClick={() => selectCrew(member.id)}><span className="emergency-crew-initials">{member.name.split(/\s+/).map((part) => part[0]).slice(0,2).join("")}</span><span><strong>{member.name}</strong><small>{[member.rank, member.specialty].filter(Boolean).join(" · ")}</small></span></button>)}</div> : <p className="emergency-no-crew">No crew loaded</p>}
          <button type="button" className={`emergency-crew-card emergency-unlisted-card ${someoneElse ? "selected" : ""}`} aria-pressed={someoneElse} onClick={() => selectCrew("")}><span className="emergency-crew-initials">?</span><span><strong>Someone not on the crew list</strong><small>No crew record will be attached</small></span></button>
          {selectedCrew && <div className="emergency-person-context"><strong>Profile context · {selectedCrew.name}</strong><p>Allergies: {knownAllergies?.length ? knownAllergies.join(", ") : "Not recorded in the available crew profile."}</p><p>Conditions: {knownConditions?.length ? knownConditions.join(", ") : "Not recorded in the available crew profile."}</p><p>Health record: {displayMetrics.length ? displayMetrics.map((metric) => `${metric.label} ${metric.value} ${metric.unit}`).join(" · ") : "No stored measurements available."} · {latest ? formatAppDateTime(latest.recordedAt) : "No check-in recorded"}</p>{selectedAlerts.length > 0 && <p>Stored alerts: {selectedAlerts.map((alert) => alert.title).join("; ")}</p>}<p>SIMULATED CREW DATA · Confirm allergies and conditions directly; if uncertain, do not use medicine.</p></div>}
        </section>

        {selectedType && <>
          <section className="live-situation-summary emergency-card" aria-live="polite" aria-label="Live situation summary"><div className="live-summary-title"><Clipboard size={19}/><strong>Live situation summary</strong><span>SIMULATED DATA</span></div><p>{situationSummary}</p><div className="emergency-quick-checks">{TRIAGE_QUESTIONS.map(({ key, label }) => <div className="quick-check-row" key={key}><strong>{label}</strong><div>{(["YES", "NO"] as const).map((value) => <button key={value} type="button" aria-pressed={screen[key] === value} className={`quick-answer ${screen[key] === value ? "selected" : ""}`} onClick={() => updateScreen(key, value)}>{value === "YES" ? "Yes" : "No"}</button>)}</div></div>)}</div><p className="live-summary-support">If another crew member is present, they can alert mission control while you continue these steps.</p><p className="live-summary-support">Far from Earth there is no ground support — that is why this guide gives you the steps instead of only saying call someone.</p><button type="button" className="copy-summary-button" onClick={() => void copySummary()}><Clipboard size={15}/> Copy summary</button></section>

          <div className="emergency-aid-dashboard-grid"><section ref={stepsPanelRef} className="first-aid-card emergency-card" aria-label={`${emergency?.label} first-aid steps`}><div className="emergency-active-banner">ACT NOW · {emergency?.label}</div><div className="first-aid-card-heading"><div><span className="section-kicker">SIMULATED FIRST-AID GUIDANCE</span><h2>What to do right now</h2></div><span className="steps-count" role="status" aria-live="polite">{doneSteps.filter(Boolean).length}/{steps.length} done</span></div>
            <div className="first-aid-context-row">
              {getSpaceRiskNote(selectedType) && <p className="space-risk-note"><strong>Why this matters in space:</strong> {getSpaceRiskNote(selectedType)}</p>}
              <p className="who-with-first-step">Who is this for? {selectedCrew ? `${selectedCrew.name}. ` : "You can choose a crew member above; "}First aid is already starting.</p>
            </div>
            {selectedType === "collapsed" && <div className="pace-cue" aria-label="CPR pace cue 110 compressions per minute"><span className="pace-cue-dot"/><div><strong>CPR pace cue · 110/min</strong><small>About 2 pushes each second</small></div><span className="pace-cue-beat"/></div>}
            <ol className="first-aid-steps">{steps.map((step, index) => <li key={`${index}-${step.title}`} className={`${currentStep === index ? "current-step" : ""} ${doneSteps[index] ? "completed-step" : ""}`}><span className="first-aid-step-number">{index + 1}</span><div className="first-aid-step-copy"><strong>{step.title}</strong><p>{step.instruction}</p></div><button type="button" className={`step-done-button ${doneSteps[index] ? "done" : ""}`} aria-label={`Mark step ${index + 1} ${doneSteps[index] ? "not done" : "done"}`} aria-pressed={doneSteps[index] ?? false} onClick={() => toggleDone(index)}>{doneSteps[index] ? <Check size={19}/> : <span/>}</button></li>)}</ol>
            {steps.length > 0 && doneSteps.length === steps.length && doneSteps.every(Boolean) && <p className="emergency-steps-complete" role="status" aria-live="polite"><Check size={17}/> You marked every listed step complete. Keep monitoring the person and share the situation summary when the channel allows.</p>}
            <div className="step-voice-controls"><button type="button" className="step-read-button" onClick={() => sayCurrentStep(false)}><Volume2 size={18}/> Read this step</button><button type="button" className={handsFree ? "step-handsfree-button active" : "step-handsfree-button"} onClick={toggleHandsFree}>{handsFree ? <VolumeX size={18}/> : <Volume2 size={18}/>} {handsFree ? "Stop hands-free" : "Hands-free"}</button><button type="button" className="step-next-button" disabled={currentStep >= steps.length - 1} onClick={nextStep}>Next step <ChevronRight size={19}/></button></div>
            {selectedType === "chest-pain" && <section className="medicine-check emergency-card" aria-label="Aspirin safety check"><div><span className="section-kicker">MEDICINES FROM THE KIT · ASK FIRST</span><h3>Any known aspirin allergy?</h3><p>{storedAspirinAllergy ? `Stored profile lists an aspirin allergy for ${selectedCrew?.name ?? "this person"}. Do not suggest aspirin.` : knownAllergies === null && selectedCrew ? "No allergy list is stored for this crew member. Confirm directly; if uncertain, do not use aspirin." : "Do not offer a pill until the quick checks and actual kit label are confirmed."}</p></div>
              {!storedAspirinAllergy && <div className="medicine-choice-row">{([{ value: "NO", label: "No known allergy" }, { value: "YES", label: "Allergic / unsure" }] as Array<{ value: QuickAnswer; label: string }>).map(({ value, label }) => <button key={label} type="button" className={`medicine-choice ${allergy === value ? "selected" : ""}`} aria-pressed={allergy === value} onClick={() => { setAllergy(value); setKitAspirinConfirmed(false); }}>{label}</button>)}</div>}
              {allergy === "NO" && !storedAspirinAllergy && <><div className="medicine-choice-row"><span>Conscious and able to chew/swallow?</span>{([{ value: "YES", label: "Yes" }, { value: "NO", label: "No" }] as Array<{ value: QuickAnswer; label: string }>).map(({ value, label }) => <button key={label} type="button" className={`medicine-choice ${canSwallow === value ? "selected" : ""}`} aria-pressed={canSwallow === value} onClick={() => setCanSwallow(value)}>{label}</button>)}</div><div className="medicine-choice-row"><span>Told by a health professional to avoid aspirin?</span>{([{ value: "NO", label: "No" }, { value: "YES", label: "Yes / unsure" }] as Array<{ value: QuickAnswer; label: string }>).map(({ value, label }) => <button key={label} type="button" className={`medicine-choice ${toldToAvoidAspirin === value ? "selected" : ""}`} aria-pressed={toldToAvoidAspirin === value} onClick={() => setToldToAvoidAspirin(value)}>{label}</button>)}</div><div className="kit-reference"><strong>Illustrative onboard kit list · not verified</strong><p>{SAMPLE_MEDICAL_KIT.items[0].name} · Adult dose: {SAMPLE_MEDICAL_KIT.items[0].dose}</p><small>{SAMPLE_MEDICAL_KIT.status}. Check the physical kit and current mission procedure.</small></div><label className="kit-confirm-row"><input type="checkbox" checked={kitAspirinConfirmed} onChange={(event) => setKitAspirinConfirmed(event.target.checked)}/> I checked this exact item in the onboard kit</label>{aspirinEligible ? <p className="medicine-eligible">Listed kit item: chewable aspirin 81 mg. For an alert adult with non-traumatic chest pain, the adult first-aid reference dose is 162–324 mg (2–4 tablets). Follow the confirmed kit label and mission procedure.</p> : <p className="medicine-no-dose">No medicine yet. Confirm the allergy, alertness, kit item, and mission procedure first; if uncertain, do not use it.</p>}</>}
              {(allergy === "YES" || storedAspirinAllergy) && <p className="medicine-no-dose">No aspirin for this person. Continue the physical steps.</p>}
            </section>}
            <p className="first-aid-safety-line">{localSafetyLine}</p><p className="first-aid-help-note">Final step: Alert mission control / contact mission medical support as soon as the channel allows. A crewmate can do this in parallel while first aid continues.</p><a className="first-aid-source" href={sourceUrl} target="_blank" rel="noreferrer">Reference: NASA / first-aid guidance</a>
          </section><BodyTrendDashboard mode="emergency" person={selectedCrew} records={selectedCrew ? history : []} assessmentStatus={selectedCrew ? selectedAssessment?.status : null} emergencyType={selectedType} onEmergencyPartClick={() => stepsPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}/></div>
          <section className="emergency-card emergency-followup-card"><span className="section-kicker">AFTER FIRST AID</span><h2>Medicines from the kit</h2><p>Simulated sample kit — not verified onboard inventory.</p>{selectedType === "chest-pain" ? <><p>The only listed sample-kit medicine is for the chest-pain guidance. Check the allergy, alertness, swallowing, and exact physical kit item in the medicine check above before considering it.</p><p><strong>{SAMPLE_MEDICAL_KIT.items[0].name}</strong><br/>{SAMPLE_MEDICAL_KIT.items[0].dose}</p><small>{SAMPLE_MEDICAL_KIT.status}. This is a simulated list, not a verified spacecraft inventory.</small></> : <><p>No medicine in the kit for this — do the physical steps.</p><p>Stored allergies: {knownAllergies?.length ? knownAllergies.join(", ") : selectedCrew ? "No allergy information is stored; confirm directly." : "Select a crew member to check stored allergies."}</p></>}</section>
          <section className="emergency-card emergency-followup-card"><span className="section-kicker">FOLLOW-UP CHECKS</span><h2>Tests we should do</h2><p>Enter only results you have actually measured or recorded. The result and time are optional until you are ready to analyze.</p><div className="emergency-test-list">{emergencyTests.map((test) => <div className="emergency-test-row" key={test.id}><label><strong>{test.label}</strong><input value={testResults[test.id]?.result ?? ""} onChange={(event) => setTestResults((previous) => ({ ...previous, [test.id]: { result: event.target.value, time: previous[test.id]?.time ?? "" } }))} placeholder={test.placeholder}/></label><label><span>Time</span><input type="datetime-local" value={testResults[test.id]?.time ?? ""} onChange={(event) => setTestResults((previous) => ({ ...previous, [test.id]: { result: previous[test.id]?.result ?? "", time: event.target.value } }))}/></label></div>)}</div><button type="button" className="step-next-button" disabled={analyzingTests || !Object.values(testResults).some((entry) => entry.result.trim())} onClick={() => void analyzeTestResults()}>{analyzingTests ? "Analyzing results…" : "Analyze my results"}</button></section>
          <section className="emergency-card emergency-followup-card"><span className="section-kicker">SAFETY NOTES</span><h2>Precautions</h2><div className="emergency-precaution-grid"><div><h3>What not to do</h3><ul>{steps.filter((step) => /do not|don't|avoid|never|no medicine/i.test(`${step.title} ${step.instruction}`)).slice(0, 5).map((step) => <li key={step.title}>{step.instruction}</li>)}{!steps.some((step) => /do not|don't|avoid|never|no medicine/i.test(`${step.title} ${step.instruction}`)) && <li>Do not use a medicine unless it is listed, allergy-checked, and confirmed in the kit.</li>}</ul></div><div><h3>What to watch for</h3><ul>{steps.filter((step) => /watch|urgent|danger|breathing|worsen|immediately|alert/i.test(`${step.title} ${step.instruction}`)).slice(0, 5).map((step) => <li key={step.title}>{step.instruction}</li>)}{!steps.some((step) => /watch|urgent|danger|breathing|worsen|immediately|alert/i.test(`${step.title} ${step.instruction}`)) && <li>Watch for any change in the person&apos;s condition and follow the mission procedure.</li>}</ul></div></div></section>
          {updatedAnalysis && <section className="emergency-card emergency-followup-card emergency-ai-update" aria-live="polite"><div className="emergency-ai-update-heading"><span className={`status-badge ${updatedAnalysis.verdict === "ACT_NOW" ? "status-red" : updatedAnalysis.verdict === "WATCH" ? "status-amber" : "status-green"}`}>{updatedAnalysis.verdict === "ACT_NOW" ? "Act now" : updatedAnalysis.verdict === "WATCH" ? "Needs attention" : "All clear"}</span><span>SIMULATED AI REVIEW</span></div><h2>Updated after your new test results — here is what changed</h2><p>{updatedAnalysis.whatThisCouldMean}</p><h3>Updated next steps</h3><ol>{updatedAnalysis.whatToDoNow.map((item, index) => <li key={index}>{item}</li>)}</ol><h3>Updated precautions · what to watch for</h3><ul>{updatedAnalysis.watchOutFor.map((item, index) => <li key={index}>{item}</li>)}</ul><h3>When to get help immediately</h3><p>{updatedAnalysis.whenToGetHelpImmediately}</p><small>{localSafetyLine}</small></section>}
        </>}

        <section className="emergency-help-actions emergency-card"><div><strong>Use another channel in parallel</strong><p>Ask a crewmate to contact mission control while first aid continues. No alert is transmitted by this app.</p></div><button className="emergency-screen-submit emergency-support-button" type="button" onClick={requestMedicalSupport}>{requestStatus === "LOCAL_REQUEST_RECORDED" ? "Request recorded on this screen" : "Record a local support request"}</button></section>
        <p className="emergency-human-status"><strong>Human support:</strong> Not connected. Use your approved mission communication channel when it is available.</p>
      </main>
    </div>, document.body)}
  </>;
}
