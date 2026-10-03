-- Additive only; prepared locally, do not apply to production in step 02.
CREATE TABLE "ExerciseSheet" (
  "id" TEXT NOT NULL PRIMARY KEY, "teacherId" TEXT NOT NULL,
  "title" TEXT NOT NULL, "level" TEXT NOT NULL, "subject" TEXT NOT NULL,
  "domain" TEXT NOT NULL, "skill" TEXT NOT NULL, "difficulty" TEXT NOT NULL,
  "snapshot" JSONB NOT NULL, "revision" INTEGER NOT NULL DEFAULT 1,
  "generationKey" TEXT NOT NULL, "requestFingerprint" TEXT NOT NULL, "monthKey" TEXT NOT NULL,
  "savedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExerciseSheet_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ExerciseSheet_teacherId_generationKey_key" ON "ExerciseSheet"("teacherId", "generationKey");
CREATE UNIQUE INDEX "ExerciseSheet_id_teacherId_key" ON "ExerciseSheet"("id", "teacherId");
CREATE INDEX "ExerciseSheet_teacherId_savedAt_updatedAt_idx" ON "ExerciseSheet"("teacherId", "savedAt", "updatedAt");
CREATE INDEX "ExerciseSheet_teacherId_monthKey_idx" ON "ExerciseSheet"("teacherId", "monthKey");
CREATE TABLE "ExerciseUsage" (
  "teacherId" TEXT NOT NULL, "monthKey" TEXT NOT NULL, "count" INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY ("teacherId", "monthKey"),
  CONSTRAINT "ExerciseUsage_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "ExerciseRequestWindow" (
  "teacherId" TEXT NOT NULL, "bucket" TEXT NOT NULL, "count" INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY ("teacherId", "bucket"),
  CONSTRAINT "ExerciseRequestWindow_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "JournalSession" (
  "id" TEXT NOT NULL PRIMARY KEY, "teacherId" TEXT NOT NULL, "classId" TEXT NOT NULL, "sheetId" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL, "title" TEXT NOT NULL, "duration" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "JournalSession_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "JournalSession_classId_teacherId_fkey" FOREIGN KEY ("classId", "teacherId") REFERENCES "SchoolClass"("id", "teacherId") ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT "JournalSession_sheetId_teacherId_fkey" FOREIGN KEY ("sheetId", "teacherId") REFERENCES "ExerciseSheet"("id", "teacherId") ON DELETE NO ACTION ON UPDATE NO ACTION
);
CREATE UNIQUE INDEX "JournalSession_teacherId_sheetId_classId_date_key" ON "JournalSession"("teacherId", "sheetId", "classId", "date");
CREATE INDEX "JournalSession_teacherId_date_idx" ON "JournalSession"("teacherId", "date");
