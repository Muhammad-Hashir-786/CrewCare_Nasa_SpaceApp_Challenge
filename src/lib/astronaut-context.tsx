"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { DEMO_ASTRONAUTS } from "@/lib/demo-data";
import type { Alert, Astronaut } from "@/types";
import { clampToAppToday, mergeAlertState, mergeDailyRecords, upsertDailyRecords } from "@/lib/health/checkin-store";

interface AstronautContextValue {
  astronaut: Astronaut;
  setAstronautId: (id: string) => void;
  addHealthRecord: (record: NonNullable<Astronaut["healthRecords"]>[number], assessment: NonNullable<Astronaut["latestAssessment"]>, persistDemo: boolean) => void;
}

const AstronautContext = createContext<AstronautContextValue>({
  astronaut: DEMO_ASTRONAUTS[0],
  setAstronautId: () => {},
  addHealthRecord: () => {},
});

export function AstronautProvider({ children, astronauts = DEMO_ASTRONAUTS }: { children: React.ReactNode; astronauts?: Astronaut[] }) {
  const [crew, setCrew] = useState(astronauts);
  const [id, setId] = useState<string>(astronauts[0]?.id ?? DEMO_ASTRONAUTS[0].id);

  // Persist selection across page loads
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = localStorage.getItem("crewcare_astronaut_id");
      const savedCallsign = localStorage.getItem("crewcare_astronaut_callsign")?.toUpperCase();
      const sessionMember = savedCallsign ? astronauts.find((member) => member.callsign.toUpperCase() === savedCallsign) : undefined;
      const idMember = saved ? astronauts.find((member) => member.id === saved) : undefined;
      if (sessionMember ?? idMember) setId((sessionMember ?? idMember)!.id);
      setCrew(astronauts.map((member) => {
        let healthRecords = member.healthRecords ?? [];
        const stored = localStorage.getItem(`crewcare_checkins_${member.id}`);
        if (stored) try {
          const records = JSON.parse(stored);
          if (Array.isArray(records)) {
            healthRecords = mergeDailyRecords(healthRecords, records.filter((record: { id?: string }) => record?.id));
          }
        } catch { /* Ignore malformed local demo records. */ }
        let latestAssessment = member.latestAssessment;
        try {
          const storedAssessment = JSON.parse(localStorage.getItem(`crewcare_assessment_${member.id}`) ?? "null");
          const savedAssessment = storedAssessment?.createdAt ? { ...storedAssessment, createdAt: clampToAppToday(storedAssessment.createdAt).toISOString() } : storedAssessment;
          if (savedAssessment?.id && (!latestAssessment || new Date(savedAssessment.createdAt).getTime() >= new Date(latestAssessment.createdAt).getTime())) latestAssessment = savedAssessment;
        } catch { /* Ignore malformed local demo assessment. */ }
        let activeAlerts = member.activeAlerts ?? [];
        try {
          const savedAlerts = JSON.parse(localStorage.getItem(`crewcare_demo_alerts_${member.id}`) ?? "[]") as Alert[];
          activeAlerts = mergeAlertState(activeAlerts, savedAlerts).filter((alert) => alert.status === "ACTIVE");
        } catch { /* Ignore malformed local demo alerts. */ }
        return { ...member, healthRecords, latestAssessment, activeAlerts };
      }));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [astronauts]);

  const setAstronautId = (newId: string) => {
    const member = crew.find((candidate) => candidate.id === newId);
    if (!member) return;
    setId(member.id);
    if (typeof window !== "undefined") {
      localStorage.setItem("crewcare_astronaut_id", newId);
      localStorage.setItem("crewcare_astronaut_callsign", member.callsign);
    }
  };

  const addHealthRecord: AstronautContextValue["addHealthRecord"] = (record, assessment, persistDemo) => {
    const isCritical = assessment.flags.some((flag) => flag === "EMERGENCY_SYMPTOM" || flag.endsWith("_CRITICAL"));
    const demoAlert: Alert | null = persistDemo && assessment.status === "RED" ? {
      id: `demo-alert-${assessment.id}`, userId: record.userId, severity: isCritical ? "CRITICAL" : "HIGH", status: "ACTIVE",
      title: isCritical ? "Critical demo assessment — immediate review" : "Warning demo assessment — review required",
      message: `${assessment.summary} ${assessment.details ?? ""} ${assessment.guidance ?? ""}`.trim(),
      metric: assessment.flags[0] ?? "healthAssessment", createdAt: clampToAppToday(assessment.createdAt).toISOString(),
    } : null;
    setCrew((members) => members.map((member) => member.id === record.userId ? {
      ...member,
      healthRecords: upsertDailyRecords(member.healthRecords ?? [], record),
      latestAssessment: assessment,
      activeAlerts: demoAlert ? [...(member.activeAlerts ?? []).filter((alert) => alert.id !== demoAlert.id), demoAlert] : member.activeAlerts,
    } : member));
    if (persistDemo && typeof window !== "undefined") {
      const key = `crewcare_checkins_${record.userId}`;
      try {
        const previous = JSON.parse(localStorage.getItem(key) ?? "[]");
        localStorage.setItem(key, JSON.stringify(upsertDailyRecords(previous, record).slice(-180)));
      } catch { localStorage.setItem(key, JSON.stringify([record])); }
      localStorage.setItem(`crewcare_assessment_${record.userId}`, JSON.stringify(assessment));
      if (demoAlert) {
        const alertKey = `crewcare_demo_alerts_${record.userId}`;
        try {
          const alerts = JSON.parse(localStorage.getItem(alertKey) ?? "[]") as Alert[];
          localStorage.setItem(alertKey, JSON.stringify([...alerts.filter((item) => item.id !== demoAlert.id), demoAlert]));
        } catch { localStorage.setItem(alertKey, JSON.stringify([demoAlert])); }
      }
    }
  };

  const astronaut = crew.find((a) => a.id === id) ?? crew[0] ?? DEMO_ASTRONAUTS[0];

  return (
    <AstronautContext.Provider value={{ astronaut, setAstronautId, addHealthRecord }}>
      {children}
    </AstronautContext.Provider>
  );
}

export function useAstronaut() {
  return useContext(AstronautContext);
}
