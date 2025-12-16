-- CreateTable
CREATE TABLE "TelegramSettings" (
    "id" TEXT NOT NULL,
    "botToken" TEXT,
    "ordersGroupChatId" TEXT,
    "ordersEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lowStockGroupChatId" TEXT,
    "lowStockEnabled" BOOLEAN NOT NULL DEFAULT true,
    "dailyReportEnabled" BOOLEAN NOT NULL DEFAULT true,
    "dailyReportTime" TEXT NOT NULL DEFAULT '18:00',
    "dailyReportChatId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramSettings_pkey" PRIMARY KEY ("id")
);
