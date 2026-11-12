CREATE TABLE `lead_call_profile` (
  `id` VARCHAR(191) NOT NULL,
  `organizationId` VARCHAR(191) NOT NULL,
  `leadId` VARCHAR(191) NOT NULL,
  `status` ENUM('REVIEW_REQUIRED', 'ELIGIBLE', 'DO_NOT_CALL') NOT NULL DEFAULT 'REVIEW_REQUIRED',
  `interestConfirmed` BOOLEAN NOT NULL DEFAULT false,
  `interestEvidence` VARCHAR(1000) NULL,
  `doNotCallCheckedAt` DATETIME(3) NULL,
  `timeZone` VARCHAR(100) NULL,
  `checkedBy` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `lead_call_profile_leadId_key`(`leadId`),
  INDEX `lead_call_profile_organizationId_status_updatedAt_idx`(`organizationId`, `status`, `updatedAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `lead_call_profile_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `lead_call_profile_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `lead`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `call_activity` (
  `id` VARCHAR(191) NOT NULL,
  `organizationId` VARCHAR(191) NOT NULL,
  `leadId` VARCHAR(191) NOT NULL,
  `phoneNumber` VARCHAR(100) NOT NULL,
  `outcome` ENUM('STARTED', 'ANSWERED', 'NO_ANSWER', 'CALLBACK_REQUESTED', 'INTERESTED', 'NOT_INTERESTED', 'WRONG_NUMBER', 'DO_NOT_CALL') NOT NULL,
  `notes` VARCHAR(1000) NULL,
  `followUpAt` DATETIME(3) NULL,
  `userId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `call_activity_organizationId_leadId_createdAt_idx`(`organizationId`, `leadId`, `createdAt`),
  INDEX `call_activity_organizationId_outcome_createdAt_idx`(`organizationId`, `outcome`, `createdAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `call_activity_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `call_activity_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `lead`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
