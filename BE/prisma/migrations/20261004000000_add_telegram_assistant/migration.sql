CREATE TABLE `TelegramConnection` (
  `id` VARCHAR(191) NOT NULL,
  `organizationId` VARCHAR(191) NOT NULL,
  `chatId` VARCHAR(32) NOT NULL,
  `telegramUserId` VARCHAR(32) NOT NULL,
  `username` VARCHAR(64) NULL,
  `connectedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `TelegramConnection_organizationId_key`(`organizationId`),
  UNIQUE INDEX `TelegramConnection_chatId_key`(`chatId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `TelegramConnection_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TelegramLinkCode` (
  `id` VARCHAR(191) NOT NULL,
  `organizationId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `codeHash` CHAR(64) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `usedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `TelegramLinkCode_codeHash_key`(`codeHash`),
  INDEX `TelegramLinkCode_organizationId_expiresAt_idx`(`organizationId`, `expiresAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `TelegramLinkCode_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TelegramUpdate` (
  `id` VARCHAR(191) NOT NULL,
  `organizationId` VARCHAR(191) NULL,
  `updateId` BIGINT NOT NULL,
  `payload` JSON NOT NULL,
  `status` ENUM('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'QUEUED',
  `attempts` INTEGER NOT NULL DEFAULT 0,
  `availableAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `leaseUntil` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `TelegramUpdate_updateId_key`(`updateId`),
  INDEX `TelegramUpdate_status_availableAt_leaseUntil_idx`(`status`, `availableAt`, `leaseUntil`),
  PRIMARY KEY (`id`),
  CONSTRAINT `TelegramUpdate_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
