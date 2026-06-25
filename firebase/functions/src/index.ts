import * as admin from "firebase-admin";
import { HttpsError, onCall } from "firebase-functions/v2/https";

admin.initializeApp();

const db = admin.firestore();

type JoinGongguInput = {
  gongguId: string;
};

function assertSignedIn(uid?: string) {
  if (!uid) {
    throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
  }

  return uid;
}

export const joinGonggu = onCall<JoinGongguInput>(async (request) => {
  const uid = assertSignedIn(request.auth?.uid);
  const { gongguId } = request.data;

  if (!gongguId) {
    throw new HttpsError("invalid-argument", "gongguId가 필요합니다.");
  }

  const gongguRef = db.collection("gonggus").doc(gongguId);
  const participantRef = gongguRef.collection("participants").doc(uid);

  await db.runTransaction(async (transaction) => {
    const gongguDoc = await transaction.get(gongguRef);

    if (!gongguDoc.exists) {
      throw new HttpsError("not-found", "공구를 찾을 수 없습니다.");
    }

    const gonggu = gongguDoc.data() ?? {};
    const currentParticipants = Number(gonggu.currentParticipants ?? 0);
    const targetParticipants = Number(gonggu.targetParticipants ?? 0);

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

    const nextCount = currentParticipants + 1;
    transaction.update(gongguRef, {
      currentParticipants: nextCount,
      status: nextCount >= targetParticipants ? "recruited" : "recruiting",
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });

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

