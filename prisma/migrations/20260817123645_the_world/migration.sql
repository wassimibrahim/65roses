-- CreateEnum
CREATE TYPE "Role" AS ENUM ('MEMBER', 'DOOR', 'ADMIN', 'OWNER');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'WAITLIST', 'DECLINED');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('ACTIVE', 'QUIET', 'AT_RISK', 'PAUSED', 'DECLINED', 'SUSPENDED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "City" AS ENUM ('BEIRUT', 'MADRID');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'ANNOUNCED', 'INVITING', 'LOCKED', 'LIVE', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('SENT', 'VIEWED', 'RESPONDED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "RsvpResponse" AS ENUM ('CONFIRMED', 'DECLINED', 'NO_RESPONSE');

-- CreateEnum
CREATE TYPE "AttendanceOutcome" AS ENUM ('PENDING', 'ATTENDED', 'NO_SHOW', 'DECLINED_EARLY', 'DECLINED_LATE', 'EXCUSED');

-- CreateEnum
CREATE TYPE "CredentialType" AS ENUM ('ROSE', 'STEM');

-- CreateEnum
CREATE TYPE "CredentialStatus" AS ENUM ('UNASSIGNED', 'ASSIGNED', 'ACTIVE', 'EXPIRED', 'LOST', 'REPLACED', 'REVOKED');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING_ADDRESS', 'ADDRESS_RECEIVED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'RETURNED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('NONE', 'PENDING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentProviderKind" AS ENUM ('STRIPE', 'WHISH', 'CASH', 'COMP');

-- CreateEnum
CREATE TYPE "CheckInSubject" AS ENUM ('ROSE', 'STEM');

-- CreateEnum
CREATE TYPE "VerificationPurpose" AS ENUM ('PHONE_VERIFY', 'LOGIN', 'DOOR_ENTRY', 'PHONE_CHANGE', 'STEM_VERIFY');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('SUBMITTED', 'REVIEWING', 'INVITED', 'APPLIED', 'APPROVED', 'DECLINED');

-- CreateEnum
CREATE TYPE "CommunityStatus" AS ENUM ('NOT_INVITED', 'INVITED', 'JOINED', 'LEFT', 'REMOVED');

-- CreateEnum
CREATE TYPE "MessageChannel" AS ENUM ('EMAIL', 'SMS', 'WHATSAPP', 'INSTAGRAM_MANUAL');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "passwordHash" TEXT,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "instagramHandle" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "city" "City" NOT NULL DEFAULT 'BEIRUT',
    "area" TEXT,
    "howFound" VARCHAR(280),
    "referralCode" TEXT,
    "referredById" TEXT,
    "confirmedAdult" BOOLEAN NOT NULL DEFAULT false,
    "agreedHouseRules" BOOLEAN NOT NULL DEFAULT false,
    "consentMessaging" BOOLEAN NOT NULL DEFAULT false,
    "consentPrivacy" BOOLEAN NOT NULL DEFAULT false,
    "consentIp" TEXT,
    "consentAt" TIMESTAMP(3),
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "welcomeToken" TEXT,
    "welcomeTokenExp" TIMESTAMP(3),
    "welcomeSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "applicationId" TEXT,
    "memberNumber" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "instagramHandle" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "phoneVerifiedAt" TIMESTAMP(3),
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "city" "City" NOT NULL DEFAULT 'BEIRUT',
    "area" TEXT,
    "status" "MemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "foundingRose" BOOLEAN NOT NULL DEFAULT false,
    "roseHealth" INTEGER NOT NULL DEFAULT 100,
    "roseHealthAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventsInvited" INTEGER NOT NULL DEFAULT 0,
    "eventsConfirmed" INTEGER NOT NULL DEFAULT 0,
    "eventsAttended" INTEGER NOT NULL DEFAULT 0,
    "eventsNoShow" INTEGER NOT NULL DEFAULT 0,
    "eventsDeclined" INTEGER NOT NULL DEFAULT 0,
    "lastAttendanceAt" TIMESTAMP(3),
    "lastInvitedAt" TIMESTAMP(3),
    "wakeRequestedAt" TIMESTAMP(3),
    "statusChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "communityStatus" "CommunityStatus" NOT NULL DEFAULT 'NOT_INVITED',
    "communityJoinedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "MemberProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberNumberSequence" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "current" INTEGER NOT NULL DEFAULT 64,

    CONSTRAINT "MemberNumberSequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoseCredential" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "engravedNumber" TEXT NOT NULL,
    "serial" TEXT NOT NULL,
    "nfcUid" TEXT,
    "qrToken" TEXT NOT NULL,
    "status" "CredentialStatus" NOT NULL DEFAULT 'ASSIGNED',
    "madeAt" TIMESTAMP(3),
    "issuedAt" TIMESTAMP(3),
    "replacesId" TEXT,
    "replacementReason" TEXT,
    "replacementApprovedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoseCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StemCredential" (
    "id" TEXT NOT NULL,
    "stemGuestId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "braceletSerial" TEXT,
    "nfcUid" TEXT,
    "qrToken" TEXT NOT NULL,
    "editionMark" TEXT NOT NULL,
    "status" "CredentialStatus" NOT NULL DEFAULT 'ASSIGNED',
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StemCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "index" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "city" "City" NOT NULL DEFAULT 'BEIRUT',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Beirut',
    "venueName" TEXT,
    "venueAddress" TEXT,
    "venueNotes" TEXT,
    "venueRevealAt" TIMESTAMP(3),
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "capacityTotal" INTEGER NOT NULL,
    "capacityRoses" INTEGER NOT NULL,
    "capacityStems" INTEGER NOT NULL,
    "rsvpOpensAt" TIMESTAMP(3),
    "rsvpDeadline" TIMESTAMP(3),
    "stemsAllowed" BOOLEAN NOT NULL DEFAULT true,
    "stemPriceCents" INTEGER NOT NULL DEFAULT 0,
    "stemCurrency" TEXT NOT NULL DEFAULT 'USD',
    "editionMark" TEXT NOT NULL,
    "tablesEnabled" BOOLEAN NOT NULL DEFAULT true,
    "tablesRemovedAtLocal" TEXT DEFAULT '01:00',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventInvitation" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'SENT',
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewedAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "EventInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rsvp" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "invitationId" TEXT NOT NULL,
    "response" "RsvpResponse" NOT NULL DEFAULT 'NO_RESPONSE',
    "confirmedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "declinedEarly" BOOLEAN NOT NULL DEFAULT false,
    "outcome" "AttendanceOutcome" NOT NULL DEFAULT 'PENDING',
    "doorCodeHash" TEXT,
    "doorCodeIssuedAt" TIMESTAMP(3),
    "doorCodeUsedAt" TIMESTAMP(3),
    "checkInId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rsvp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StemGuest" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "hostMemberId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "instagramHandle" TEXT,
    "email" TEXT,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "relationshipNote" VARCHAR(200),
    "token" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'NONE',
    "doorCodeHash" TEXT,
    "doorCodeIssuedAt" TIMESTAMP(3),
    "doorCodeUsedAt" TIMESTAMP(3),
    "outcome" "AttendanceOutcome" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "StemGuest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuestFlag" (
    "id" TEXT NOT NULL,
    "stemGuestId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "severity" INTEGER NOT NULL DEFAULT 1,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuestFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckIn" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "subject" "CheckInSubject" NOT NULL,
    "memberId" TEXT,
    "roseCredentialId" TEXT,
    "stemGuestId" TEXT,
    "enteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exitedAt" TIMESTAMP(3),
    "verifiedBy" TEXT NOT NULL,
    "verifyMethod" TEXT NOT NULL,
    "overrideReason" TEXT,

    CONSTRAINT "CheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhoneVerification" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "purpose" "VerificationPurpose" NOT NULL,
    "userId" TEXT,
    "stemGuestId" TEXT,
    "eventId" TEXT,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhoneVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "windowEnd" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryAddress" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "city" "City" NOT NULL DEFAULT 'BEIRUT',
    "area" TEXT NOT NULL,
    "addressLine" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoseDelivery" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING_ADDRESS',
    "preparedAt" TIMESTAMP(3),
    "dispatchedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "courier" TEXT,
    "trackingRef" TEXT,
    "handoverPhotoKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoseDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "eventId" TEXT,
    "stemGuestId" TEXT,
    "memberId" TEXT,
    "provider" "PaymentProviderKind" NOT NULL,
    "providerRef" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "failureCode" TEXT,
    "rawEventJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "provider" "PaymentProviderKind" NOT NULL,
    "providerRef" TEXT,
    "status" TEXT NOT NULL DEFAULT 'INACTIVE',
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "authorMemberId" TEXT NOT NULL,
    "instagramHandle" TEXT NOT NULL,
    "note" VARCHAR(200),
    "status" "ReferralStatus" NOT NULL DEFAULT 'SUBMITTED',
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "inviteToken" TEXT,
    "inviteExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminNote" (
    "id" TEXT NOT NULL,
    "memberId" TEXT,
    "applicationId" TEXT,
    "body" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageLog" (
    "id" TEXT NOT NULL,
    "channel" "MessageChannel" NOT NULL,
    "status" "MessageStatus" NOT NULL DEFAULT 'QUEUED',
    "memberId" TEXT,
    "eventId" TEXT,
    "stemGuestId" TEXT,
    "templateKey" TEXT NOT NULL,
    "toRedacted" TEXT NOT NULL,
    "providerRef" TEXT,
    "error" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Application_welcomeToken_key" ON "Application"("welcomeToken");

-- CreateIndex
CREATE INDEX "Application_status_createdAt_idx" ON "Application"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Application_email_idx" ON "Application"("email");

-- CreateIndex
CREATE INDEX "Application_instagramHandle_idx" ON "Application"("instagramHandle");

-- CreateIndex
CREATE UNIQUE INDEX "MemberProfile_userId_key" ON "MemberProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MemberProfile_applicationId_key" ON "MemberProfile"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "MemberProfile_memberNumber_key" ON "MemberProfile"("memberNumber");

-- CreateIndex
CREATE INDEX "MemberProfile_status_idx" ON "MemberProfile"("status");

-- CreateIndex
CREATE INDEX "MemberProfile_memberNumber_idx" ON "MemberProfile"("memberNumber");

-- CreateIndex
CREATE INDEX "MemberProfile_lastAttendanceAt_idx" ON "MemberProfile"("lastAttendanceAt");

-- CreateIndex
CREATE UNIQUE INDEX "RoseCredential_memberId_key" ON "RoseCredential"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "RoseCredential_engravedNumber_key" ON "RoseCredential"("engravedNumber");

-- CreateIndex
CREATE UNIQUE INDEX "RoseCredential_serial_key" ON "RoseCredential"("serial");

-- CreateIndex
CREATE UNIQUE INDEX "RoseCredential_nfcUid_key" ON "RoseCredential"("nfcUid");

-- CreateIndex
CREATE UNIQUE INDEX "RoseCredential_qrToken_key" ON "RoseCredential"("qrToken");

-- CreateIndex
CREATE UNIQUE INDEX "RoseCredential_replacesId_key" ON "RoseCredential"("replacesId");

-- CreateIndex
CREATE UNIQUE INDEX "StemCredential_stemGuestId_key" ON "StemCredential"("stemGuestId");

-- CreateIndex
CREATE UNIQUE INDEX "StemCredential_braceletSerial_key" ON "StemCredential"("braceletSerial");

-- CreateIndex
CREATE UNIQUE INDEX "StemCredential_nfcUid_key" ON "StemCredential"("nfcUid");

-- CreateIndex
CREATE UNIQUE INDEX "StemCredential_qrToken_key" ON "StemCredential"("qrToken");

-- CreateIndex
CREATE INDEX "StemCredential_eventId_status_idx" ON "StemCredential"("eventId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Event_index_key" ON "Event"("index");

-- CreateIndex
CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");

-- CreateIndex
CREATE INDEX "Event_status_startsAt_idx" ON "Event"("status", "startsAt");

-- CreateIndex
CREATE INDEX "EventInvitation_memberId_status_idx" ON "EventInvitation"("memberId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "EventInvitation_eventId_memberId_key" ON "EventInvitation"("eventId", "memberId");

-- CreateIndex
CREATE UNIQUE INDEX "Rsvp_invitationId_key" ON "Rsvp"("invitationId");

-- CreateIndex
CREATE UNIQUE INDEX "Rsvp_checkInId_key" ON "Rsvp"("checkInId");

-- CreateIndex
CREATE INDEX "Rsvp_eventId_response_idx" ON "Rsvp"("eventId", "response");

-- CreateIndex
CREATE UNIQUE INDEX "Rsvp_eventId_memberId_key" ON "Rsvp"("eventId", "memberId");

-- CreateIndex
CREATE UNIQUE INDEX "StemGuest_token_key" ON "StemGuest"("token");

-- CreateIndex
CREATE INDEX "StemGuest_eventId_paymentStatus_idx" ON "StemGuest"("eventId", "paymentStatus");

-- CreateIndex
CREATE INDEX "StemGuest_token_idx" ON "StemGuest"("token");

-- CreateIndex
CREATE UNIQUE INDEX "StemGuest_eventId_hostMemberId_key" ON "StemGuest"("eventId", "hostMemberId");

-- CreateIndex
CREATE INDEX "GuestFlag_stemGuestId_idx" ON "GuestFlag"("stemGuestId");

-- CreateIndex
CREATE UNIQUE INDEX "CheckIn_stemGuestId_key" ON "CheckIn"("stemGuestId");

-- CreateIndex
CREATE INDEX "CheckIn_eventId_subject_idx" ON "CheckIn"("eventId", "subject");

-- CreateIndex
CREATE INDEX "CheckIn_eventId_enteredAt_idx" ON "CheckIn"("eventId", "enteredAt");

-- CreateIndex
CREATE INDEX "PhoneVerification_phone_purpose_createdAt_idx" ON "PhoneVerification"("phone", "purpose", "createdAt");

-- CreateIndex
CREATE INDEX "PhoneVerification_expiresAt_idx" ON "PhoneVerification"("expiresAt");

-- CreateIndex
CREATE INDEX "RateLimit_windowEnd_idx" ON "RateLimit"("windowEnd");

-- CreateIndex
CREATE UNIQUE INDEX "RateLimit_key_key" ON "RateLimit"("key");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryAddress_memberId_key" ON "DeliveryAddress"("memberId");

-- CreateIndex
CREATE INDEX "RoseDelivery_status_idx" ON "RoseDelivery"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Payment_status_createdAt_idx" ON "Payment"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Payment_providerRef_idx" ON "Payment"("providerRef");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_memberId_key" ON "Subscription"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "Referral_inviteToken_key" ON "Referral"("inviteToken");

-- CreateIndex
CREATE INDEX "Referral_status_idx" ON "Referral"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Referral_authorMemberId_instagramHandle_key" ON "Referral"("authorMemberId", "instagramHandle");

-- CreateIndex
CREATE INDEX "AdminNote_memberId_idx" ON "AdminNote"("memberId");

-- CreateIndex
CREATE INDEX "AdminNote_applicationId_idx" ON "AdminNote"("applicationId");

-- CreateIndex
CREATE INDEX "MessageLog_templateKey_createdAt_idx" ON "MessageLog"("templateKey", "createdAt");

-- CreateIndex
CREATE INDEX "MessageLog_memberId_idx" ON "MessageLog"("memberId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "MemberProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberProfile" ADD CONSTRAINT "MemberProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberProfile" ADD CONSTRAINT "MemberProfile_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoseCredential" ADD CONSTRAINT "RoseCredential_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "MemberProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoseCredential" ADD CONSTRAINT "RoseCredential_replacesId_fkey" FOREIGN KEY ("replacesId") REFERENCES "RoseCredential"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StemCredential" ADD CONSTRAINT "StemCredential_stemGuestId_fkey" FOREIGN KEY ("stemGuestId") REFERENCES "StemGuest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StemCredential" ADD CONSTRAINT "StemCredential_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventInvitation" ADD CONSTRAINT "EventInvitation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventInvitation" ADD CONSTRAINT "EventInvitation_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "MemberProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rsvp" ADD CONSTRAINT "Rsvp_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rsvp" ADD CONSTRAINT "Rsvp_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "MemberProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rsvp" ADD CONSTRAINT "Rsvp_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "EventInvitation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rsvp" ADD CONSTRAINT "Rsvp_checkInId_fkey" FOREIGN KEY ("checkInId") REFERENCES "CheckIn"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StemGuest" ADD CONSTRAINT "StemGuest_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StemGuest" ADD CONSTRAINT "StemGuest_hostMemberId_fkey" FOREIGN KEY ("hostMemberId") REFERENCES "MemberProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestFlag" ADD CONSTRAINT "GuestFlag_stemGuestId_fkey" FOREIGN KEY ("stemGuestId") REFERENCES "StemGuest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "MemberProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_roseCredentialId_fkey" FOREIGN KEY ("roseCredentialId") REFERENCES "RoseCredential"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_stemGuestId_fkey" FOREIGN KEY ("stemGuestId") REFERENCES "StemGuest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryAddress" ADD CONSTRAINT "DeliveryAddress_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "MemberProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoseDelivery" ADD CONSTRAINT "RoseDelivery_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "MemberProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_stemGuestId_fkey" FOREIGN KEY ("stemGuestId") REFERENCES "StemGuest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_authorMemberId_fkey" FOREIGN KEY ("authorMemberId") REFERENCES "MemberProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminNote" ADD CONSTRAINT "AdminNote_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "MemberProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminNote" ADD CONSTRAINT "AdminNote_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageLog" ADD CONSTRAINT "MessageLog_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "MemberProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageLog" ADD CONSTRAINT "MessageLog_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
