-- CreateEnum
CREATE TYPE "ApplicationRole" AS ENUM ('STUDENT', 'FACULTY');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'USER';

-- CreateTable
CREATE TABLE "role_applications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "requestedRole" "ApplicationRole" NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "programInterest" TEXT,
    "departmentInterest" TEXT,
    "highestQualification" TEXT,
    "specialization" TEXT,
    "statement" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "role_applications_userId_key" ON "role_applications"("userId");

-- CreateIndex
CREATE INDEX "role_applications_requestedRole_status_idx" ON "role_applications"("requestedRole", "status");

-- CreateIndex
CREATE INDEX "role_applications_createdAt_idx" ON "role_applications"("createdAt");

-- AddForeignKey
ALTER TABLE "role_applications" ADD CONSTRAINT "role_applications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
