-- CreateTable
CREATE TABLE `Vehicle` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `brand` VARCHAR(80) NOT NULL,
    `model` VARCHAR(80) NOT NULL,
    `licensePlate` VARCHAR(32) NOT NULL,
    `category` VARCHAR(40) NOT NULL,
    `transmission` ENUM('MANUAL', 'AUTOMATIC') NOT NULL,
    `dailyRate` DECIMAL(10, 2) NOT NULL,
    `status` ENUM('AVAILABLE', 'MAINTENANCE', 'INACTIVE') NOT NULL DEFAULT 'AVAILABLE',
    `insuranceExpiration` DATE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Vehicle_companyId_status_idx`(`companyId`, `status`),
    INDEX `Vehicle_companyId_insuranceExpiration_idx`(`companyId`, `insuranceExpiration`),
    UNIQUE INDEX `Vehicle_companyId_licensePlate_key`(`companyId`, `licensePlate`),
    UNIQUE INDEX `Vehicle_companyId_id_key`(`companyId`, `id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Reservation` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `vehicleId` VARCHAR(191) NOT NULL,
    `contactId` VARCHAR(191) NOT NULL,
    `startDate` DATE NOT NULL,
    `endDate` DATE NOT NULL,
    `status` ENUM('CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'CONFIRMED',
    `agreedTotal` DECIMAL(12, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Reservation_companyId_vehicleId_status_startDate_endDate_idx`(`companyId`, `vehicleId`, `status`, `startDate`, `endDate`),
    INDEX `Reservation_companyId_status_endDate_idx`(`companyId`, `status`, `endDate`),
    INDEX `Reservation_companyId_startDate_idx`(`companyId`, `startDate`),
    INDEX `Reservation_companyId_contactId_idx`(`companyId`, `contactId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Contact_tenantId_id_key` ON `Contact`(`tenantId`, `id`);

-- AddForeignKey
ALTER TABLE `Vehicle` ADD CONSTRAINT `Vehicle_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Reservation` ADD CONSTRAINT `Reservation_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Reservation` ADD CONSTRAINT `Reservation_companyId_vehicleId_fkey` FOREIGN KEY (`companyId`, `vehicleId`) REFERENCES `Vehicle`(`companyId`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Reservation` ADD CONSTRAINT `Reservation_companyId_contactId_fkey` FOREIGN KEY (`companyId`, `contactId`) REFERENCES `Contact`(`tenantId`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- MySQL 8.0.16+ required: enforce domain invariants even for direct SQL writes.
ALTER TABLE `Vehicle` ADD CONSTRAINT `Vehicle_positive_dailyRate` CHECK (`dailyRate` > 0);
ALTER TABLE `Reservation` ADD CONSTRAINT `Reservation_valid_period` CHECK (`startDate` < `endDate`), ADD CONSTRAINT `Reservation_positive_total` CHECK (`agreedTotal` > 0);
