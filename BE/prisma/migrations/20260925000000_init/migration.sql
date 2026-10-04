-- CreateTable
CREATE TABLE `lead` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NULL,
    `placeId` VARCHAR(255) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `category` VARCHAR(255) NULL,
    `primaryType` VARCHAR(255) NULL,
    `address` TEXT NULL,
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `phone` VARCHAR(100) NULL,
    `internationalPhone` VARCHAR(100) NULL,
    `website` TEXT NULL,
    `googleMapsUrl` TEXT NULL,
    `rating` DOUBLE NULL,
    `reviewCount` INTEGER NOT NULL DEFAULT 0,
    `businessStatus` VARCHAR(100) NULL,
    `websiteExists` BOOLEAN NOT NULL DEFAULT false,
    `leadScore` INTEGER NOT NULL DEFAULT 0,
    `opportunitySummary` TEXT NULL,
    `agentVersion` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `lead_organizationId_createdAt_idx`(`organizationId`, `createdAt`),
    INDEX `lead_name_idx`(`name`),
    INDEX `lead_rating_idx`(`rating`),
    INDEX `lead_reviewCount_idx`(`reviewCount`),
    INDEX `lead_leadScore_idx`(`leadScore`),
    INDEX `lead_websiteExists_idx`(`websiteExists`),
    UNIQUE INDEX `lead_organizationId_placeId_key`(`organizationId`, `placeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `review` (
    `id` VARCHAR(191) NOT NULL,
    `leadId` VARCHAR(191) NOT NULL,
    `author` VARCHAR(255) NULL,
    `rating` DOUBLE NULL,
    `comment` TEXT NULL,
    `publishedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `review_leadId_idx`(`leadId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `leadsearch` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NULL,
    `keyword` VARCHAR(255) NOT NULL,
    `location` VARCHAR(255) NOT NULL,
    `radius` INTEGER NULL,
    `minimumRating` DOUBLE NULL,
    `websiteFilter` ENUM('ANY', 'HAS_WEBSITE', 'NO_WEBSITE') NOT NULL DEFAULT 'ANY',
    `requestedCount` INTEGER NOT NULL DEFAULT 20,
    `resultCount` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `errorMessage` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `leadsearch_organizationId_createdAt_idx`(`organizationId`, `createdAt`),
    INDEX `leadsearch_createdAt_idx`(`createdAt`),
    INDEX `leadsearch_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `searchlead` (
    `searchId` VARCHAR(191) NOT NULL,
    `leadId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `searchlead_leadId_idx`(`leadId`),
    PRIMARY KEY (`searchId`, `leadId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Organization` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `email` VARCHAR(254) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `role` ENUM('ADMIN', 'OPERATOR', 'VIEWER') NOT NULL DEFAULT 'OPERATOR',
    `disabled` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    INDEX `User_organizationId_idx`(`organizationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Session` (
    `id` VARCHAR(191) NOT NULL,
    `tokenHash` CHAR(64) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Session_tokenHash_key`(`tokenHash`),
    INDEX `Session_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Campaign` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `config` JSON NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `status` ENUM('DRAFT', 'ACTIVE', 'PAUSED') NOT NULL DEFAULT 'DRAFT',
    `nextRunAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Campaign_organizationId_createdAt_idx`(`organizationId`, `createdAt`),
    INDEX `Campaign_status_nextRunAt_idx`(`status`, `nextRunAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AutomationRun` (
    `id` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NOT NULL,
    `requestKey` VARCHAR(100) NOT NULL,
    `config` JSON NOT NULL,
    `campaignVersion` INTEGER NOT NULL,
    `status` ENUM('QUEUED', 'RUNNING', 'WAITING', 'COMPLETED', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'QUEUED',
    `stage` VARCHAR(40) NOT NULL DEFAULT 'DISCOVERY',
    `searchId` VARCHAR(191) NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `aiCalls` INTEGER NOT NULL DEFAULT 0,
    `googleCalls` INTEGER NOT NULL DEFAULT 0,
    `discoveryData` JSON NULL,
    `leaseToken` VARCHAR(64) NULL,
    `leaseUntil` DATETIME(3) NULL,
    `availableAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `errorCode` VARCHAR(100) NULL,
    `errorMessage` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `finishedAt` DATETIME(3) NULL,

    INDEX `AutomationRun_status_availableAt_leaseUntil_idx`(`status`, `availableAt`, `leaseUntil`),
    UNIQUE INDEX `AutomationRun_campaignId_requestKey_key`(`campaignId`, `requestKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LeadAssessment` (
    `id` VARCHAR(191) NOT NULL,
    `runId` VARCHAR(191) NOT NULL,
    `leadId` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'REVIEW', 'APPROVED', 'REJECTED', 'ERROR') NOT NULL DEFAULT 'PENDING',
    `decision` VARCHAR(40) NULL,
    `reason` TEXT NULL,
    `evidence` JSON NULL,
    `toolTrace` JSON NULL,
    `source` VARCHAR(40) NULL,
    `subject` VARCHAR(200) NULL,
    `body` TEXT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `approvedBy` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `LeadAssessment_runId_status_idx`(`runId`, `status`),
    UNIQUE INDEX `LeadAssessment_runId_leadId_key`(`runId`, `leadId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RunEvent` (
    `id` VARCHAR(191) NOT NULL,
    `runId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(60) NOT NULL,
    `message` VARCHAR(500) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `RunEvent_runId_createdAt_idx`(`runId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AgentJob` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `leadId` VARCHAR(191) NULL,
    `automationRunId` VARCHAR(191) NULL,
    `assessmentId` VARCHAR(191) NULL,
    `type` ENUM('RESEARCH', 'QUALIFICATION', 'CONTACT_ENRICHMENT', 'OUTREACH', 'FOLLOW_UP', 'ANALYTICS') NOT NULL,
    `status` ENUM('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'QUEUED',
    `idempotencyKey` VARCHAR(191) NOT NULL,
    `inputJson` JSON NOT NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `maxAttempts` INTEGER NOT NULL DEFAULT 3,
    `runAfter` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `leaseToken` VARCHAR(64) NULL,
    `leaseUntil` DATETIME(3) NULL,
    `errorCode` VARCHAR(100) NULL,
    `errorMessage` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `finishedAt` DATETIME(3) NULL,

    INDEX `AgentJob_status_runAfter_leaseUntil_idx`(`status`, `runAfter`, `leaseUntil`),
    INDEX `AgentJob_leadId_type_createdAt_idx`(`leadId`, `type`, `createdAt`),
    INDEX `AgentJob_automationRunId_status_idx`(`automationRunId`, `status`),
    UNIQUE INDEX `AgentJob_organizationId_idempotencyKey_key`(`organizationId`, `idempotencyKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AgentRun` (
    `id` VARCHAR(191) NOT NULL,
    `jobId` VARCHAR(191) NOT NULL,
    `status` ENUM('SUCCEEDED', 'FAILED') NOT NULL,
    `model` VARCHAR(191) NOT NULL,
    `promptVersion` VARCHAR(50) NOT NULL,
    `inputJson` JSON NOT NULL,
    `outputJson` JSON NULL,
    `latencyMs` INTEGER NOT NULL,
    `inputTokens` INTEGER NULL,
    `outputTokens` INTEGER NULL,
    `errorCode` VARCHAR(100) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AgentRun_jobId_createdAt_idx`(`jobId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LeadResearch` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `leadId` VARCHAR(191) NOT NULL,
    `jobId` VARCHAR(191) NOT NULL,
    `version` INTEGER NOT NULL,
    `summary` TEXT NOT NULL,
    `signals` JSON NOT NULL,
    `evidence` JSON NOT NULL,
    `missingFields` JSON NOT NULL,
    `confidence` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `LeadResearch_organizationId_leadId_createdAt_idx`(`organizationId`, `leadId`, `createdAt`),
    UNIQUE INDEX `LeadResearch_leadId_version_key`(`leadId`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LeadQualification` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `leadId` VARCHAR(191) NOT NULL,
    `researchId` VARCHAR(191) NOT NULL,
    `jobId` VARCHAR(191) NOT NULL,
    `version` INTEGER NOT NULL,
    `score` INTEGER NOT NULL,
    `fit` ENUM('LOW', 'MEDIUM', 'HIGH') NOT NULL,
    `reasons` JSON NOT NULL,
    `risks` JSON NOT NULL,
    `recommendedAction` VARCHAR(100) NOT NULL,
    `confidence` DOUBLE NOT NULL,
    `rubricVersion` VARCHAR(50) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `LeadQualification_organizationId_leadId_createdAt_idx`(`organizationId`, `leadId`, `createdAt`),
    INDEX `LeadQualification_researchId_idx`(`researchId`),
    UNIQUE INDEX `LeadQualification_leadId_version_key`(`leadId`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LeadApproval` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `leadId` VARCHAR(191) NOT NULL,
    `stage` ENUM('LEAD', 'OUTREACH') NOT NULL,
    `version` INTEGER NOT NULL,
    `decision` ENUM('APPROVED', 'REJECTED') NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `note` VARCHAR(1000) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `LeadApproval_leadId_stage_createdAt_idx`(`leadId`, `stage`, `createdAt`),
    UNIQUE INDEX `LeadApproval_organizationId_leadId_stage_version_key`(`organizationId`, `leadId`, `stage`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LeadContact` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `leadId` VARCHAR(191) NOT NULL,
    `jobId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NULL,
    `email` VARCHAR(320) NOT NULL,
    `role` VARCHAR(191) NULL,
    `source` VARCHAR(100) NOT NULL,
    `confidence` DOUBLE NOT NULL,
    `verificationStatus` VARCHAR(50) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `LeadContact_leadId_confidence_idx`(`leadId`, `confidence`),
    UNIQUE INDEX `LeadContact_organizationId_leadId_email_key`(`organizationId`, `leadId`, `email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OutreachDraft` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `leadId` VARCHAR(191) NOT NULL,
    `qualificationId` VARCHAR(191) NOT NULL,
    `jobId` VARCHAR(191) NOT NULL,
    `recipientEmail` VARCHAR(320) NULL,
    `recipientName` VARCHAR(191) NULL,
    `subject` VARCHAR(200) NOT NULL,
    `body` TEXT NOT NULL,
    `personalizationEvidenceIds` JSON NOT NULL,
    `version` INTEGER NOT NULL,
    `status` ENUM('REVIEW', 'APPROVED', 'SENT', 'REJECTED') NOT NULL DEFAULT 'REVIEW',
    `approvedBy` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `OutreachDraft_organizationId_status_createdAt_idx`(`organizationId`, `status`, `createdAt`),
    INDEX `OutreachDraft_qualificationId_idx`(`qualificationId`),
    UNIQUE INDEX `OutreachDraft_leadId_version_key`(`leadId`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OutreachEvent` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `leadId` VARCHAR(191) NOT NULL,
    `draftId` VARCHAR(191) NOT NULL,
    `idempotencyKey` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(50) NOT NULL,
    `providerId` VARCHAR(191) NULL,
    `eventType` VARCHAR(50) NOT NULL,
    `payloadJson` JSON NULL,
    `occurredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `OutreachEvent_leadId_occurredAt_idx`(`leadId`, `occurredAt`),
    INDEX `OutreachEvent_draftId_occurredAt_idx`(`draftId`, `occurredAt`),
    UNIQUE INDEX `OutreachEvent_organizationId_idempotencyKey_key`(`organizationId`, `idempotencyKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LeadSuppression` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `normalizedContact` VARCHAR(320) NOT NULL,
    `reason` VARCHAR(191) NOT NULL,
    `source` VARCHAR(100) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `LeadSuppression_organizationId_active_idx`(`organizationId`, `active`),
    UNIQUE INDEX `LeadSuppression_organizationId_normalizedContact_key`(`organizationId`, `normalizedContact`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FollowUpPlan` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `leadId` VARCHAR(191) NOT NULL,
    `draftId` VARCHAR(191) NOT NULL,
    `jobId` VARCHAR(191) NOT NULL,
    `version` INTEGER NOT NULL,
    `waitHours` INTEGER NOT NULL,
    `dueAt` DATETIME(3) NOT NULL,
    `subject` VARCHAR(200) NOT NULL,
    `body` TEXT NOT NULL,
    `reason` VARCHAR(1000) NOT NULL,
    `status` ENUM('PROPOSED', 'APPROVED', 'CANCELLED', 'COMPLETED') NOT NULL DEFAULT 'PROPOSED',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `FollowUpPlan_organizationId_status_dueAt_idx`(`organizationId`, `status`, `dueAt`),
    UNIQUE INDEX `FollowUpPlan_draftId_version_key`(`draftId`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AnalyticsInsight` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NULL,
    `jobId` VARCHAR(191) NOT NULL,
    `periodStart` DATETIME(3) NOT NULL,
    `periodEnd` DATETIME(3) NOT NULL,
    `summary` TEXT NOT NULL,
    `metricsJson` JSON NOT NULL,
    `recommendations` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AnalyticsInsight_organizationId_createdAt_idx`(`organizationId`, `createdAt`),
    INDEX `AnalyticsInsight_campaignId_createdAt_idx`(`campaignId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `lead` ADD CONSTRAINT `lead_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `review` ADD CONSTRAINT `review_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `lead`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leadsearch` ADD CONSTRAINT `leadsearch_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `searchlead` ADD CONSTRAINT `searchlead_searchId_fkey` FOREIGN KEY (`searchId`) REFERENCES `leadsearch`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `searchlead` ADD CONSTRAINT `searchlead_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `lead`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Campaign` ADD CONSTRAINT `Campaign_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AutomationRun` ADD CONSTRAINT `AutomationRun_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `Campaign`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AutomationRun` ADD CONSTRAINT `AutomationRun_searchId_fkey` FOREIGN KEY (`searchId`) REFERENCES `leadsearch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeadAssessment` ADD CONSTRAINT `LeadAssessment_runId_fkey` FOREIGN KEY (`runId`) REFERENCES `AutomationRun`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeadAssessment` ADD CONSTRAINT `LeadAssessment_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `lead`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RunEvent` ADD CONSTRAINT `RunEvent_runId_fkey` FOREIGN KEY (`runId`) REFERENCES `AutomationRun`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AgentJob` ADD CONSTRAINT `AgentJob_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AgentJob` ADD CONSTRAINT `AgentJob_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `lead`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AgentJob` ADD CONSTRAINT `AgentJob_automationRunId_fkey` FOREIGN KEY (`automationRunId`) REFERENCES `AutomationRun`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AgentJob` ADD CONSTRAINT `AgentJob_assessmentId_fkey` FOREIGN KEY (`assessmentId`) REFERENCES `LeadAssessment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AgentRun` ADD CONSTRAINT `AgentRun_jobId_fkey` FOREIGN KEY (`jobId`) REFERENCES `AgentJob`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeadResearch` ADD CONSTRAINT `LeadResearch_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeadResearch` ADD CONSTRAINT `LeadResearch_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `lead`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeadResearch` ADD CONSTRAINT `LeadResearch_jobId_fkey` FOREIGN KEY (`jobId`) REFERENCES `AgentJob`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeadQualification` ADD CONSTRAINT `LeadQualification_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeadQualification` ADD CONSTRAINT `LeadQualification_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `lead`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeadQualification` ADD CONSTRAINT `LeadQualification_researchId_fkey` FOREIGN KEY (`researchId`) REFERENCES `LeadResearch`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeadQualification` ADD CONSTRAINT `LeadQualification_jobId_fkey` FOREIGN KEY (`jobId`) REFERENCES `AgentJob`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeadApproval` ADD CONSTRAINT `LeadApproval_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeadApproval` ADD CONSTRAINT `LeadApproval_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `lead`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeadContact` ADD CONSTRAINT `LeadContact_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeadContact` ADD CONSTRAINT `LeadContact_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `lead`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeadContact` ADD CONSTRAINT `LeadContact_jobId_fkey` FOREIGN KEY (`jobId`) REFERENCES `AgentJob`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OutreachDraft` ADD CONSTRAINT `OutreachDraft_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OutreachDraft` ADD CONSTRAINT `OutreachDraft_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `lead`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OutreachDraft` ADD CONSTRAINT `OutreachDraft_qualificationId_fkey` FOREIGN KEY (`qualificationId`) REFERENCES `LeadQualification`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OutreachDraft` ADD CONSTRAINT `OutreachDraft_jobId_fkey` FOREIGN KEY (`jobId`) REFERENCES `AgentJob`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OutreachEvent` ADD CONSTRAINT `OutreachEvent_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OutreachEvent` ADD CONSTRAINT `OutreachEvent_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `lead`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OutreachEvent` ADD CONSTRAINT `OutreachEvent_draftId_fkey` FOREIGN KEY (`draftId`) REFERENCES `OutreachDraft`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeadSuppression` ADD CONSTRAINT `LeadSuppression_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FollowUpPlan` ADD CONSTRAINT `FollowUpPlan_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FollowUpPlan` ADD CONSTRAINT `FollowUpPlan_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `lead`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FollowUpPlan` ADD CONSTRAINT `FollowUpPlan_draftId_fkey` FOREIGN KEY (`draftId`) REFERENCES `OutreachDraft`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FollowUpPlan` ADD CONSTRAINT `FollowUpPlan_jobId_fkey` FOREIGN KEY (`jobId`) REFERENCES `AgentJob`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AnalyticsInsight` ADD CONSTRAINT `AnalyticsInsight_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AnalyticsInsight` ADD CONSTRAINT `AnalyticsInsight_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `Campaign`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AnalyticsInsight` ADD CONSTRAINT `AnalyticsInsight_jobId_fkey` FOREIGN KEY (`jobId`) REFERENCES `AgentJob`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

