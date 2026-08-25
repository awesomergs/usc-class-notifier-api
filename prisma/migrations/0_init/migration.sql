-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "email" TEXT NOT NULL,
    "verificationKey" TEXT NOT NULL,
    "phone" TEXT,
    "validAccount" BOOLEAN NOT NULL DEFAULT false,
    "uscID" TEXT,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WatchedSection" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "section" TEXT NOT NULL,
    "semester" TEXT NOT NULL,
    "lastNotified" TIMESTAMP(3),
    "notified" BOOLEAN NOT NULL DEFAULT false,
    "paidId" TEXT NOT NULL,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "paidNotified" BOOLEAN NOT NULL DEFAULT false,
    "phoneOverride" TEXT,
    "studentId" TEXT NOT NULL,
    "classInfoId" TEXT,

    CONSTRAINT "WatchedSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationSent" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "sectionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,

    CONSTRAINT "NotificationSent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassInfo" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "department" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "courseNumber" TEXT NOT NULL,
    "courseTitle" TEXT NOT NULL,
    "semester" TEXT NOT NULL,
    "instructor" TEXT,
    "type" TEXT,
    "prefix" TEXT,
    "units" TEXT,
    "day" TEXT,
    "session" TEXT,
    "location" TEXT,
    "isDistanceLearning" BOOLEAN NOT NULL DEFAULT false,
    "hasDClearance" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ClassInfo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Student_email_idx" ON "Student"("email");

-- CreateIndex
CREATE INDEX "Student_phone_idx" ON "Student"("phone");

-- CreateIndex
CREATE INDEX "Student_verificationKey_idx" ON "Student"("verificationKey");

-- CreateIndex
CREATE INDEX "Student_email_verificationKey_idx" ON "Student"("email", "verificationKey");

-- CreateIndex
CREATE UNIQUE INDEX "Student_email_key" ON "Student"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Student_verificationKey_key" ON "Student"("verificationKey");

-- CreateIndex
CREATE INDEX "WatchedSection_semester_notified_section_idx" ON "WatchedSection"("semester", "notified", "section");

-- CreateIndex
CREATE INDEX "WatchedSection_section_idx" ON "WatchedSection"("section");

-- CreateIndex
CREATE INDEX "WatchedSection_semester_idx" ON "WatchedSection"("semester");

-- CreateIndex
CREATE INDEX "WatchedSection_notified_idx" ON "WatchedSection"("notified");

-- CreateIndex
CREATE INDEX "WatchedSection_isPaid_idx" ON "WatchedSection"("isPaid");

-- CreateIndex
CREATE INDEX "WatchedSection_isPaid_paidNotified_idx" ON "WatchedSection"("isPaid", "paidNotified");

-- CreateIndex
CREATE INDEX "WatchedSection_phoneOverride_idx" ON "WatchedSection"("phoneOverride");

-- CreateIndex
CREATE INDEX "WatchedSection_classInfoId_idx" ON "WatchedSection"("classInfoId");

-- CreateIndex
CREATE INDEX "WatchedSection_createdAt_idx" ON "WatchedSection"("createdAt");

-- CreateIndex
CREATE INDEX "WatchedSection_studentId_idx" ON "WatchedSection"("studentId");

-- CreateIndex
CREATE INDEX "WatchedSection_paidId_idx" ON "WatchedSection"("paidId");

-- CreateIndex
CREATE UNIQUE INDEX "WatchedSection_semester_paidId_key" ON "WatchedSection"("semester", "paidId");

-- CreateIndex
CREATE UNIQUE INDEX "WatchedSection_semester_studentId_section_key" ON "WatchedSection"("semester", "studentId", "section");

-- CreateIndex
CREATE INDEX "NotificationSent_sectionId_idx" ON "NotificationSent"("sectionId");

-- CreateIndex
CREATE INDEX "NotificationSent_studentId_idx" ON "NotificationSent"("studentId");

-- CreateIndex
CREATE INDEX "ClassInfo_section_semester_idx" ON "ClassInfo"("section", "semester");

-- CreateIndex
CREATE INDEX "ClassInfo_department_idx" ON "ClassInfo"("department");

-- CreateIndex
CREATE INDEX "ClassInfo_prefix_idx" ON "ClassInfo"("prefix");

-- CreateIndex
CREATE INDEX "ClassInfo_courseNumber_idx" ON "ClassInfo"("courseNumber");

-- CreateIndex
CREATE INDEX "ClassInfo_semester_idx" ON "ClassInfo"("semester");

-- CreateIndex
CREATE UNIQUE INDEX "ClassInfo_section_semester_key" ON "ClassInfo"("section", "semester");

-- AddForeignKey
ALTER TABLE "WatchedSection" ADD CONSTRAINT "WatchedSection_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchedSection" ADD CONSTRAINT "WatchedSection_classInfoId_fkey" FOREIGN KEY ("classInfoId") REFERENCES "ClassInfo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationSent" ADD CONSTRAINT "NotificationSent_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "WatchedSection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationSent" ADD CONSTRAINT "NotificationSent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
