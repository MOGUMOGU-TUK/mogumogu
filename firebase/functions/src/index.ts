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
  quantity?: number;
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

/** 참여 문서 id (top-level participations, 앱과 동일 규칙). */
const participationId = (gongguId: string, userId: string) => `${gongguId}__${userId}`;

/** 특정 공구의 참여자 userId 목록 (top-level participations 기준). */
async function participantUserIds(gongguId: string): Promise<string[]> {
  const snap = await db.collection("participations").where("gongguId", "==", gongguId).get();
  return snap.docs.map((d) => String(d.data().userId));
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
/*                                                                     */
/* NOTE (MVP): 아래 3개 콜러블(joinGonggu/confirmPickup/submitReview)은 */
/* Phase 2용 "authoritative mutation"이다. 현재 MVP 클라이언트는 이들을  */
/* 호출하지 않고 participationRepository에서 직접 쓴다. 여기서는 앱과    */
/* 동일한 top-level `participations` + 수량 모델(totalQuantity/          */
/* claimedQuantity/quantity/amount)을 쓰도록만 맞춰 둔다.                */
/* ------------------------------------------------------------------ */

export const joinGonggu = onCall<JoinGongguInput>(async (request) => {
  const uid = assertSignedIn(request.auth?.uid);
  const { gongguId } = request.data;
  const quantity = Math.max(1, Math.floor(Number(request.data.quantity ?? 1)));

  if (!gongguId) {
    throw new HttpsError("invalid-argument", "gongguId가 필요합니다.");
  }

  const gongguRef = db.collection("gonggus").doc(gongguId);
  const participationRef = db.collection("participations").doc(participationId(gongguId, uid));

  let hostUserId = "";
  let gongguTitle = "";
  let nextClaimed = 0;
  let totalQuantity = 0;

  await db.runTransaction(async (transaction) => {
    const gongguDoc = await transaction.get(gongguRef);

    if (!gongguDoc.exists) {
      throw new HttpsError("not-found", "공구를 찾을 수 없습니다.");
    }

    const gonggu = gongguDoc.data() ?? {};
    const claimedQuantity = Number(gonggu.claimedQuantity ?? 0);
    totalQuantity = Number(gonggu.totalQuantity ?? 0);
    const totalPrice = Number(gonggu.totalPrice ?? 0);
    const currentParticipants = Number(gonggu.currentParticipants ?? 0);
    hostUserId = String(gonggu.hostUserId ?? "");
    gongguTitle = String(gonggu.title ?? "공구");

    const remaining = totalQuantity - claimedQuantity;
    if (remaining <= 0 || quantity > remaining) {
      throw new HttpsError("failed-precondition", "남은 수량을 초과했습니다.");
    }

    const unitPrice = Math.ceil(totalPrice / Math.max(1, totalQuantity));
    nextClaimed = claimedQuantity + quantity;

    transaction.set(participationRef, {
      gongguId,
      userId: uid,
      status: "payment_confirmed",
      paymentStatus: "confirmed",
      pickupConfirmationStatus: "pending",
      reviewStatus: "required",
      quantity,
      amount: unitPrice * quantity,
      joinedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    transaction.update(gongguRef, {
      claimedQuantity: nextClaimed,
      currentParticipants: currentParticipants + 1,
      status: nextClaimed >= totalQuantity ? "recruited" : "recruiting",
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

  // 필요 수량 모두 확보 → 모든 참여자에게
  if (nextClaimed >= totalQuantity) {
    const allParticipantIds = await participantUserIds(gongguId);
    notifPromises.push(
      sendNotifToUsers(
        allParticipantIds,
        "full",
        "모집 완료! 🎉",
        `[${gongguTitle}] 필요한 수량이 모두 모였어요`,
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
  const participationRef = db.collection("participations").doc(participationId(gongguId, uid));

  await db.runTransaction(async (transaction) => {
    transaction.update(participationRef, {
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
  const participationRef = db.collection("participations").doc(participationId(gongguId, uid));
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

    transaction.update(participationRef, {
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

    const [gongguDoc, allParticipantIds] = await Promise.all([
      db.collection("gonggus").doc(gongguId).get(),
      participantUserIds(gongguId)
    ]);

    const gongguTitle = (gongguDoc.data()?.title as string) ?? "공구";
    const participantIds = allParticipantIds.filter((id) => id !== senderId);

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
        const participantIds = await participantUserIds(gongguDoc.id);

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
