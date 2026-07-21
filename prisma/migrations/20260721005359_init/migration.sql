-- CreateTable
CREATE TABLE "Institution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "Certificate" (
    "verificationCode" TEXT NOT NULL PRIMARY KEY,
    "institutionId" TEXT NOT NULL,
    "holderName" TEXT NOT NULL,
    "holderDocument" TEXT NOT NULL,
    "degreeTitle" TEXT NOT NULL,
    "issuedAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'VIGENTE',
    "revokedAt" DATETIME,
    "revocationReason" TEXT
);

-- CreateTable
CREATE TABLE "Block" (
    "index" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "timestamp" REAL NOT NULL,
    "data" TEXT NOT NULL,
    "previousHash" TEXT NOT NULL,
    "hash" TEXT NOT NULL
);
