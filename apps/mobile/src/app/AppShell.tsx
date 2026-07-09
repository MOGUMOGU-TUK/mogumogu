import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Text,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { useFirebaseAuth } from "../domains/auth/hooks/useFirebaseAuth";
import { useChatMessages } from "../domains/chat/hooks/useChatMessages";
import { useFirestoreData } from "../domains/gonggu/hooks/useFirestoreData";
import {
  verifyNeighborhood,
  mapLocationError,
  formatVerifiedLocationBrief,
  type VerifiedLocation
} from "../domains/location/services/verifyNeighborhood";
import { sendMessageDoc } from "../domains/chat/services/chatRepository";
import {
  loadUserStatsDoc,
  submitReportDoc,
  type UserStatsDoc,
} from "../domains/chat/services/reportRepository";
import { reverseGeocode } from "../domains/map/services/kakaoGeo";
import { isFirebaseConfigured } from "../services/firebase/client";
import {
  cancelGongguDoc,
  completeGongguDoc,
  createGongguDoc,
  hideGongguChatDoc,
} from "../domains/gonggu/services/gongguRepository";
import {
  DEFAULT_NOTIF_SETTINGS,
  clearNotifsDoc,
  initNotifications,
  loadNotifSettings,
  markNotifReadDoc,
  saveNotifSettings,
  subscribeNotifs,
  writeNotifDoc,
  type NotifSettings,
} from "../domains/notifications/services/notificationService";
import {
  cancelParticipationDoc,
  joinGongguDoc,
  submitReviewDoc,
} from "../domains/gonggu/services/participationRepository";
import type { MainTab, Screen } from "./navigationTypes";
import { BottomNav } from "./components/BottomNav";
import { LoginScreen } from "../domains/auth/components/LoginScreen";
import { CreateScreen } from "../domains/gonggu/components/CreateScreen";
import type { PickupPlace } from "../domains/gonggu/components/PlaceSearchSheet";
import { DetailScreen as GongguDetailScreen } from "../domains/gonggu/components/DetailScreen";
import { HomeScreen as GongguHomeScreen } from "../domains/gonggu/components/HomeScreen";
import { JoinSheet as GongguJoinSheet } from "../domains/gonggu/components/JoinSheet";
import { VerifyScreen } from "../domains/location/components/VerifyScreen";
import { ChatListScreen } from "../domains/chat/components/ChatListScreen";
import { ChatScreen } from "../domains/chat/components/ChatScreen";
import {
  ReportSheet,
  type ReportableMember,
} from "../domains/chat/components/ReportSheet";
import { MapScreen } from "../domains/map/components/MapScreen";
import { CompletedDealsScreen } from "../domains/mypage/components/CompletedDealsScreen";
import {
  MyPageScreen,
  type MyPageReviewTag,
} from "../domains/mypage/components/MyPageScreen";
import { ProfileEditScreen } from "../domains/mypage/components/ProfileEditScreen";
import { ReceivedReviewsScreen } from "../domains/mypage/components/ReceivedReviewsScreen";
import {
  loadUserProfileDoc,
  saveUserProfileDoc,
  uploadUserProfileImage,
  type UserProfileDoc,
} from "../domains/mypage/services/profileRepository";
import { NotifScreen } from "../domains/notifications/components/NotifScreen";
import type { NotifItem, NotifKey } from "../domains/notifications/types";
import { ReviewScreen } from "../domains/review/components/ReviewScreen";
import type { ReviewKey } from "../domains/review/types";
import type { ChatMsg } from "../domains/chat/types";
import { chatMsgFromDomain, SEED_MSGS } from "../domains/chat/utils";
import type { Deal } from "../domains/gonggu/types";
import { DEFAULT_RECRUITMENT_DEADLINE_LABEL, formatPickupTime, gongguToUi } from "../domains/gonggu/utils";
import { isWithinRadiusKm } from "../domains/location/services/geo";
import type { ReportCategory, ReportTargetRole, User } from "../types/domain";
import { ConfirmSheet, type ConfirmState } from "../shared/ui/ConfirmSheet";
import { EmptyState } from "../shared/ui/EmptyState";
import { t } from "../shared/theme/theme";
import { styles } from "../shared/ui/appStyles";

const NICKNAME_CHANGE_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000;
const profileStorageKey = (uid: string) => `mogumogu.profile.${uid}`;
const REVIEW_TAG_DEFS: Array<
  MyPageReviewTag & { keys: string[] }
> = [
  {
    emoji: "⏱️",
    text: "시간 약속을 잘 지켜요",
    count: 0,
    keys: ["time", "시간 약속", "시간"],
  },
  {
    emoji: "⚖️",
    text: "소분이 공정해요",
    count: 0,
    keys: ["fair", "소분", "공정"],
  },
  {
    emoji: "💬",
    text: "친절하고 매너있어요",
    count: 0,
    keys: ["manner", "communication", "소통 매너", "친절", "매너"],
  },
  {
    emoji: "🧺",
    text: "상품 설명이 정확해요",
    count: 0,
    keys: ["desc", "description", "상품 설명", "설명"],
  },
];
const REVIEW_TAG_LABELS: Record<ReviewKey, string> = {
  time: "시간 약속",
  fair: "소분",
  manner: "소통 매너",
  desc: "상품 설명",
};

function formatDateLabel(date: Date) {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function applyProfileDoc(
  profile: UserProfileDoc | null | undefined,
  setNickname: (nickname: string) => void,
  setLastNicknameChangedAt: (changedAt: string | null) => void,
  setVerifiedLocation: (location: VerifiedLocation | null) => void,
  setProfileImageUrl: (imageUrl: string | null) => void,
) {
  if (!profile) return;
  if (profile.nickname?.trim()) {
    setNickname(profile.nickname.trim());
  }
  setLastNicknameChangedAt(profile.lastNicknameChangedAt ?? null);
  if (profile.verifiedLocation?.neighborhood) {
    setVerifiedLocation(profile.verifiedLocation);
  }
  setProfileImageUrl(profile.profileImageUrl ?? null);
}

/**
 * App composition root.
 *
 * Owns the cross-screen state and wires each domain screen together. Domain
 * screens, hooks, and services live under `domains/*`; shared UI under
 * `shared/*`; app-level chrome under `app/*`.
 */
export function AppShell() {
  const insets = useSafeAreaInsets();
  const [screen, setScreen] = useState<Screen>("login");
  const [tab, setTab] = useState<MainTab>("home");
  const [selectedId, setSelectedId] = useState("");
  const [detailFrom, setDetailFrom] = useState<Screen>("home");
  const [mapSel, setMapSel] = useState("");
  const [joined, setJoined] = useState<string[]>([]);
  const [hearts, setHearts] = useState<string[]>([]);
  const [showJoin, setShowJoin] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [toast, setToast] = useState("");
  const [completedDealsMode, setCompletedDealsMode] = useState<"view" | "review">("view");

  const [nickname, setNickname] = useState("");
  const [lastNicknameChangedAt, setLastNicknameChangedAt] = useState<string | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [profileImageUploading, setProfileImageUploading] = useState(false);
  const [verifyStep, setVerifyStep] = useState(0);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const [verifiedLocation, setVerifiedLocation] = useState<VerifiedLocation | null>(null);
  const verifiedLocationLabel = formatVerifiedLocationBrief(verifiedLocation);
  /** 로그인 유저의 프로필(닉네임·인증동네) 복원이 끝났는지. 세션 복원 라우팅 게이트. */
  const [profileLoaded, setProfileLoaded] = useState(false);

  const [extraMsgs, setExtraMsgs] = useState<ChatMsg[]>([]);
  const [homeFilter, setHomeFilter] = useState("전체");
  const [createCat, setCreateCat] = useState("");
  const [cTitle, setCTitle] = useState("");
  const [cTotal, setCTotal] = useState("");
  const [cQty, setCQty] = useState("");
  const [cQtyUnit, setCQtyUnit] = useState("개");
  const [cPickupPlace, setCPickupPlace] = useState<PickupPlace | null>(null);
  const [cPickupUndecided, setCPickupUndecided] = useState(false);
  const [cTimeDate, setCTimeDate] = useState<Date | null>(null);
  const [cTimeUndecided, setCTimeUndecided] = useState(false);
  const [ratings, setRatings] = useState<Record<ReviewKey, number>>({
    time: 0,
    fair: 0,
    manner: 0,
    desc: 0,
  });
  const [notif, setNotif] = useState<NotifSettings>(DEFAULT_NOTIF_SETTINGS);
  const [notifItems, setNotifItems] = useState<NotifItem[]>([]);
  const [dismissedReviewIds, setDismissedReviewIds] = useState<string[]>([]);
  const [userStatsById, setUserStatsById] = useState<Record<string, UserStatsDoc>>({});

  /* ── Firebase 훅 ── */
  const auth = useFirebaseAuth();
  const data = useFirestoreData(auth.user?.uid ?? null);

  useEffect(() => {
    const uid = auth.user?.uid;
    if (!uid) {
      setLastNicknameChangedAt(null);
      setProfileImageUrl(null);
      setProfileLoaded(false);
      return;
    }

    setProfileLoaded(false);
    void Promise.all([
      loadUserProfileDoc(uid).catch(() => null),
      AsyncStorage.getItem(profileStorageKey(uid)).catch(() => null),
    ])
      .then(([remoteProfile, rawLocalProfile]) => {
        if (remoteProfile) {
          applyProfileDoc(
            remoteProfile,
            setNickname,
            setLastNicknameChangedAt,
            setVerifiedLocation,
            setProfileImageUrl,
          );
          return;
        }

        if (!rawLocalProfile) {
          setLastNicknameChangedAt(null);
          return;
        }

        const localProfile = JSON.parse(rawLocalProfile) as UserProfileDoc;
        applyProfileDoc(
          localProfile,
          setNickname,
          setLastNicknameChangedAt,
          setVerifiedLocation,
          setProfileImageUrl,
        );

        if (localProfile.nickname || localProfile.verifiedLocation) {
          void saveUserProfileDoc(uid, localProfile);
        }
      })
      .catch(() => {
        setLastNicknameChangedAt(null);
      })
      .finally(() => setProfileLoaded(true));
  }, [auth.user?.uid]);

  const gongguHostUserIdsKey = useMemo(
    () =>
      Array.from(new Set(data.gonggus.map((gonggu) => gonggu.hostUserId)))
        .sort()
        .join("|"),
    [data.gonggus],
  );

  useEffect(() => {
    const uid = auth.user?.uid;
    if (!uid || auth.user?.isAnonymous || !isFirebaseConfigured()) {
      setUserStatsById((prev) => (Object.keys(prev).length > 0 ? {} : prev));
      return;
    }

    let active = true;
    const hostUserIds = gongguHostUserIdsKey
      ? gongguHostUserIdsKey.split("|")
      : [];
    const targetUserIds = Array.from(new Set([uid, ...hostUserIds]));

    void Promise.all(
      targetUserIds.map(async (targetUserId) => {
        const stats = await loadUserStatsDoc(targetUserId).catch(() => null);
        return [targetUserId, stats ?? {}] as const;
      }),
    ).then((entries) => {
      if (!active) return;
      setUserStatsById(Object.fromEntries(entries));
    });

    return () => {
      active = false;
    };
  }, [auth.user?.uid, auth.user?.isAnonymous, gongguHostUserIdsKey]);

  /* ── 도메인 → UI 어댑터 ── */
  const deals = useMemo(
    () =>
      data.gonggus.map((g) =>
        gongguToUi(
          g,
          data.reviews,
          data.gonggus,
          userStatsById[g.hostUserId]?.noshowCount ?? 0,
        ),
      ),
    [data.gonggus, data.reviews, userStatsById],
  );

  const feedDeals = useMemo(
    () => deals.filter((d) => !["canceled", "review_required", "completed"].includes(d.status)),
    [deals],
  );

  /* 지도: 좌표 있고 인증 위치 반경 1km 이내 공구만 (카카오 마커용) */
  const mapDeals = useMemo(() => {
    const withCoords = feedDeals.filter(
      (d) => d.pickupLatitude != null && d.pickupLongitude != null,
    );
    if (!verifiedLocation) return withCoords;
    return withCoords.filter((d) =>
      isWithinRadiusKm(
        verifiedLocation.latitude,
        verifiedLocation.longitude,
        d.pickupLatitude!,
        d.pickupLongitude!,
      ),
    );
  }, [feedDeals, verifiedLocation]);

  /* selectedId는 완료/후기 화면에서도 쓰이므로 전체 거래 기준으로 보정한다. */
  useEffect(() => {
    if (deals.length === 0) {
      if (selectedId) setSelectedId("");
    } else if (!selectedId || !deals.some((d) => d.id === selectedId)) {
      setSelectedId((feedDeals[0] ?? deals[0])!.id);
    }

    if (feedDeals.length === 0) {
      if (mapSel) setMapSel("");
      return;
    }

    const fallbackId = feedDeals[0]!.id;
    if (!mapSel || !feedDeals.some((d) => d.id === mapSel)) {
      setMapSel(fallbackId);
    }
  }, [deals, feedDeals, selectedId, mapSel]);

  /*
   * 로그인 세션 복원 후 라우팅.
   * 프로필 로드가 끝난 뒤에만 판정한다(로드 전 판정 시 verifiedLocation 이 아직 null 이라 잘못 튕김).
   * - 이미 온보딩(닉네임+동네 인증) 완료 → 홈으로 (새로고침해도 홈 유지)
   * - 미완료 → 기존대로 닉네임·동네 인증 화면으로
   */
  useEffect(() => {
    if (skipSocialAutoVerifyRef.current) return;
    if (screen === "login" && auth.user && !auth.user.isAnonymous && profileLoaded) {
      if (verifiedLocation && nickname.trim()) {
        go("home", "home");
        return;
      }
      if (auth.user.displayName && !nickname.trim()) {
        setNickname(auth.user.displayName.slice(0, 12));
      }
      setVerifyStep(0);
      setLocateError(null);
      setScreen("verify");
    }
  }, [auth.user, screen, nickname, profileLoaded, verifiedLocation]);

  /* 로그인 후 FCM 토큰 등록 + 알림 설정 로드 */
  useEffect(() => {
    const uid = auth.user?.uid;
    if (!uid || auth.user?.isAnonymous) return;
    void initNotifications(uid);
    void loadNotifSettings(uid)
      .then(setNotif)
      .catch(() => showToast("알림 설정을 불러오지 못했어요."));
  }, [auth.user?.uid, auth.user?.isAnonymous]);

  /* 인앱 알림 — Firestore 실시간 구독 */
  useEffect(() => {
    const uid = auth.user?.uid;
    if (!uid || auth.user?.isAnonymous) return;
    return subscribeNotifs(uid, setNotifItems);
  }, [auth.user?.uid, auth.user?.isAnonymous]);

  /* 공구 만들기 진입 시 현 위치를 기본 픽업 장소로 설정 */
  useEffect(() => {
    if (screen !== "create" || !verifiedLocation || cPickupPlace) return;
    const fallback = {
      name: verifiedLocation.neighborhood || "현재 위치",
      address: "",
      latitude: verifiedLocation.latitude,
      longitude: verifiedLocation.longitude,
      isDefault: true as const,
    };
    void reverseGeocode(verifiedLocation.latitude, verifiedLocation.longitude)
      .then((address) => setCPickupPlace({ ...fallback, address }))
      .catch(() => setCPickupPlace(fallback));
  }, [screen, verifiedLocation]);

  /* 현재 사용자 (도메인 타입) */
  const currentUser = useMemo<User>(
    () => ({
      id: auth.user?.uid ?? "user_me",
      nickname: nickname.trim() || auth.user?.displayName || "이웃",
      neighborhood: verifiedLocation?.neighborhood ?? "",
      universityVerified: false,
      locationVerified: Boolean(verifiedLocation),
      trustScore: 36.5,
      completedGongguCount: 0,
    }),
    [auth.user, nickname, verifiedLocation]
  );

  const nicknameChangeState = useMemo(() => {
    if (!lastNicknameChangedAt) {
      return { canChange: true, nextDate: null };
    }

    const lastChangedTime = new Date(lastNicknameChangedAt).getTime();
    if (Number.isNaN(lastChangedTime)) {
      return { canChange: true, nextDate: null };
    }

    const nextTime = lastChangedTime + NICKNAME_CHANGE_INTERVAL_MS;
    return {
      canChange: Date.now() >= nextTime,
      nextDate: formatDateLabel(new Date(nextTime)),
    };
  }, [lastNicknameChangedAt]);

  /* 채팅 실시간 구독 */
  const liveMessages = useChatMessages(selectedId);
  const chatMsgs: ChatMsg[] = useMemo(
    () =>
      liveMessages
        ? liveMessages.map((m) => chatMsgFromDomain(m, currentUser.id))
        : [...SEED_MSGS, ...extraMsgs],
    [liveMessages, extraMsgs, currentUser.id],
  );

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipSocialAutoVerifyRef = useRef(false);

  const sel = useMemo(
    () => deals.find((d) => d.id === selectedId) ?? feedDeals[0] ?? null,
    [deals, feedDeals, selectedId],
  );
  /* 현재 채팅방에서 신고 대상으로 고를 수 있는 사람들 (나 자신 제외) */
  const reportableMembers = useMemo<ReportableMember[]>(() => {
    if (!sel) return [];
    const members: ReportableMember[] = [
      { id: sel.hostId, nickname: sel.leader, role: "host" },
      ...data.participations
        .filter((p) => p.gongguId === sel.id)
        .map((p) => ({
          id: p.userId,
          nickname: p.nickname || "참여자",
          role: "participant" as const,
        })),
    ];
    return members.filter((m) => m.id !== currentUser.id);
  }, [sel, data.participations, currentUser.id]);
  const mapPick = useMemo(
    () => mapDeals.find((d) => d.id === mapSel) ?? mapDeals[0] ?? null,
    [mapDeals, mapSel],
  );

  /* 내가 참여했고 아직 후기를 안 쓴 완료 공구 (모달 유도용) */
  const pendingReviewDeal = useMemo(() => {
    if (!currentUser.id || auth.user?.isAnonymous) return null;
    return (
      deals.find(
        (d) =>
          d.status === "review_required" &&
          d.hostId !== currentUser.id &&
          !dismissedReviewIds.includes(d.id) &&
          data.participations.some(
            (p) =>
              p.gongguId === d.id &&
              p.userId === currentUser.id &&
              p.reviewStatus !== "completed",
          ),
      ) ?? null
    );
  }, [deals, data.participations, currentUser.id, dismissedReviewIds, auth.user?.isAnonymous]);

  /* 내가 주최했거나 참여 중인 채팅방 (방장이 숨긴 방은 제외) */
  const myRooms = useMemo(
    () =>
      deals.filter((d) => {
        const isHost = d.hostId === currentUser.id;
        if (isHost) return !d.hostHidden;
        return data.participations.some(
          (p) => p.gongguId === d.id && p.userId === currentUser.id,
        );
      }),
    [deals, data.participations, currentUser.id],
  );

  const completedDeals = useMemo(
    () =>
      deals.filter((d) => {
        const isHost = d.hostId === currentUser.id;
        const isPart = data.participations.some(
          (p) => p.gongguId === d.id && p.userId === currentUser.id,
        );
        return ["review_required", "completed"].includes(d.status) && (isHost || isPart);
      }),
    [deals, data.participations, currentUser.id],
  );

  const reviewableDeals = useMemo(
    () =>
      deals.filter((d) => {
        if (d.status !== "review_required" || d.hostId === currentUser.id) {
          return false;
        }

        const participation = data.participations.find(
          (p) => p.gongguId === d.id && p.userId === currentUser.id,
        );

        return Boolean(participation && participation.reviewStatus !== "completed");
      }),
    [deals, data.participations, currentUser.id],
  );

  const receivedReviews = useMemo(
    () => data.reviews.filter((review) => review.revieweeId === currentUser.id),
    [currentUser.id, data.reviews],
  );

  const currentUserStats = userStatsById[currentUser.id];

  const noshowDeals = useMemo(() => {
    const noshowIds = new Set(currentUserStats?.noshowGongguIds ?? []);
    if (noshowIds.size === 0) return [];
    return deals.filter((deal) => noshowIds.has(deal.id));
  }, [currentUserStats?.noshowGongguIds, deals]);

  const myPageStats = useMemo(() => {
    const reviewTags = REVIEW_TAG_DEFS.map((tagDef) => {
      const count = receivedReviews.reduce((sum, review) => {
        const hasTag = review.tags.some((tag) =>
          tagDef.keys.some((key) => tag.includes(key)),
        );
        return sum + (hasTag ? 1 : 0);
      }, 0);
      return {
        emoji: tagDef.emoji,
        text: tagDef.text,
        count,
      };
    }).filter((tag) => tag.count > 0);

    return {
      mannerScore: Math.min(
        100,
        receivedReviews.reduce((sum, review) => sum + review.rating, 0),
      ),
      completedDealCount: completedDeals.length,
      receivedReviewCount: receivedReviews.length,
      noshowCount: currentUserStats?.noshowCount ?? 0,
      reviewTags,
    };
  }, [completedDeals.length, currentUserStats?.noshowCount, receivedReviews]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  function go(next: Screen, nextTab?: MainTab) {
    setScreen(next);
    if (nextTab) setTab(nextTab);
    setShowJoin(false);
  }

  /* Android 물리 뒤로가기 버튼 */
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (confirm) {
        setConfirm(null);
        return true;
      }
      if (showJoin) {
        setShowJoin(false);
        return true;
      }
      if (showReport) {
        setShowReport(false);
        return true;
      }
      if (screen === "verify") {
        skipSocialAutoVerifyRef.current = true;
        setScreen("login");
        return true;
      }
      if (screen === "detail") {
        if (detailFrom === "notifications") {
          go("notifications");
        } else if (detailFrom === "completedDeals") {
          go("completedDeals", "mypage");
        } else if (detailFrom === "noshowDeals") {
          go("noshowDeals", "mypage");
        } else {
          go(tab);
        }
        return true;
      }
      if (screen === "create" || screen === "review") {
        go(tab);
        return true;
      }
      if (screen === "chat") {
        go(tab);
        return true;
      }
      if (screen === "notifications") {
        go("home", "home");
        return true;
      }
      if (screen === "completedDeals" || screen === "receivedReviews" || screen === "noshowDeals") {
        go("mypage", "mypage");
        return true;
      }
      if (screen === "profileEdit") {
        go("mypage", "mypage");
        return true;
      }
      if (screen === "map" || screen === "mypage") {
        go("home", "home");
        return true;
      }
      return false; // login / home → 시스템이 처리 (앱 종료)
    });
    return () => sub.remove();
  }, [screen, tab, showJoin, showReport, confirm]);

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 1900);
  }

  function openDeal(id: string) {
    setDetailFrom(screen);
    setSelectedId(id);
    setScreen("detail");
  }

  function openRoom(id: string) {
    setSelectedId(id);
    setScreen("chat");
  }

  function openCompletedDeals(mode: "view" | "review") {
    setCompletedDealsMode(mode);
    setScreen("completedDeals");
  }

  function openReceivedReviews() {
    setScreen("receivedReviews");
  }

  function openNoshowDeals() {
    setScreen("noshowDeals");
  }

  function startReviewFromCompletedDeal(deal: Deal) {
    setSelectedId(deal.id);
    setRatings({ time: 0, fair: 0, manner: 0, desc: 0 });
    setScreen("review");
  }

  /* 내 글 삭제(작성자 한정): 소프트 취소 + 내 채팅 목록에서 숨김 */
  function deletePost(deal: Deal) {
    setConfirm({
      title: "공구를 삭제할까요?",
      message: "삭제하면 목록에서 사라지고 되돌릴 수 없어요.",
      confirmLabel: "삭제",
      danger: true,
      onConfirm: async () => {
        setConfirm(null);
        if (isFirebaseConfigured()) {
          try {
            await cancelGongguDoc(deal.id, { hideForHost: true });
          } catch {
            showToast("삭제 중 오류가 발생했어요. 다시 시도해주세요.");
            return;
          }
        }
        setJoined((prev) => prev.filter((x) => x !== deal.id));
        go("home", "home");
        showToast("공구를 삭제했어요");
      },
    });
  }

  /* 채팅방 나가기: 방장이 나가면 공구 자체가 삭제(취소)되고, 참여자는 참여만 취소 */
  function leaveRoom(deal: Deal) {
    const isHost = deal.hostId === currentUser.id;
    const alreadyEnded = ["review_required", "completed", "canceled"].includes(
      deal.status,
    );
    setConfirm({
      title: "채팅방을 나갈까요?",
      message: isHost
        ? alreadyEnded
          ? "내 채팅 목록에서 이 방이 사라져요."
          : "공구가 삭제되고 채팅방이 종료돼요. 되돌릴 수 없어요."
        : "참여가 취소되고 채팅방에서 나가게 돼요.",
      confirmLabel: "나가기",
      danger: true,
      onConfirm: async () => {
        setConfirm(null);
        if (isFirebaseConfigured()) {
          try {
            if (isHost) {
              if (alreadyEnded) {
                await hideGongguChatDoc(deal.id);
              } else {
                await cancelGongguDoc(deal.id, { hideForHost: true });
              }
            } else {
              await cancelParticipationDoc(deal.id, currentUser);
            }
          } catch {
            showToast("나가기 중 오류가 발생했어요. 다시 시도해주세요.");
            return;
          }
        }
        setJoined((prev) => prev.filter((x) => x !== deal.id));
        go("chatList", "chat");
        showToast(
          isHost && !alreadyEnded ? "공구를 삭제했어요" : "채팅방에서 나갔어요",
        );
      },
    });
  }

  function completeGonggu(deal: Deal) {
    setConfirm({
      title: "거래완료로 표시할까요?",
      message: "참여자들에게 후기 작성 안내를 보내고 채팅방이 종료돼요.",
      confirmLabel: "거래완료",
      onConfirm: async () => {
        setConfirm(null);
        if (!isFirebaseConfigured()) {
          showToast("Firebase 설정이 필요해요.");
          return;
        }
        try {
          await completeGongguDoc(deal.id);
        } catch {
          showToast("거래완료 처리 중 오류가 발생했어요.");
          return;
        }
        const participantIds = data.participations
          .filter((p) => p.gongguId === deal.id)
          .map((p) => p.userId);
        void Promise.all(
          participantIds.map((uid) =>
            writeNotifDoc(uid, {
              type: "review",
              title: "거래가 완료됐어요!",
              body: `[${deal.title}] 후기를 남겨주세요`,
              gongguId: deal.id,
            }),
          ),
        );
        go("chatList", "chat");
        showToast("거래완료! 참여자들에게 후기 안내를 보냈어요");
      },
    });
  }

  async function submitReport(payload: {
    targetUserId: string;
    targetRole: ReportTargetRole;
    category: ReportCategory;
    detail: string;
  }) {
    if (!sel) return;
    setShowReport(false);
    if (!isFirebaseConfigured()) {
      showToast("Firebase 설정이 필요해요.");
      return;
    }
    try {
      await submitReportDoc({
        gongguId: sel.id,
        reporterId: currentUser.id,
        ...payload,
      });
      if (payload.category === "noshow") {
        const nextStats = await loadUserStatsDoc(payload.targetUserId).catch(() => null);
        setUserStatsById((prev) => ({
          ...prev,
          [payload.targetUserId]: nextStats ?? {},
        }));
      }
    } catch {
      showToast("신고 접수 중 오류가 발생했어요. 다시 시도해주세요.");
      return;
    }
    showToast("신고가 접수됐어요.");
  }

  async function confirmJoin(quantity: number) {
    if (!selectedId) return;
    if (isFirebaseConfigured()) {
      try {
        await joinGongguDoc(selectedId, currentUser, quantity);
      } catch (error) {
        showToast(
          error instanceof Error
            ? error.message
            : "참여 중 오류가 발생했어요. 다시 시도해주세요.",
        );
        return;
      }
    }
    setJoined((prev) => Array.from(new Set([...prev, selectedId])));
    setShowJoin(false);
    setScreen("chat");
    showToast("참여 완료! 채팅방에 입장했어요");
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || !selectedId) return;
    if (isFirebaseConfigured()) {
      try {
        await sendMessageDoc(selectedId, currentUser, trimmed);
      } catch {
        /* 실패해도 로컬에는 표시 */
      }
    } else {
      setExtraMsgs((prev) => [
        ...prev,
        { type: "me", name: currentUser.nickname, text: trimmed, time: "지금" },
      ]);
    }
  }

  async function handleCreate() {
    if (!verifiedLocation) {
      showToast("동네 인증 후 공구를 만들 수 있어요.");
      return;
    }

    const input = {
      title: cTitle.trim() || `${createCat} 공구`,
      category: createCat,
      totalPrice: Number(cTotal) || 0,
      totalQuantity: Number(cQty) || 1,
      qtyUnit: cQtyUnit,
      pickupPlaceName: cPickupUndecided ? "장소 미정" : (cPickupPlace?.name ?? "장소 미정"),
      pickupExpectedTime: cTimeUndecided ? "시간 미정" : formatPickupTime(cTimeDate!),
      splitMethod: "수량 기준 비례 분담",
      recruitmentDeadline: DEFAULT_RECRUITMENT_DEADLINE_LABEL,
      ...(cPickupUndecided ? {} : cPickupPlace
        ? {
          pickupLatitude: cPickupPlace.latitude,
          pickupLongitude: cPickupPlace.longitude,
          pickupNeighborhood: verifiedLocation?.neighborhood,
        }
        : verifiedLocation
          ? {
            pickupLatitude: verifiedLocation.latitude,
            pickupLongitude: verifiedLocation.longitude,
            pickupNeighborhood: verifiedLocation.neighborhood,
          }
          : {}),
    };

    if (!isFirebaseConfigured()) {
      showToast("Firebase 설정이 필요해요. apps/mobile/.env를 설정해주세요.");
      return;
    }

    try {
      await createGongguDoc(input, currentUser);
    } catch {
      showToast("공구 생성에 실패했어요. 다시 시도해주세요.");
      return;
    }

    setCTitle("");
    setCreateCat("");
    setCTotal("");
    setCQty("");
    setCQtyUnit("개");
    setCPickupPlace(null);
    setCPickupUndecided(false);
    setCTimeDate(null);
    setCTimeUndecided(false);
    go("home", "home");
    showToast("공구가 게시됐어요! 🎉");
  }

  async function handleReview(comment: string) {
    if (!sel) return;
    const gonggu = data.gonggus.find((g) => g.id === sel.id);
    if (gonggu && isFirebaseConfigured()) {
      try {
        const avg = Object.values(ratings).reduce((a, b) => a + b, 0) / 4;
        const tags = Object.entries(ratings)
          .filter(([, value]) => value >= 4)
          .map(([key]) => REVIEW_TAG_LABELS[key as ReviewKey]);
        await submitReviewDoc(
          gonggu,
          currentUser,
          Math.round(avg) || 3,
          comment,
          tags,
        );
      } catch {
        /* 실패해도 화면 전환은 진행 */
      }
    }
    go("mypage", "mypage");
    showToast("후기가 등록됐어요. 고마워요!");
  }

  async function saveProfileNickname(nextNickname: string) {
    const trimmed = nextNickname.trim();
    if (!trimmed) return;

    const nicknameChanged = trimmed !== currentUser.nickname.trim();
    if (nicknameChanged && !nicknameChangeState.canChange) {
      showToast("닉네임은 30일에 한 번만 바꿀 수 있어요.");
      return;
    }

    const changedAt = nicknameChanged
      ? new Date().toISOString()
      : lastNicknameChangedAt;
    setNickname(trimmed);
    setLastNicknameChangedAt(changedAt);

    const uid = auth.user?.uid;
    const profile: UserProfileDoc = {
      nickname: trimmed,
      lastNicknameChangedAt: changedAt,
      verifiedLocation,
      profileImageUrl,
    };

    if (uid) {
      try {
        await saveUserProfileDoc(uid, profile);
        await AsyncStorage.setItem(
          profileStorageKey(uid),
          JSON.stringify(profile),
        );
      } catch {
        showToast("프로필 저장에 실패했어요. 다시 시도해주세요.");
        return;
      }
    }

    go("mypage", "mypage");
    showToast("프로필을 저장했어요");
  }

  async function changeProfileImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToast("사진 접근 권한이 필요해요.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]?.uri) return;

    const uid = auth.user?.uid;
    if (!uid || auth.user?.isAnonymous || !isFirebaseConfigured()) {
      setProfileImageUrl(result.assets[0].uri);
      showToast("프로필 사진을 변경했어요");
      return;
    }

    setProfileImageUploading(true);
    try {
      const imageUrl = await uploadUserProfileImage(uid, result.assets[0].uri);
      const profile: UserProfileDoc = {
        nickname: currentUser.nickname,
        lastNicknameChangedAt,
        verifiedLocation,
        profileImageUrl: imageUrl,
      };
      await saveUserProfileDoc(uid, profile);
      await AsyncStorage.setItem(profileStorageKey(uid), JSON.stringify(profile));
      setProfileImageUrl(imageUrl);
      showToast("프로필 사진을 변경했어요");
    } catch {
      showToast("프로필 사진 저장에 실패했어요. 다시 시도해주세요.");
    } finally {
      setProfileImageUploading(false);
    }
  }

  async function findNeighborhoodFromProfile() {
    setLocating(true);
    setLocateError(null);
    try {
      const location = await verifyNeighborhood();
      setVerifiedLocation(location);
      const uid = auth.user?.uid;
      if (uid) {
        const profile: UserProfileDoc = {
          nickname: currentUser.nickname,
          lastNicknameChangedAt,
          verifiedLocation: location,
          profileImageUrl,
        };
        try {
          await saveUserProfileDoc(uid, profile);
          await AsyncStorage.setItem(profileStorageKey(uid), JSON.stringify(profile));
        } catch {
          showToast("동네 저장에 실패했어요. 다시 시도해주세요.");
          return;
        }
      }
      showToast("동네를 다시 확인했어요");
    } catch (error: unknown) {
      setLocateError(mapLocationError(error));
    } finally {
      setLocating(false);
    }
  }

  /**
   * 온보딩(닉네임+동네 인증) 완료 → 프로필을 영속화하고 홈으로.
   * 저장은 best-effort(실패해도 홈 진입은 막지 않음). 저장돼야 다음 새로고침에서 홈으로 복원된다.
   */
  async function completeOnboarding() {
    const uid = auth.user?.uid;
    if (uid) {
      const profile: UserProfileDoc = {
        nickname: nickname.trim(),
        lastNicknameChangedAt,
        verifiedLocation,
        profileImageUrl,
      };
      try {
        await saveUserProfileDoc(uid, profile);
        await AsyncStorage.setItem(profileStorageKey(uid), JSON.stringify(profile));
      } catch {
        /* 저장 실패해도 온보딩 진행은 막지 않는다 (다음 진입 때 재저장 가능) */
      }
    }
    go("home", "home");
  }

  function toggleNotif(key: NotifKey) {
    setNotif((prev) => {
      const next: NotifSettings = {
        ...prev,
        [key]: !prev[key],
      };
      const uid = auth.user?.uid;
      if (uid && !auth.user?.isAnonymous) {
        void saveNotifSettings(uid, next).catch(() => {
          setNotif(prev);
          showToast("알림 설정 저장에 실패했어요.");
        });
      }
      return next;
    });
  }

  const showNav = (
    ["home", "map", "chatList", "chat", "mypage"] as Screen[]
  ).includes(screen);

  /*
   * 세션/프로필 복원 판정이 끝나기 전(로그인 화면 단계)에는 로그인 UI 대신 스플래시를 보여
   * 새로고침 시 login → home/verify 로 튀는 깜빡임을 가린다. (시드 모드는 status "disabled" 라 해당 없음)
   */
  const bootPending =
    screen === "login" &&
    (auth.status === "loading" ||
      (!!auth.user && !auth.user.isAnonymous && !profileLoaded));

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={t.card}
        translucent={false}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={[styles.root, Platform.OS === "web" && styles.rootWeb]}>
          <View
            style={[styles.body, !showNav && { paddingBottom: insets.bottom }]}
          >
            {screen === "login" &&
              (bootPending ? (
                <View style={[styles.flex, { alignItems: "center", justifyContent: "center" }]}>
                  <ActivityIndicator size="large" color={t.pink} />
                </View>
              ) : (
                <LoginScreen
                  auth={auth}
                  onFirebaseRequired={() => {
                    showToast("Firebase 설정이 필요해요. apps/mobile/.env를 설정해주세요.");
                  }}
                  onGoogleLogin={() => {
                    skipSocialAutoVerifyRef.current = false;
                  }}
                />
              ))}

            {screen === "verify" && (
              <VerifyScreen
                step={verifyStep}
                nickname={nickname}
                locating={locating}
                locateError={locateError}
                neighborhood={verifiedLocationLabel}
                onNick={setNickname}
                onNext={() => {
                  if (nickname.trim()) {
                    setLocateError(null);
                    setVerifyStep(1);
                  }
                }}
                onLocate={() => {
                  setLocating(true);
                  setLocateError(null);
                  void verifyNeighborhood()
                    .then((location) => {
                      setVerifiedLocation(location);
                      setVerifyStep(2);
                    })
                    .catch((error: unknown) => {
                      setLocateError(mapLocationError(error));
                    })
                    .finally(() => setLocating(false));
                }}
                onStart={() => void completeOnboarding()}
              />
            )}

            {screen === "home" && (
              <GongguHomeScreen
                deals={feedDeals}
                locationLabel={verifiedLocationLabel}
                isLocationVerified={Boolean(verifiedLocation)}
                filter={homeFilter}
                onFilter={setHomeFilter}
                onOpen={openDeal}
                hasUnread={notifItems.some((n) => !n.read)}
                onBell={() => setScreen("notifications")}
                onLocationPress={() =>
                  setConfirm({
                    title: "동네 다시 인증",
                    message: "현재 위치로 동네를 다시 인증할까요?",
                    confirmLabel: "다시 인증",
                    onConfirm: () => {
                      setConfirm(null);
                      void findNeighborhoodFromProfile();
                    },
                  })
                }
              />
            )}

            {screen === "map" && (
              <MapScreen
                deals={mapDeals}
                verifiedLocation={verifiedLocation}
                locationLabel={verifiedLocationLabel}
                mapSel={mapSel}
                pick={mapPick}
                onPickMarker={setMapSel}
                onList={() => go("home", "home")}
                onOpen={() => openDeal(mapSel)}
              />
            )}

            {screen === "detail" && sel && (
              <GongguDetailScreen
                deal={sel}
                hearted={hearts.includes(sel.id)}
                joined={joined.includes(sel.id)}
                isHost={sel.hostId === currentUser.id}
                onBack={() => {
                  if (detailFrom === "notifications") {
                    go("notifications");
                  } else if (detailFrom === "completedDeals") {
                    go("completedDeals", "mypage");
                  } else if (detailFrom === "noshowDeals") {
                    go("noshowDeals", "mypage");
                  } else {
                    go(tab);
                  }
                }}
                onHeart={() =>
                  setHearts((prev) =>
                    prev.includes(sel.id)
                      ? prev.filter((x) => x !== sel.id)
                      : [...prev, sel.id],
                  )
                }
                onDelete={() => deletePost(sel)}
                onCta={() => {
                  if (joined.includes(sel.id)) openRoom(sel.id);
                  else setShowJoin(true);
                }}
              />
            )}

            {screen === "chatList" && (
              <ChatListScreen
                rooms={myRooms}
                meId={currentUser.id}
                onOpen={openRoom}
                onLeave={leaveRoom}
              />
            )}

            {screen === "chat" &&
              (sel ? (
                <ChatScreen
                  deal={sel}
                  messages={chatMsgs}
                  isHost={sel.hostId === currentUser.id}
                  onBack={() => go("chatList", "chat")}
                  onSend={sendMessage}
                  onLeave={() => leaveRoom(sel)}
                  onComplete={() => completeGonggu(sel)}
                  onOpenDetail={() => openDeal(sel.id)}
                  onReport={() => setShowReport(true)}
                />
              ) : (
                <EmptyState
                  emoji="💬"
                  title="참여 중인 채팅이 없어요"
                  desc={
                    "공구에 참여하면 채팅방이 열려요.\n홈에서 마음에 드는 공구를 찾아보세요!"
                  }
                />
              ))}

            {screen === "create" && (
              <CreateScreen
                cat={createCat}
                onCat={setCreateCat}
                title={cTitle}
                onTitle={setCTitle}
                total={cTotal}
                qty={cQty}
                qtyUnit={cQtyUnit}
                onTotal={setCTotal}
                onQty={setCQty}
                onQtyUnit={setCQtyUnit}
                pickupPlace={cPickupPlace}
                pickupUndecided={cPickupUndecided}
                onPickupPlace={(place) => { setCPickupPlace(place); setCPickupUndecided(false); }}
                onPickupUndecided={setCPickupUndecided}
                timeDate={cTimeDate}
                onTimeDate={setCTimeDate}
                timeUndecided={cTimeUndecided}
                onTimeUndecided={setCTimeUndecided}
                initialCenter={verifiedLocation
                  ? { lat: verifiedLocation.latitude, lng: verifiedLocation.longitude }
                  : undefined}
                locationAvailable={!!verifiedLocation}
                onBack={() => go(tab)}
                onPost={handleCreate}
              />
            )}

            {screen === "review" && sel && (
              <ReviewScreen
                deal={sel}
                ratings={ratings}
                onRate={(key, value) =>
                  setRatings((prev) => ({ ...prev, [key]: value }))
                }
                onBack={() => go("mypage", "mypage")}
                onSubmit={handleReview}
              />
            )}

            {screen === "mypage" && (
              <MyPageScreen
                nickname={currentUser.nickname}
                profileImageUrl={profileImageUrl}
                locationLabel={verifiedLocationLabel}
                mannerScore={myPageStats.mannerScore}
                completedDealCount={myPageStats.completedDealCount}
                receivedReviewCount={myPageStats.receivedReviewCount}
                noshowCount={myPageStats.noshowCount}
                reviewTags={myPageStats.reviewTags}
                notif={notif}
                onToggle={toggleNotif}
                onEditProfile={() => setScreen("profileEdit")}
                onOpenCompletedDeals={() => openCompletedDeals("view")}
                onOpenReceivedReviews={openReceivedReviews}
                onOpenNoshowDeals={openNoshowDeals}
                onReviewDemo={() => openCompletedDeals("review")}
              />
            )}

            {screen === "profileEdit" && (
              <ProfileEditScreen
                nickname={currentUser.nickname}
                profileImageUrl={profileImageUrl}
                locationLabel={verifiedLocationLabel}
                canChangeNickname={nicknameChangeState.canChange}
                nextNicknameChangeDate={nicknameChangeState.nextDate}
                locationLoading={locating}
                imageUploading={profileImageUploading}
                locationError={locateError}
                onBack={() => go("mypage", "mypage")}
                onSave={(nextNickname) => void saveProfileNickname(nextNickname)}
                onChangeProfileImage={() => void changeProfileImage()}
                onFindNeighborhood={() => void findNeighborhoodFromProfile()}
              />
            )}

            {screen === "completedDeals" && (
              <CompletedDealsScreen
                deals={
                  completedDealsMode === "review"
                    ? reviewableDeals
                    : completedDeals
                }
                meId={currentUser.id}
                title={
                  completedDealsMode === "review"
                    ? "후기 작성할 거래"
                    : "완료된 거래"
                }
                emptyTitle={
                  completedDealsMode === "review"
                    ? "후기 작성할 거래가 없어요"
                    : "완료된 거래가 없어요"
                }
                emptyDesc={
                  completedDealsMode === "review"
                    ? "거래가 완료되면 후기 작성이 가능해요."
                    : "거래가 완료되면 이곳에서 다시 확인할 수 있어요."
                }
                onBack={() => go("mypage", "mypage")}
                onOpen={
                  completedDealsMode === "view"
                    ? (deal) => openDeal(deal.id)
                    : undefined
                }
                onSelect={
                  completedDealsMode === "review"
                    ? startReviewFromCompletedDeal
                    : undefined
                }
              />
            )}

            {screen === "receivedReviews" && (
              <ReceivedReviewsScreen
                reviews={receivedReviews}
                deals={deals}
                onBack={() => go("mypage", "mypage")}
              />
            )}

            {screen === "noshowDeals" && (
              <CompletedDealsScreen
                deals={noshowDeals}
                meId={currentUser.id}
                title="노쇼 신고된 공구"
                emptyTitle="노쇼 신고된 공구가 없어요"
                emptyDesc="노쇼로 신고된 공구가 있으면 이곳에서 확인할 수 있어요."
                statusLabel="노쇼 신고"
                onBack={() => go("mypage", "mypage")}
                onOpen={(deal) => openDeal(deal.id)}
              />
            )}

            {screen === "notifications" && (
              <NotifScreen
                items={notifItems}
                deals={deals}
                onBack={() => go("home", "home")}
                onOpen={(gongguId, notifId) => {
                  const uid = auth.user?.uid;
                  if (uid) void markNotifReadDoc(uid, notifId);
                  setDetailFrom("notifications");
                  setSelectedId(gongguId);
                  setScreen("detail");
                }}
                onClear={() => {
                  const uid = auth.user?.uid;
                  if (uid) void clearNotifsDoc(uid);
                }}
              />
            )}
          </View>

          {showNav && (
            <BottomNav
              active={(screen === "chatList" ? "chat" : screen) as MainTab}
              onHome={() => go("home", "home")}
              onMap={() => go("map", "map")}
              onCreate={() => setScreen("create")}
              onChat={() => go("chatList", "chat")}
              onMy={() => go("mypage", "mypage")}
            />
          )}

          {showJoin && sel && (
            <GongguJoinSheet
              deal={sel}
              onClose={() => setShowJoin(false)}
              onConfirm={confirmJoin}
            />
          )}

          {showReport && sel && (
            <ReportSheet
              members={reportableMembers}
              onClose={() => setShowReport(false)}
              onSubmit={submitReport}
            />
          )}

          {confirm && (
            <ConfirmSheet
              title={confirm.title}
              message={confirm.message}
              confirmLabel={confirm.confirmLabel}
              danger={confirm.danger}
              onConfirm={confirm.onConfirm}
              onClose={() => setConfirm(null)}
            />
          )}

          {pendingReviewDeal && showNav && (
            <ConfirmSheet
              title="후기를 남겨주세요!"
              message={`[${pendingReviewDeal.title}] 거래가 완료됐어요. 참여 후기를 남겨주시겠어요?`}
              confirmLabel="후기 작성"
              onConfirm={() => {
                setSelectedId(pendingReviewDeal.id);
                setRatings({ time: 0, fair: 0, manner: 0, desc: 0 });
                setScreen("review");
              }}
              onClose={() =>
                setDismissedReviewIds((prev) => [...prev, pendingReviewDeal.id])
              }
            />
          )}

          {!!toast && (
            <View style={styles.toast} pointerEvents="none">
              <Text style={styles.toastText}>{toast}</Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
