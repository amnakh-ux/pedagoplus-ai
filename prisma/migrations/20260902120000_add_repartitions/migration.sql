-- CreateTable
CREATE TABLE "Repartition" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "schoolYear" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "lessonsPerWeek" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "teacherId" TEXT NOT NULL,

    CONSTRAINT "Repartition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepartitionRow" (
    "id" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "unit" TEXT NOT NULL,
    "lessons" TEXT NOT NULL,
    "repartitionId" TEXT NOT NULL,

    CONSTRAINT "RepartitionRow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Repartition_teacherId_createdAt_idx" ON "Repartition"("teacherId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RepartitionRow_repartitionId_week_key" ON "RepartitionRow"("repartitionId", "week");

-- CreateIndex
CREATE INDEX "RepartitionRow_repartitionId_idx" ON "RepartitionRow"("repartitionId");

-- AddForeignKey
ALTER TABLE "Repartition" ADD CONSTRAINT "Repartition_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepartitionRow" ADD CONSTRAINT "RepartitionRow_repartitionId_fkey" FOREIGN KEY ("repartitionId") REFERENCES "Repartition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
