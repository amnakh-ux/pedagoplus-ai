ALTER TABLE "Teacher" ADD COLUMN "country" TEXT NOT NULL DEFAULT 'Maroc', ADD COLUMN "schoolYear" TEXT NOT NULL DEFAULT '2026-2027';
CREATE TABLE "SchoolClass" (
 "id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "level" TEXT NOT NULL,
 "country" TEXT NOT NULL, "schoolYear" TEXT NOT NULL, "teacherId" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "SchoolClass_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "SchoolClass_id_teacherId_key" ON "SchoolClass"("id", "teacherId");
CREATE INDEX "SchoolClass_teacherId_createdAt_idx" ON "SchoolClass"("teacherId", "createdAt");
ALTER TABLE "Repartition" ADD COLUMN "classId" TEXT, ADD COLUMN "startDate" TIMESTAMP(3), ADD COLUMN "endDate" TIMESTAMP(3), ADD COLUMN "sessionMinutes" INTEGER NOT NULL DEFAULT 45, ADD COLUMN "vacations" TEXT NOT NULL DEFAULT '', ADD COLUMN "syllabus" TEXT NOT NULL DEFAULT '', ADD COLUMN "validatedAt" TIMESTAMP(3);
ALTER TABLE "Repartition" ADD CONSTRAINT "Repartition_classId_teacherId_fkey" FOREIGN KEY ("classId", "teacherId") REFERENCES "SchoolClass"("id", "teacherId") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "RepartitionRow" ADD COLUMN "sessions" INTEGER NOT NULL DEFAULT 0;
