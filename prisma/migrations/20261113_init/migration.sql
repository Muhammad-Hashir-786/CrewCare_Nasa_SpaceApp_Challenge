-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ASTRONAUT', 'MISSION_CONTROL', 'MEDICAL_OFFICER');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('GREEN', 'AMBER', 'RED');

-- CreateEnum
CREATE TYPE "HealthCategory" AS ENUM ('NORMAL', 'ATTENTION', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "MoodLevel" AS ENUM ('VERY_LOW', 'LOW', 'NEUTRAL', 'GOOD', 'EXCELLENT');

-- CreateEnum
CREATE TYPE "FatigueLevel" AS ENUM ('EXHAUSTED', 'VERY_TIRED', 'TIRED', 'MODERATE', 'REFRESHED');

-- CreateEnum
CREATE TYPE "MeasurementSource" AS ENUM ('MANUAL_ENTRY', 'SIMULATED_SENSOR', 'WEARABLE');

-- CreateEnum
CREATE TYPE "RecommendationStatus" AS ENUM ('ACTIVE', 'ACKNOWLEDGED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "RecommendationPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "AnalyticsDirection" AS ENUM ('INSUFFICIENT', 'INCREASING', 'DECREASING', 'STABLE');

-- CreateEnum
CREATE TYPE "AnalyticsPriority" AS ENUM ('LOW', 'MODERATE', 'HIGH');

-- CreateEnum
CREATE TYPE "AnomalyDetectionMethod" AS ENUM ('ROBUST_Z_SCORE', 'INTERQUARTILE_RANGE');

-- CreateEnum
CREATE TYPE "AnomalySeverity" AS ENUM ('LOW', 'MODERATE', 'HIGH');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "callsign" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "rank" TEXT,
    "specialty" TEXT,
    "avatarUrl" TEXT,
    "missionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mission" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "heartRate" DOUBLE PRECISION,
    "systolicBP" DOUBLE PRECISION,
    "diastolicBP" DOUBLE PRECISION,
    "bodyTemp" DOUBLE PRECISION,
    "bloodGlucose" DOUBLE PRECISION,
    "oxygenSat" DOUBLE PRECISION,
    "sleepDuration" DOUBLE PRECISION,
    "sleepQuality" DOUBLE PRECISION,
    "mood" "MoodLevel",
    "fatigue" "FatigueLevel",
    "stressLevel" DOUBLE PRECISION,
    "anxietyLevel" DOUBLE PRECISION,
    "symptoms" TEXT,
    "symptomSeverity" TEXT,
    "notes" TEXT,
    "isMeasured" BOOLEAN NOT NULL DEFAULT false,
    "isSimulated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyCheckIn" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "checkInDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mood" "MoodLevel",
    "fatigue" "FatigueLevel",
    "sleepDuration" DOUBLE PRECISION,
    "sleepQuality" DOUBLE PRECISION,
    "stressLevel" DOUBLE PRECISION,
    "anxietyLevel" DOUBLE PRECISION,
    "symptoms" TEXT,
    "symptomSeverity" TEXT,
    "notes" TEXT,
    "overallFeeling" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyCheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "healthRecordId" TEXT,
    "status" "AssessmentStatus" NOT NULL,
    "summary" TEXT NOT NULL,
    "details" TEXT,
    "guidance" TEXT,
    "flags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'ACTIVE',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metric" TEXT,
    "value" DOUBLE PRECISION,
    "threshold" DOUBLE PRECISION,
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthMeasurement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "indicator" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "source" "MeasurementSource" NOT NULL DEFAULT 'MANUAL_ENTRY',
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "healthAssessmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthMeasurement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthAssessment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "overallCategory" "HealthCategory" NOT NULL,
    "overallStatus" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "details" TEXT,
    "guidance" TEXT,
    "flags" TEXT[],
    "hasEmergency" BOOLEAN NOT NULL DEFAULT false,
    "dataCompleteness" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentFinding" (
    "id" TEXT NOT NULL,
    "healthAssessmentId" TEXT NOT NULL,
    "indicator" TEXT NOT NULL,
    "category" "HealthCategory" NOT NULL,
    "ruleKey" TEXT NOT NULL,
    "value" DOUBLE PRECISION,
    "unit" TEXT,
    "threshold" DOUBLE PRECISION,
    "explanation" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssessmentFinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthRecommendation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "healthAssessmentId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" "RecommendationPriority" NOT NULL,
    "indicator" TEXT,
    "reason" TEXT NOT NULL,
    "suggestedAction" TEXT NOT NULL,
    "status" "RecommendationStatus" NOT NULL DEFAULT 'ACTIVE',
    "acknowledgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "missionId" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceRecordCount" INTEGER NOT NULL DEFAULT 0,
    "isSimulated" BOOLEAN NOT NULL DEFAULT false,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthBaseline" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "indicator" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "measurementCount" INTEGER NOT NULL,
    "minimumRequired" INTEGER NOT NULL,
    "sufficient" BOOLEAN NOT NULL,
    "mean" DOUBLE PRECISION,
    "median" DOUBLE PRECISION,
    "standardDeviation" DOUBLE PRECISION,
    "minimum" DOUBLE PRECISION,
    "maximum" DOUBLE PRECISION,
    "rollingAverage" DOUBLE PRECISION,
    "interpretation" TEXT,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthBaseline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthTrend" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "indicator" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "measurementCount" INTEGER NOT NULL,
    "expectedDays" INTEGER,
    "completeness" DOUBLE PRECISION NOT NULL,
    "startingValue" DOUBLE PRECISION,
    "latestValue" DOUBLE PRECISION,
    "average" DOUBLE PRECISION,
    "percentChange" DOUBLE PRECISION,
    "direction" "AnalyticsDirection" NOT NULL,
    "explanation" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthTrend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthAnomaly" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceRecordId" TEXT,
    "indicator" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "actualValue" DOUBLE PRECISION NOT NULL,
    "expectedMinimum" DOUBLE PRECISION NOT NULL,
    "expectedMaximum" DOUBLE PRECISION NOT NULL,
    "method" "AnomalyDetectionMethod" NOT NULL,
    "severity" "AnomalySeverity" NOT NULL,
    "deviationScore" DOUBLE PRECISION NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "repeated" BOOLEAN NOT NULL DEFAULT false,
    "explanation" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthAnomaly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthPattern" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priority" "AnalyticsPriority" NOT NULL,
    "indicators" TEXT[],
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "reliability" DOUBLE PRECISION NOT NULL,
    "evidence" JSONB NOT NULL,
    "explanation" TEXT NOT NULL,
    "suggestedFollowUp" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthPattern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthForecast" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "indicator" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "forecastDate" TIMESTAMP(3) NOT NULL,
    "projectedValue" DOUBLE PRECISION NOT NULL,
    "lowerBound" DOUBLE PRECISION NOT NULL,
    "upperBound" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "sourcePoints" INTEGER NOT NULL,
    "sourceStart" TIMESTAMP(3) NOT NULL,
    "sourceEnd" TIMESTAMP(3) NOT NULL,
    "explanation" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthForecast_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_callsign_key" ON "User"("callsign");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_missionId_idx" ON "User"("missionId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Mission_code_key" ON "Mission"("code");

-- CreateIndex
CREATE INDEX "HealthRecord_userId_idx" ON "HealthRecord"("userId");

-- CreateIndex
CREATE INDEX "HealthRecord_recordedAt_idx" ON "HealthRecord"("recordedAt");

-- CreateIndex
CREATE INDEX "DailyCheckIn_userId_idx" ON "DailyCheckIn"("userId");

-- CreateIndex
CREATE INDEX "DailyCheckIn_checkInDate_idx" ON "DailyCheckIn"("checkInDate");

-- CreateIndex
CREATE INDEX "Assessment_userId_idx" ON "Assessment"("userId");

-- CreateIndex
CREATE INDEX "Assessment_status_idx" ON "Assessment"("status");

-- CreateIndex
CREATE INDEX "Alert_userId_idx" ON "Alert"("userId");

-- CreateIndex
CREATE INDEX "Alert_status_idx" ON "Alert"("status");

-- CreateIndex
CREATE INDEX "Alert_severity_idx" ON "Alert"("severity");

-- CreateIndex
CREATE INDEX "ActivityLog_userId_idx" ON "ActivityLog"("userId");

-- CreateIndex
CREATE INDEX "HealthMeasurement_userId_idx" ON "HealthMeasurement"("userId");

-- CreateIndex
CREATE INDEX "HealthMeasurement_indicator_idx" ON "HealthMeasurement"("indicator");

-- CreateIndex
CREATE INDEX "HealthMeasurement_recordedAt_idx" ON "HealthMeasurement"("recordedAt");

-- CreateIndex
CREATE INDEX "HealthAssessment_userId_idx" ON "HealthAssessment"("userId");

-- CreateIndex
CREATE INDEX "HealthAssessment_overallCategory_idx" ON "HealthAssessment"("overallCategory");

-- CreateIndex
CREATE INDEX "HealthAssessment_assessedAt_idx" ON "HealthAssessment"("assessedAt");

-- CreateIndex
CREATE INDEX "AssessmentFinding_healthAssessmentId_idx" ON "AssessmentFinding"("healthAssessmentId");

-- CreateIndex
CREATE INDEX "AssessmentFinding_indicator_idx" ON "AssessmentFinding"("indicator");

-- CreateIndex
CREATE INDEX "HealthRecommendation_userId_idx" ON "HealthRecommendation"("userId");

-- CreateIndex
CREATE INDEX "HealthRecommendation_status_idx" ON "HealthRecommendation"("status");

-- CreateIndex
CREATE INDEX "HealthRecommendation_priority_idx" ON "HealthRecommendation"("priority");

-- CreateIndex
CREATE INDEX "AnalyticsReport_userId_generatedAt_idx" ON "AnalyticsReport"("userId", "generatedAt");

-- CreateIndex
CREATE INDEX "AnalyticsReport_missionId_generatedAt_idx" ON "AnalyticsReport"("missionId", "generatedAt");

-- CreateIndex
CREATE INDEX "HealthBaseline_userId_indicator_calculatedAt_idx" ON "HealthBaseline"("userId", "indicator", "calculatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "HealthBaseline_reportId_indicator_key" ON "HealthBaseline"("reportId", "indicator");

-- CreateIndex
CREATE INDEX "HealthTrend_userId_indicator_generatedAt_idx" ON "HealthTrend"("userId", "indicator", "generatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "HealthTrend_reportId_indicator_period_key" ON "HealthTrend"("reportId", "indicator", "period");

-- CreateIndex
CREATE INDEX "HealthAnomaly_userId_indicator_recordedAt_idx" ON "HealthAnomaly"("userId", "indicator", "recordedAt");

-- CreateIndex
CREATE INDEX "HealthAnomaly_userId_severity_recordedAt_idx" ON "HealthAnomaly"("userId", "severity", "recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "HealthAnomaly_reportId_sourceRecordId_indicator_key" ON "HealthAnomaly"("reportId", "sourceRecordId", "indicator");

-- CreateIndex
CREATE INDEX "HealthPattern_userId_priority_createdAt_idx" ON "HealthPattern"("userId", "priority", "createdAt");

-- CreateIndex
CREATE INDEX "HealthPattern_userId_category_createdAt_idx" ON "HealthPattern"("userId", "category", "createdAt");

-- CreateIndex
CREATE INDEX "HealthForecast_userId_indicator_forecastDate_idx" ON "HealthForecast"("userId", "indicator", "forecastDate");

-- CreateIndex
CREATE UNIQUE INDEX "HealthForecast_reportId_indicator_forecastDate_key" ON "HealthForecast"("reportId", "indicator", "forecastDate");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthRecord" ADD CONSTRAINT "HealthRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyCheckIn" ADD CONSTRAINT "DailyCheckIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_healthRecordId_fkey" FOREIGN KEY ("healthRecordId") REFERENCES "HealthRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthMeasurement" ADD CONSTRAINT "HealthMeasurement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthMeasurement" ADD CONSTRAINT "HealthMeasurement_healthAssessmentId_fkey" FOREIGN KEY ("healthAssessmentId") REFERENCES "HealthAssessment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthAssessment" ADD CONSTRAINT "HealthAssessment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentFinding" ADD CONSTRAINT "AssessmentFinding_healthAssessmentId_fkey" FOREIGN KEY ("healthAssessmentId") REFERENCES "HealthAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthRecommendation" ADD CONSTRAINT "HealthRecommendation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthRecommendation" ADD CONSTRAINT "HealthRecommendation_healthAssessmentId_fkey" FOREIGN KEY ("healthAssessmentId") REFERENCES "HealthAssessment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsReport" ADD CONSTRAINT "AnalyticsReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsReport" ADD CONSTRAINT "AnalyticsReport_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthBaseline" ADD CONSTRAINT "HealthBaseline_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "AnalyticsReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthBaseline" ADD CONSTRAINT "HealthBaseline_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthTrend" ADD CONSTRAINT "HealthTrend_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "AnalyticsReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthTrend" ADD CONSTRAINT "HealthTrend_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthAnomaly" ADD CONSTRAINT "HealthAnomaly_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "AnalyticsReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthAnomaly" ADD CONSTRAINT "HealthAnomaly_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthAnomaly" ADD CONSTRAINT "HealthAnomaly_sourceRecordId_fkey" FOREIGN KEY ("sourceRecordId") REFERENCES "HealthRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthPattern" ADD CONSTRAINT "HealthPattern_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "AnalyticsReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthPattern" ADD CONSTRAINT "HealthPattern_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthForecast" ADD CONSTRAINT "HealthForecast_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "AnalyticsReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthForecast" ADD CONSTRAINT "HealthForecast_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
