import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  increment,
  writeBatch,
} from "firebase/firestore";

import type { ReportCategory, ReportTargetRole } from "../../../types/domain";
import { getFirebaseServices } from "../../../services/firebase/client";

const REPORTS = "reports";
const USER_STATS = "userStats";

export type ReportInput = {
  gongguId: string;
  reporterId: string;
  targetUserId: string;
  targetRole: ReportTargetRole;
  category: ReportCategory;
  detail: string;
};

export type UserStatsDoc = {
  noshowCount?: number;
  /** 노쇼로 신고당한 공구 id 목록(중복 없음). 제목 등은 gonggus 컬렉션에서 조회. */
  noshowGongguIds?: string[];
};

/** 마이페이지 등에서 "내가 노쇼 신고당한 횟수/어느 공구인지"를 보여줄 때 사용. */
export async function loadUserStatsDoc(uid: string): Promise<UserStatsDoc | null> {
  const services = getFirebaseServices();
  if (!services) return null;

  const snap = await getDoc(doc(services.db, USER_STATS, uid));
  return snap.exists() ? (snap.data() as UserStatsDoc) : null;
}

/**
 * 신고 제출. reports 컬렉션은 생성만 허용되고 클라이언트에서 읽기/수정은 막혀 있어서
 * (관리자 검토용) 신고 내역 자체는 앱에서 다시 불러올 수 없다.
 * 노쇼 신고는 마이페이지 등에서 바로 볼 수 있도록 userStats/{targetUserId}에
 * 카운트와 해당 공구 id를 함께 올린다.
 */
export async function submitReportDoc(input: ReportInput): Promise<void> {
  const services = getFirebaseServices();
  if (!services) {
    throw new Error("Firebase가 설정되지 않았습니다.");
  }
  const { db } = services;

  const batch = writeBatch(db);
  batch.set(doc(collection(db, REPORTS)), {
    ...input,
    createdAt: new Date().toISOString(),
  });
  if (input.category === "noshow") {
    batch.set(
      doc(db, USER_STATS, input.targetUserId),
      {
        noshowCount: increment(1),
        noshowGongguIds: arrayUnion(input.gongguId),
      },
      { merge: true },
    );
  }
  await batch.commit();
}
