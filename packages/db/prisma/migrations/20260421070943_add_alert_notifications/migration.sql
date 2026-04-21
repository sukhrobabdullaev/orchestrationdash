-- AlterTable
ALTER TABLE "public"."Alert" ADD COLUMN     "emailTo" TEXT,
ADD COLUMN     "slackWebhookUrl" TEXT,
ADD COLUMN     "webhookUrl" TEXT;
