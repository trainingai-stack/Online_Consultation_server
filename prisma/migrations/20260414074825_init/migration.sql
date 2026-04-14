-- CreateTable
CREATE TABLE "users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "phone" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nickname" TEXT,
    "avatar" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "doctor_profiles" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "realName" TEXT NOT NULL,
    "idCard" TEXT NOT NULL,
    "licenseNo" TEXT NOT NULL,
    "licenseImage" TEXT NOT NULL,
    "hospital" TEXT,
    "department" TEXT,
    "title" TEXT,
    "specialty" TEXT,
    "introduction" TEXT,
    "categoryId" INTEGER,
    "verifyStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "verifyRemark" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "doctor_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "doctor_profiles_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "doctor_categories" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "doctor_categories" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "consultations" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "patientId" INTEGER NOT NULL,
    "doctorId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "symptoms" TEXT,
    "diagnosis" TEXT,
    "prescription" TEXT,
    "startedAt" DATETIME,
    "endedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "consultations_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "consultations_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "messages" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "consultationId" INTEGER NOT NULL,
    "senderId" INTEGER NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'TEXT',
    "content" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "messages_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "consultations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "doctor_profiles_userId_key" ON "doctor_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "doctor_profiles_licenseNo_key" ON "doctor_profiles"("licenseNo");

-- CreateIndex
CREATE UNIQUE INDEX "doctor_categories_name_key" ON "doctor_categories"("name");
