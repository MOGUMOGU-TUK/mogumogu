import * as admin from "firebase-admin";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";

admin.initializeApp();

const db = admin.firestore();

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type JoinGongguInput = {
  gongguId: string;
};

type NotifSettings = {
  join: boolean;
  full: boolean;
  deadline: boolean;
  chat: boolean;
};

const DEFAULT_NOTIF: NotifSettings = { join: true, full: true, deadline: true, chat: false };

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function assertSignedIn(uid?: string) {
  if (!uid) {
    throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
  }
  return uid;
}

/**
 * userIds 중 setting이 켜진 사용자의 FCM 토큰을 모아 멀티캐스트 푸시 발송.
 * data 필드로 클라이언트에서 화면 이동에 사용할 gongguId, type을 전달한다.
 */
async function sendNotifToUsers(
  userIds: string[],
  setting: keyof NotifSettings,
  title: string,
  body: string,
  data: Record<string, string> = {}
): Promise<void> {
  if (userIds.length === 0) return;

  const snaps = await Promise.all(userIds.map((uid) => db.collection("users").doc(uid).get()));

  const tokens: string[] = [];
  for (const snap of snaps) {
    const userData = snap.data();
    if (!userData?.fcmToken) continue;
    const settings: NotifSettings = { ...DEFAULT_NOTIF, ...(userData.notifSettings ?? {}) };
    if (settings[setting]) {
      tokens.push(userData.fcmToken as string);
    }
  }

  if (tokens.length === 0) return;

  await admin.messaging().sendEachForMulticast({
    tokens,
    notification: { title, body },
    data,
    android: { priority: "high" },
    apns: { payload: { aps: { sound: "default" } } }
  });
}

/* ------------------------------------------------------------------ */
/* Callable Functions                                                  */
/* ------------------------------------------------------------------ */

export const joinGonggu = onCall<JoinGongguInput>(async (request) => {
  const uid = assertSignedIn(request.auth?.uid);
  const { gongguId } = request.data;

  if (!gongguId) {
    throw new HttpsError("invalid-argument", "gongguId가 필요합니다.");
  }

  const gongguRef = db.collection("gonggus").doc(gongguId);
  const participantRef = gongguRef.collection("participants").doc(uid);

  let hostUserId = "";
  let gongguTitle = "";
  let nextCount = 0;
  let targetParticipants = 0;

  await db.runTransaction(async (transaction) => {
    const gongguDoc = await transaction.get(gongguRef);

    if (!gongguDoc.exists) {
      throw new HttpsError("not-found", "공구를 찾을 수 없습니다.");
    }

    const gonggu = gongguDoc.data() ?? {};
    const currentParticipants = Number(gonggu.currentParticipants ?? 0);
    targetParticipants = Number(gonggu.targetParticipants ?? 0);
    hostUserId = String(gonggu.hostUserId ?? "");
    gongguTitle = String(gonggu.title ?? "공구");

    if (currentParticipants >= targetParticipants) {
      throw new HttpsError("failed-precondition", "모집 인원이 이미 가득 찼습니다.");
    }

    transaction.set(participantRef, {
      gongguId,
      userId: uid,
      status: "payment_confirmed",
      paymentStatus: "confirmed",
      pickupConfirmationStatus: "pending",
      reviewStatus: "required",
      joinedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    nextCount = currentParticipants + 1;
    transaction.update(gongguRef, {
      currentParticipants: nextCount,
      status: nextCount >= targetParticipants ? "recruited" : "recruiting",
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });

  // 트랜잭션 완료 후 알림 발송
  const notifPromises: Promise<void>[] = [];

  // 새 참여자 발생 → 공구장에게
  if (hostUserId && hostUserId !== uid) {
    notifPromises.push(
      sendNotifToUsers(
        [hostUserId],
        "join",
        "새 참여자가 생겼어요!",
        `[${gongguTitle}] 새로운 참여자가 합류했어요`,
        { gongguId, type: "join" }
      )
    );
  }

  // 모집 인원 달성 → 모든 참여자에게
  if (nextCount >= targetParticipants) {
    const participantsSnap = await gongguRef.collection("participants").get();
    const allParticipantIds = participantsSnap.docs.map((d) => d.id);
    notifPromises.push(
      sendNotifToUsers(
        allParticipantIds,
        "full",
        "모집 인원 달성! 🎉",
        `[${gongguTitle}] 목표 인원이 모두 모였어요`,
        { gongguId, type: "full" }
      )
    );
  }

  await Promise.all(notifPromises);

  return { ok: true };
});

export const confirmPickup = onCall<JoinGongguInput>(async (request) => {
  const uid = assertSignedIn(request.auth?.uid);
  const { gongguId } = request.data;

  if (!gongguId) {
    throw new HttpsError("invalid-argument", "gongguId가 필요합니다.");
  }

  const gongguRef = db.collection("gonggus").doc(gongguId);
  const participantRef = gongguRef.collection("participants").doc(uid);

  await db.runTransaction(async (transaction) => {
    transaction.update(participantRef, {
      status: "pickup_confirmed",
      pickupConfirmationStatus: "confirmed",
      pickupCompletedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    transaction.update(gongguRef, {
      status: "review_required",
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });

  return { ok: true };
});

export const submitReview = onCall<{
  gongguId: string;
  revieweeId: string;
  rating: number;
  comment?: string;
}>(async (request) => {
  const uid = assertSignedIn(request.auth?.uid);
  const { gongguId, revieweeId, rating, comment } = request.data;

  if (!gongguId || !revieweeId || rating < 1 || rating > 5) {
    throw new HttpsError("invalid-argument", "후기 입력값이 올바르지 않습니다.");
  }

  const gongguRef = db.collection("gonggus").doc(gongguId);
  const participantRef = gongguRef.collection("participants").doc(uid);
  const reviewRef = db.collection("reviews").doc();

  await db.runTransaction(async (transaction) => {
    const gongguDoc = await transaction.get(gongguRef);
    const gonggu = gongguDoc.data() ?? {};
    const settlementId = String(gonggu.settlementId ?? "");

    transaction.set(reviewRef, {
      gongguId,
      reviewerId: uid,
      revieweeId,
      rating,
      comment: comment ?? "",
      tags: ["time", "communication"],
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    transaction.update(participantRef, {
      status: "reviewed",
      reviewStatus: "completed"
    });

    if (settlementId) {
      transaction.update(db.collection("settlements").doc(settlementId), {
        status: "releasable",
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    transaction.update(gongguRef, {
      status: "completed",
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });

  return { ok: true };
});

/* ------------------------------------------------------------------ */
/* Firestore Triggers                                                  */
/* ------------------------------------------------------------------ */

/**
 * 새 채팅 메시지 → 발신자를 제외한 참여자에게 알림.
 * 경로: chats/{gongguId}/messages/{messageId} (chatId = gongguId).
 */
export const onNewChatMessage = onDocumentCreated(
  "chats/{gongguId}/messages/{messageId}",
  async (event) => {
    const msg = event.data?.data();
    if (!msg || msg.messageType === "system") return;

    const { gongguId } = event.params;
    const senderId = msg.senderId as string;

    const [gongguDoc, participantsSnap] = await Promise.all([
      db.collection("gonggus").doc(gongguId).get(),
      db.collection("gonggus").doc(gongguId).collection("participants").get()
    ]);

    const gongguTitle = (gongguDoc.data()?.title as string) ?? "공구";
    const participantIds = participantsSnap.docs.map((d) => d.id).filter((id) => id !== senderId);

    const previewText = (msg.text as string).slice(0, 30);

    await sendNotifToUsers(
      participantIds,
      "chat",
      `[${gongguTitle}] 새 채팅`,
      `${msg.senderName}: ${previewText}`,
      { gongguId, type: "chat" }
    );
  }
);

/* ------------------------------------------------------------------ */
/* Scheduled Functions                                                 */
/* ------------------------------------------------------------------ */

/**
 * 매시간 실행 — 모집 마감까지 1시간 이내인 공구의 참여자에게 알림.
 * 공구 생성 시 deadlineAt 필드(Firestore Timestamp)가 저장되어 있어야 한다.
 */
export const onDeadlineApproaching = onSchedule(
  { schedule: "every 1 hours", region: "asia-northeast3" },
  async () => {
    const now = admin.firestore.Timestamp.now();
    const oneHourLater = admin.firestore.Timestamp.fromMillis(Date.now() + 60 * 60 * 1000);

    const gonggusSnap = await db
      .collection("gonggus")
      .where("status", "==", "recruiting")
      .where("deadlineAt", ">=", now)
      .where("deadlineAt", "<=", oneHourLater)
      .get();

    await Promise.all(
      gonggusSnap.docs.map(async (gongguDoc) => {
        const gonggu = gongguDoc.data();
        const participantsSnap = await db
          .collection("gonggus")
          .doc(gongguDoc.id)
          .collection("participants")
          .get();

        const participantIds = participantsSnap.docs.map((d) => d.id);

        await sendNotifToUsers(
          participantIds,
          "deadline",
          "모집 마감 임박 ⏰",
          `[${gonggu.title}] 1시간 안에 마감돼요!`,
          { gongguId: gongguDoc.id, type: "deadline" }
        );
      })
    );
  }
);
