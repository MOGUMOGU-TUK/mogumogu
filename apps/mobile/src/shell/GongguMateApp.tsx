import { useEffect, useMemo, useRef, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import {
  BackHandler,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { useFirebaseAuth, type UseFirebaseAuth } from "../features/auth/useFirebaseAuth";
import { useChatMessages } from "../features/chat/useChatMessages";
import { useFirestoreData } from "../features/data/useFirestoreData";
import { sendMessageDoc } from "../services/firebase/chatRepository";
import { isFirebaseConfigured } from "../services/firebase/client";
import {
  cancelGongguDoc,
  createGongguDoc,
  hideGongguChatDoc,
  updateGongguDoc
} from "../services/firebase/gongguRepository";
import {
  cancelParticipationDoc,
  joinGongguDoc,
  submitReviewDoc
} from "../services/firebase/participationRepository";
import type { ChatMessage, Gonggu, Review, User } from "../types/domain";

/* ------------------------------------------------------------------ */
/* Design tokens (모구모구.html 시안 기준)                              */
/* ------------------------------------------------------------------ */

const t = {
  bg: "#F5F0F2",
  card: "#FFFFFF",
  ink: "#1C1A15",
  inkSoft: "#3A372F",
  muted: "#8A867C",
  dim: "#B3A8AC",
  line: "#EFE7EA",
  border: "#E2D9DC",
  pink: "#F7A1B5",
  rose: "#EC5578",
  roseSoft: "#FFF0F5",
  roseInk: "#6E0C2D",
  chipInk: "#6B6862",
  urgentInk: "#E8542A",
  urgentBg: "#FCE3D8",
  calmBg: "#F0E8EB",
  kakao: "#FEE500",
  kakaoInk: "#191600",
  greenInk: "#2F9E6B",
  greenBg: "#E4F3EB",
  trackOff: "#D4C8CC"
};

const TEMP_STOPS = ["#5B9BD5", "#FFC247", "#EC5578"];

/* ------------------------------------------------------------------ */
/* Types & data                                                        */
/* ------------------------------------------------------------------ */

type Screen =
  | "login"
  | "verify"
  | "home"
  | "map"
  | "detail"
  | "chatList"
  | "chat"
  | "create"
  | "review"
  | "mypage";

type MainTab = "home" | "map" | "chat" | "mypage";

type Deal = {
  id: string;
  cat: string;
  title: string;
  store: string;
  total: number;
  cur: number;
  max: number;
  dist: string;
  deadline: string;
  urgent: boolean;
  spot: string;
  pickup: string;
  leader: string;
  temp: number;
  deals: number;
  reviews: number;
  noshow: number;
  tint: string;
  method: string;
  desc: string;
  images: string[];
  hostUserId: string;
  closed: boolean;
  hostHidden: boolean;
};

const HOME_FILTERS = ["전체", "식품", "생활", "패션", "반려동물", "가구/인테리어", "스포츠", "기타"];
const CREATE_CATS = ["식품", "생활", "패션", "반려동물", "가구/인테리어", "스포츠", "기타"];

type ChatMsg = { type: "system" | "other" | "me"; name?: string; text: string; time?: string };

/* Gonggu → Deal 어댑터 */
const CATEGORY_TINTS: Record<string, string> = {
  식품: "#CFE2EC",
  생활: "#D8E0CC",
  패션: "#E8D5E5",
  반려동물: "#E3D2C3",
  "가구/인테리어": "#F3DEC4",
  스포츠: "#C9E4CA",
  기타: "#EEE0E5"
};

function mapPos(id: string): { left: string; top: string } {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = ((h * 31 + id.charCodeAt(i)) >>> 0);
  const left = 18 + Math.round(((h & 0xff) / 255) * 62);
  const top = 14 + Math.round((((h >> 8) & 0xff) / 255) * 64);
  return { left: `${left}%`, top: `${top}%` };
}

function gongguToUi(g: Gonggu, reviews: Review[]): Deal {
  const gReviews = reviews.filter((r) => r.gongguId === g.id);
  return {
    id: g.id,
    cat: g.category || "기타",
    title: g.title,
    store: g.purchaseStore === "직접 입력" ? "" : g.purchaseStore,
    total: g.totalPrice,
    cur: g.currentParticipants,
    max: g.targetParticipants,
    dist: g.pickupDistanceMeters > 0 ? `${g.pickupDistanceMeters}m` : "근처",
    deadline: formatDeadline(g.recruitmentDeadline),
    urgent: isUrgentDeadline(g.recruitmentDeadline),
    spot: g.pickupPlaceName,
    pickup: g.pickupExpectedTime,
    leader: g.hostNickname,
    temp: g.hostTrustScore,
    deals: 0,
    reviews: gReviews.length,
    noshow: 0,
    tint: CATEGORY_TINTS[g.category] ?? "#EEE0E5",
    method: g.splitMethod,
    desc: g.description,
    images: g.imageUrls ?? [],
    hostUserId: g.hostUserId,
    closed: g.status === "canceled",
    hostHidden: g.hostHidden ?? false
  };
}

function chatMsgFromDomain(m: ChatMessage, myId: string): ChatMsg {
  if (m.messageType === "system") return { type: "system", text: m.text };
  return {
    type: m.senderId === myId ? "me" : "other",
    name: m.senderName,
    text: m.text,
    time: new Date(m.createdAt).toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit"
    })
  };
}

const SEED_MSGS: ChatMsg[] = [
  { type: "system", text: "공구방이 열렸어요. 픽업 장소와 소분 방식을 확인해주세요" },
  { type: "other", name: "공구장", text: "안녕하세요! 픽업 시간에 맞춰 준비해둘게요 😊", time: "오후 4:02" }
];

const REVIEW_QUESTIONS: Array<{ key: ReviewKey; label: string }> = [
  { key: "time", label: "시간 약속을 잘 지켰나요?" },
  { key: "fair", label: "소분이 공정했나요?" },
  { key: "manner", label: "소통이 매너있었나요?" },
  { key: "desc", label: "상품 설명과 일치했나요?" }
];

const NOTIF_ITEMS: Array<{ key: NotifKey; label: string }> = [
  { key: "join", label: "새 참여자 발생" },
  { key: "full", label: "모집 인원 달성" },
  { key: "deadline", label: "모집 마감 임박" },
  { key: "chat", label: "새 채팅 메시지" }
];

type ReviewKey = "time" | "fair" | "manner" | "desc";
type NotifKey = "join" | "full" | "deadline" | "chat";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function toDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function buildDeadlineIso(dateStr: string, hhmm: string): string {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const [h, m] = hhmm.split(":").map(Number);
  const date = new Date(y ?? 1970, (mo ?? 1) - 1, d ?? 1, h ?? 23, m ?? 59, 0, 0);
  return date.toISOString();
}

function formatDateLabel(dateStr: string): string {
  const dayDiff = Math.round(
    (new Date(dateStr).getTime() - new Date(toDateStr(new Date())).getTime()) / 86400000
  );
  if (dayDiff === 0) return "오늘";
  if (dayDiff === 1) return "내일";
  if (dayDiff === 2) return "모레";
  const [, mo, d] = dateStr.split("-").map(Number);
  return `${mo}월 ${d}일`;
}

/** ISO 타임스탬프면 "n분/시간/일 뒤 마감"으로 환산, 옛 포맷(고정 문구) 데이터면 그대로 보여준다. */
function formatDeadline(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const diffMs = date.getTime() - Date.now();
  if (diffMs <= 0) return "마감";
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 60) return `${diffMin}분 뒤 마감`;
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 뒤 마감`;
  return `${Math.round(diffHour / 24)}일 뒤 마감`;
}

function isUrgentDeadline(value: string): boolean {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return /[12]시간|30분|마감/.test(value);
  return date.getTime() - Date.now() <= 2 * 60 * 60 * 1000;
}

const fmt = (n: number) => `${Number(n).toLocaleString("ko-KR")}원`;
const per = (d: Deal) => Math.ceil(d.total / d.max);
const memberStr = (d: Deal) => `${d.cur}/${d.max}명`;
const barPct = (d: Deal) => Math.round((d.cur / d.max) * 100);
const remain = (d: Deal) => `앞으로 ${d.max - d.cur}명`;
const statusOf = (d: Deal) => (d.closed ? "종료" : d.cur >= d.max ? "모집완료" : "모집중");
const tempStr = (n: number) => `${n.toFixed(1)}°C`;

function tempColor(n: number) {
  if (n >= 40) return t.urgentInk;
  if (n >= 38) return t.rose;
  if (n >= 37) return "#F0A23C";
  return "#5B9BD5";
}

function tempRatio(n: number) {
  return Math.max(0, Math.min(1, (n - 33) / (45 - 33)));
}

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16)
  };
}

function lerpColor(c1: string, c2: string, ratio: number) {
  const a = hexToRgb(c1);
  const b = hexToRgb(c2);
  const r = Math.round(a.r + (b.r - a.r) * ratio);
  const g = Math.round(a.g + (b.g - a.g) * ratio);
  const bl = Math.round(a.b + (b.b - a.b) * ratio);
  return `rgb(${r}, ${g}, ${bl})`;
}

function gradientColor(stops: string[], ratio: number) {
  if (ratio <= 0) return stops[0]!;
  if (ratio >= 1) return stops[stops.length - 1]!;
  const scaled = ratio * (stops.length - 1);
  const idx = Math.floor(scaled);
  return lerpColor(stops[idx]!, stops[idx + 1]!, scaled - idx);
}

/* ------------------------------------------------------------------ */
/* Root                                                                */
/* ------------------------------------------------------------------ */

export function GongguMateApp() {
  const insets = useSafeAreaInsets();
  const [screen, setScreen] = useState<Screen>("login");
  const [tab, setTab] = useState<MainTab>("home");
  const [selectedId, setSelectedId] = useState("");
  const [mapSel, setMapSel] = useState("");
  const [joined, setJoined] = useState<string[]>([]);
  const [hearts, setHearts] = useState<string[]>([]);
  const [leftChatIds, setLeftChatIds] = useState<string[]>([]);
  const [showJoin, setShowJoin] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showHostLeaveConfirm, setShowHostLeaveConfirm] = useState(false);
  const [toast, setToast] = useState("");

  const [nickname, setNickname] = useState("");
  const [verifyStep, setVerifyStep] = useState(0);
  const [locating, setLocating] = useState(false);

  const [extraMsgs, setExtraMsgs] = useState<ChatMsg[]>([]);
  const [homeFilter, setHomeFilter] = useState("전체");
  const [createCat, setCreateCat] = useState("식품");
  const [cTitle, setCTitle] = useState("");
  const [cTotal, setCTotal] = useState("");
  const [cMembers, setCMembers] = useState("");
  const [cPickup, setCPickup] = useState("");
  const [cTime, setCTime] = useState("");
  const [cSplit, setCSplit] = useState("");
  const [cPhotos, setCPhotos] = useState<string[]>([]);
  const [cDeadlineDate, setCDeadlineDate] = useState(() => toDateStr(new Date()));
  const [cDeadlineTime, setCDeadlineTime] = useState("23:59");
  const [editingGongguId, setEditingGongguId] = useState<string | null>(null);
  const [ratings, setRatings] = useState<Record<ReviewKey, number>>({
    time: 0,
    fair: 0,
    manner: 0,
    desc: 0
  });
  const [notif, setNotif] = useState<Record<NotifKey, boolean>>({
    join: true,
    full: true,
    deadline: true,
    chat: false
  });

  /* ── Firebase 훅 ── */
  const auth = useFirebaseAuth();
  const data = useFirestoreData();

  /* ── 도메인 → UI 어댑터 ── */
  const deals = useMemo(
    () => data.gonggus.map((g) => gongguToUi(g, data.reviews)),
    [data.gonggus, data.reviews]
  );

  /* 홈/지도 탐색용: 삭제(종료)된 공구는 목록에서 제외 */
  const browsableDeals = useMemo(() => deals.filter((d) => !d.closed), [deals]);

  /* 첫 딜 로드 시 selectedId / mapSel 초기화 */
  useEffect(() => {
    if (browsableDeals.length > 0 && !selectedId) {
      setSelectedId(browsableDeals[0]!.id);
      setMapSel(browsableDeals[0]!.id);
    }
  }, [browsableDeals, selectedId]);

  /* Google 로그인 성공 시 자동 진입 */
  useEffect(() => {
    if (screen === "login" && auth.user && !auth.user.isAnonymous) {
      go("home", "home");
    }
  }, [auth.user, screen]);

  /* 현재 사용자 (도메인 타입) */
  const currentUser = useMemo<User>(
    () => ({
      id: auth.user?.uid ?? "user_me",
      nickname: nickname.trim() || auth.user?.displayName || "봉천동이웃",
      neighborhood: "봉천동",
      universityVerified: false,
      locationVerified: true,
      trustScore: 36.5,
      completedGongguCount: 0
    }),
    [auth.user, nickname]
  );

  /* 채팅 실시간 구독 */
  const liveMessages = useChatMessages(selectedId);
  const chatMsgs: ChatMsg[] = useMemo(
    () =>
      liveMessages
        ? liveMessages.map((m) => chatMsgFromDomain(m, currentUser.id))
        : [...SEED_MSGS, ...extraMsgs],
    [liveMessages, extraMsgs, currentUser.id]
  );

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sel = useMemo(
    () => deals.find((d) => d.id === selectedId) ?? deals[0] ?? null,
    [deals, selectedId]
  );
  const mapPick = useMemo(
    () => browsableDeals.find((d) => d.id === mapSel) ?? browsableDeals[0] ?? null,
    [browsableDeals, mapSel]
  );

  /* 채팅 목록: 내가 만들었거나 참여 중인 공구만 (나가기 누른 방은 즉시 숨김, 방장 쪽은 hostHidden 으로 영구 반영) */
  const myChats = useMemo(() => {
    const joinedIds = new Set(
      data.participations.filter((p) => p.userId === currentUser.id).map((p) => p.gongguId)
    );
    return deals
      .filter((d) => {
        if (leftChatIds.includes(d.id)) return false;
        if (d.hostUserId === currentUser.id) return !d.hostHidden;
        return joinedIds.has(d.id);
      })
      .map((deal) => ({ deal, isHost: deal.hostUserId === currentUser.id }));
  }, [deals, data.participations, currentUser.id, leftChatIds]);

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

  /* 탭의 루트 화면으로 복귀 ("chat" 탭의 루트는 채팅 목록) */
  function goToTabRoot() {
    go(tab === "chat" ? "chatList" : tab);
  }

  function resetCreateForm() {
    setCreateCat("식품");
    setCTitle("");
    setCTotal("");
    setCMembers("");
    setCPickup("");
    setCTime("");
    setCSplit("");
    setCPhotos([]);
    setCDeadlineDate(toDateStr(new Date()));
    setCDeadlineTime("23:59");
  }

  /* "공구 만들기/수정" 화면 나가기: 수정 중이었으면 상세화면으로, 아니면 탭 루트로 */
  function exitCreateScreen() {
    const wasEditing = editingGongguId !== null;
    setEditingGongguId(null);
    resetCreateForm();
    if (wasEditing) go("detail");
    else goToTabRoot();
  }

  /* Android 물리 뒤로가기 버튼 */
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (showDeleteConfirm) { setShowDeleteConfirm(false); return true; }
      if (showLeaveConfirm) { setShowLeaveConfirm(false); return true; }
      if (showHostLeaveConfirm) { setShowHostLeaveConfirm(false); return true; }
      if (showJoin) { setShowJoin(false); return true; }
      if (screen === "verify") { setScreen("login"); return true; }
      if (screen === "create") { exitCreateScreen(); return true; }
      if (screen === "detail" || screen === "review") { goToTabRoot(); return true; }
      if (screen === "chat") { go("chatList", "chat"); return true; }
      if (screen === "map" || screen === "mypage" || screen === "chatList") { go("home", "home"); return true; }
      return false; // login / home → 시스템이 처리 (앱 종료)
    });
    return () => sub.remove();
  }, [screen, tab, showJoin, showDeleteConfirm, showLeaveConfirm, showHostLeaveConfirm, editingGongguId]);

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 1900);
  }

  function openDeal(id: string) {
    setSelectedId(id);
    setScreen("detail");
  }

  function openChatRoom(id: string) {
    setSelectedId(id);
    go("chat", "chat");
  }

  /* 방장이 본인 공구 내용을 고치러 들어갈 때 폼에 기존 값을 채워둔다 */
  function startEdit() {
    const gonggu = data.gonggus.find((g) => g.id === selectedId);
    if (!gonggu) return;
    setCreateCat(gonggu.category);
    setCTitle(gonggu.title);
    setCTotal(String(gonggu.totalPrice));
    setCMembers(String(gonggu.targetParticipants));
    setCPickup(gonggu.pickupPlaceName);
    setCTime(gonggu.pickupExpectedTime);
    setCSplit(gonggu.splitMethod);
    setCPhotos(gonggu.imageUrls ?? []);

    const deadline = new Date(gonggu.recruitmentDeadline);
    if (Number.isNaN(deadline.getTime())) {
      setCDeadlineDate(toDateStr(new Date()));
      setCDeadlineTime("23:59");
    } else {
      setCDeadlineDate(toDateStr(deadline));
      setCDeadlineTime(
        `${String(deadline.getHours()).padStart(2, "0")}:${String(deadline.getMinutes()).padStart(2, "0")}`
      );
    }

    setEditingGongguId(gonggu.id);
    setScreen("create");
  }

  async function confirmJoin() {
    if (!selectedId) return;
    if (isFirebaseConfigured()) {
      try {
        await joinGongguDoc(selectedId, currentUser);
      } catch (e) {
        showToast(e instanceof Error ? e.message : "참여 중 오류가 발생했어요. 다시 시도해주세요.");
        return;
      }
    }
    setJoined((prev) => Array.from(new Set([...prev, selectedId])));
    setLeftChatIds((prev) => prev.filter((id) => id !== selectedId));
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
    }
    if (!isFirebaseConfigured()) {
      setExtraMsgs((prev) => [...prev, { type: "me", name: currentUser.nickname, text: trimmed, time: "지금" }]);
    }
  }

  async function pickPhoto() {
    if (cPhotos.length >= 5) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToast("사진 접근 권한이 필요해요.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: 5 - cPhotos.length
    });
    if (!result.canceled) {
      setCPhotos((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, 5));
    }
  }

  function removePhoto(uri: string) {
    setCPhotos((prev) => prev.filter((p) => p !== uri));
  }

  async function handleCreate() {
    const editingId = editingGongguId;
    const payload = {
      title: cTitle.trim() || `${createCat} 공구`,
      category: createCat,
      totalPrice: Number(cTotal) || 0,
      targetParticipants: cMembers ? Math.max(2, Number(cMembers)) : 4,
      pickupPlaceName: cPickup || "장소 미정",
      pickupExpectedTime: cTime || "시간 미정",
      splitMethod: cSplit.trim() || "참여 인원 기준 1/N 소분",
      recruitmentDeadline: buildDeadlineIso(cDeadlineDate, cDeadlineTime)
    };

    if (isFirebaseConfigured()) {
      try {
        if (editingId) {
          await updateGongguDoc(editingId, { ...payload, imageUris: cPhotos });
        } else {
          await createGongguDoc({ ...payload, imageUris: cPhotos }, currentUser);
        }
      } catch {
        showToast(
          editingId ? "공구 수정에 실패했어요. 다시 시도해주세요." : "공구 생성에 실패했어요. 다시 시도해주세요."
        );
        return;
      }
    }

    setEditingGongguId(null);
    resetCreateForm();
    if (editingId) {
      go("detail");
      showToast("공구가 수정됐어요!");
    } else {
      go("home", "home");
      showToast("공구가 게시됐어요! 🎉");
    }
  }

  /* 방장이 공구를 삭제(종료): 목록에서 사라지고, 채팅방은 종료 안내 메시지와 함께 읽기 전용이 된다 */
  async function handleDeleteGonggu() {
    if (!selectedId) return;
    if (isFirebaseConfigured()) {
      try {
        await cancelGongguDoc(selectedId);
      } catch {
        showToast("공구 삭제에 실패했어요. 다시 시도해주세요.");
        return;
      }
    }
    setShowDeleteConfirm(false);
    setShowHostLeaveConfirm(false);
    go("home", "home");
    showToast("공구가 삭제됐어요.");
  }

  /* 방장이 모집 중인 공구방에서 "나가기": 공구 삭제 + 본인 채팅 목록에서 숨기기를 한 번에 처리 */
  async function handleHostLeaveGonggu() {
    if (!selectedId) return;
    if (isFirebaseConfigured()) {
      try {
        await cancelGongguDoc(selectedId, { hideForHost: true });
      } catch {
        showToast("나가기에 실패했어요. 다시 시도해주세요.");
        return;
      }
    }
    setLeftChatIds((prev) => Array.from(new Set([...prev, selectedId])));
    setShowHostLeaveConfirm(false);
    go("chatList", "chat");
    showToast("공구방에서 나갔어요.");
  }

  /* 참여자가 공구방을 나가기: 참여 취소 + (모집중/모집완료인 경우) 모집 인원 감소 */
  async function handleLeaveGonggu() {
    if (!selectedId) return;
    if (isFirebaseConfigured()) {
      try {
        await cancelParticipationDoc(selectedId, currentUser);
      } catch {
        showToast("나가기에 실패했어요. 다시 시도해주세요.");
        return;
      }
    }
    setJoined((prev) => prev.filter((id) => id !== selectedId));
    setLeftChatIds((prev) => Array.from(new Set([...prev, selectedId])));
    setShowLeaveConfirm(false);
    go("chatList", "chat");
    showToast("공구방에서 나갔어요.");
  }

  /* 방장이 이미 종료된 공구의 채팅방에서 나가기: hostHidden 플래그를 켜서 새로고침 후에도 목록에서 계속 숨긴다 */
  async function handleLeaveClosedChat() {
    if (!selectedId) return;
    if (isFirebaseConfigured()) {
      try {
        await hideGongguChatDoc(selectedId);
      } catch {
        showToast("나가기에 실패했어요. 다시 시도해주세요.");
        return;
      }
    }
    setLeftChatIds((prev) => Array.from(new Set([...prev, selectedId])));
    go("chatList", "chat");
  }

  async function handleReview(comment: string) {
    if (!sel) return;
    const gonggu = data.gonggus.find((g) => g.id === sel.id);
    if (gonggu && isFirebaseConfigured()) {
      try {
        const avg = Object.values(ratings).reduce((a, b) => a + b, 0) / 4;
        await submitReviewDoc(gonggu, currentUser, Math.round(avg) || 3, comment);
      } catch {
        /* 실패해도 화면 전환은 진행 */
      }
    }
    go("mypage", "mypage");
    showToast("후기가 등록됐어요. 고마워요!");
  }

  const showNav = (["home", "map", "chatList", "mypage"] as Screen[]).includes(screen);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" backgroundColor={t.card} translucent={false} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "android" ? "height" : "padding"}
        keyboardVerticalOffset={Platform.OS === "android" ? 0 : 0}
        style={styles.flex}
      >
        <View style={styles.root}>
          <View style={[styles.body, !showNav && { paddingBottom: insets.bottom }]}>
            {screen === "login" && (
              <LoginScreen
                auth={auth}
                onVerify={() => {
                  setVerifyStep(0);
                  setScreen("verify");
                }}
                onPeek={() => go("home", "home")}
              />
            )}

            {screen === "verify" && (
              <VerifyScreen
                step={verifyStep}
                nickname={nickname}
                locating={locating}
                onNick={setNickname}
                onNext={() => {
                  if (nickname.trim()) setVerifyStep(1);
                }}
                onLocate={() => {
                  setLocating(true);
                  setTimeout(() => {
                    setLocating(false);
                    setVerifyStep(2);
                  }, 1400);
                }}
                onStart={() => go("home", "home")}
              />
            )}

            {screen === "home" && (
              <HomeScreen
                deals={browsableDeals}
                filter={homeFilter}
                onFilter={setHomeFilter}
                onOpen={openDeal}
              />
            )}

            {screen === "map" && (
              <MapScreen
                deals={browsableDeals}
                mapSel={mapSel}
                pick={mapPick}
                onPickMarker={setMapSel}
                onList={() => go("home", "home")}
                onOpen={() => openDeal(mapSel)}
              />
            )}

            {screen === "detail" && sel && (
              <DetailScreen
                deal={sel}
                hearted={hearts.includes(sel.id)}
                joined={joined.includes(sel.id)}
                isHost={sel.hostUserId === currentUser.id}
                onBack={() => goToTabRoot()}
                onHeart={() =>
                  setHearts((prev) =>
                    prev.includes(sel.id) ? prev.filter((x) => x !== sel.id) : [...prev, sel.id]
                  )
                }
                onCta={() => {
                  if (joined.includes(sel.id)) go("chat");
                  else setShowJoin(true);
                }}
                onEdit={startEdit}
                onDelete={() => setShowDeleteConfirm(true)}
              />
            )}

            {screen === "chatList" && (
              <ChatListScreen chats={myChats} onSelect={openChatRoom} />
            )}

            {screen === "chat" && sel && (
              <ChatScreen
                deal={sel}
                messages={chatMsgs}
                onBack={() => go("chatList", "chat")}
                onSend={sendMessage}
                onOpenDetail={() => openDeal(sel.id)}
                onLeave={() => {
                  const isHost = sel.hostUserId === currentUser.id;
                  if (isHost && sel.closed) {
                    void handleLeaveClosedChat();
                  } else if (isHost) {
                    setShowHostLeaveConfirm(true);
                  } else {
                    setShowLeaveConfirm(true);
                  }
                }}
              />
            )}

            {screen === "create" && (
              <CreateScreen
                cat={createCat}
                onCat={setCreateCat}
                title={cTitle}
                onTitleChange={setCTitle}
                total={cTotal}
                members={cMembers}
                pickup={cPickup}
                time={cTime}
                split={cSplit}
                photos={cPhotos}
                deadlineDate={cDeadlineDate}
                deadlineTime={cDeadlineTime}
                onTotal={setCTotal}
                onMembers={setCMembers}
                onPickup={setCPickup}
                onTime={setCTime}
                onSplitChange={setCSplit}
                onAddPhoto={pickPhoto}
                onRemovePhoto={removePhoto}
                onDeadlineDate={setCDeadlineDate}
                onDeadlineTime={setCDeadlineTime}
                onBack={() => exitCreateScreen()}
                onPost={handleCreate}
                editing={editingGongguId !== null}
              />
            )}

            {screen === "review" && sel && (
              <ReviewScreen
                deal={sel}
                ratings={ratings}
                onRate={(key, value) => setRatings((prev) => ({ ...prev, [key]: value }))}
                onBack={() => go("mypage", "mypage")}
                onSubmit={handleReview}
              />
            )}

            {screen === "mypage" && (
              <MyPageScreen
                nickname={currentUser.nickname}
                notif={notif}
                onToggle={(key) => setNotif((prev) => ({ ...prev, [key]: !prev[key] }))}
                onReviewDemo={() => {
                  if (deals.length > 0) setSelectedId(deals[0]!.id);
                  setRatings({ time: 0, fair: 0, manner: 0, desc: 0 });
                  setScreen("review");
                }}
              />
            )}
          </View>

          {showNav && (
            <BottomNav
              active={tab}
              onHome={() => go("home", "home")}
              onMap={() => go("map", "map")}
              onCreate={() => {
                setEditingGongguId(null);
                resetCreateForm();
                setScreen("create");
              }}
              onChat={() => go("chatList", "chat")}
              onMy={() => go("mypage", "mypage")}
            />
          )}

          {showJoin && sel && (
            <JoinSheet deal={sel} onClose={() => setShowJoin(false)} onConfirm={confirmJoin} />
          )}

          {showDeleteConfirm && sel && (
            <ConfirmModal
              title="공구를 삭제할까요?"
              description={"삭제하면 공구방이 목록에서 사라지고\n참여자와의 채팅방은 종료돼요."}
              confirmLabel="삭제하기"
              onCancel={() => setShowDeleteConfirm(false)}
              onConfirm={() => void handleDeleteGonggu()}
            />
          )}

          {showLeaveConfirm && sel && (
            <ConfirmModal
              title="공구방을 나갈까요?"
              description={"나가면 참여가 취소되고\n채팅방에서 더 이상 메시지를 볼 수 없어요."}
              confirmLabel="나가기"
              onCancel={() => setShowLeaveConfirm(false)}
              onConfirm={() => void handleLeaveGonggu()}
            />
          )}

          {showHostLeaveConfirm && sel && (
            <ConfirmModal
              title="공구방이 삭제됩니다"
              description={"방장이 나가면 공구방이 삭제되고\n참여자와의 채팅방도 함께 종료돼요.\n그래도 나가시겠습니까?"}
              confirmLabel="나가기"
              onCancel={() => setShowHostLeaveConfirm(false)}
              onConfirm={() => void handleHostLeaveGonggu()}
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

/* ------------------------------------------------------------------ */
/* Vector icon primitives                                              */
/* ------------------------------------------------------------------ */

function BasketIcon({ size = 44, color = "#fff" }: { size?: number; color?: string }) {
  const lw = Math.max(2.5, size * 0.065);
  const bodyTint = color === "#fff" ? t.pink : "#fff";
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      {/* Arc handle */}
      <View
        style={{
          width: size * 0.46,
          height: size * 0.22,
          borderTopWidth: lw,
          borderLeftWidth: lw,
          borderRightWidth: lw,
          borderBottomWidth: 0,
          borderColor: color,
          borderTopLeftRadius: size * 0.23,
          borderTopRightRadius: size * 0.23,
        }}
      />
      {/* Body */}
      <View
        style={{
          width: size * 0.8,
          height: size * 0.47,
          backgroundColor: color,
          borderRadius: size * 0.06,
          borderBottomLeftRadius: size * 0.11,
          borderBottomRightRadius: size * 0.11,
          marginTop: 1,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <View style={{ width: "72%", height: lw * 0.75, backgroundColor: bodyTint, opacity: 0.3, marginBottom: size * 0.08 }} />
        <View style={{ width: "72%", height: lw * 0.75, backgroundColor: bodyTint, opacity: 0.3 }} />
      </View>
    </View>
  );
}

function KakaoIcon({ size = 22 }: { size?: number }) {
  const bColor = "#3C1E1E";
  const eyeS = size * 0.165;
  return (
    <View style={{ width: size, height: size * 0.88, marginRight: 8 }}>
      {/* Bubble body */}
      <View
        style={{
          position: "absolute",
          top: 0, left: 0, right: 0,
          height: size * 0.76,
          backgroundColor: bColor,
          borderRadius: size * 0.22,
        }}
      />
      {/* Tail */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: size * 0.22,
          width: size * 0.24,
          height: size * 0.19,
          backgroundColor: bColor,
          borderBottomLeftRadius: size * 0.13,
        }}
      />
      {/* Left eye */}
      <View
        style={{
          position: "absolute",
          top: size * 0.255,
          left: size * 0.19,
          width: eyeS,
          height: eyeS,
          borderRadius: eyeS / 2,
          backgroundColor: "#FEE500",
        }}
      />
      {/* Right eye */}
      <View
        style={{
          position: "absolute",
          top: size * 0.255,
          right: size * 0.19,
          width: eyeS,
          height: eyeS,
          borderRadius: eyeS / 2,
          backgroundColor: "#FEE500",
        }}
      />
    </View>
  );
}

function GoogleGIcon({ size = 22 }: { size?: number }) {
  const r = size / 2;
  const iR = size * 0.305;
  const barH = size * 0.205;
  return (
    <View style={{ width: size, height: size, borderRadius: r, overflow: "hidden", marginRight: 10 }}>
      <View style={{ position: "absolute", top: 0, left: 0, width: r, height: r, backgroundColor: "#4285F4" }} />
      <View style={{ position: "absolute", top: 0, right: 0, width: r, height: r, backgroundColor: "#EA4335" }} />
      <View style={{ position: "absolute", bottom: 0, right: 0, width: r, height: r, backgroundColor: "#FBBC05" }} />
      <View style={{ position: "absolute", bottom: 0, left: 0, width: r, height: r, backgroundColor: "#34A853" }} />
      {/* White donut cutout */}
      <View
        style={{
          position: "absolute",
          top: r - iR, left: r - iR,
          width: iR * 2, height: iR * 2,
          borderRadius: iR,
          backgroundColor: "#fff",
        }}
      />
      {/* White mask right half (G opening) */}
      <View
        style={{
          position: "absolute",
          top: r - barH / 2 - 0.5,
          left: r - 1,
          right: 0,
          height: barH + 1,
          backgroundColor: "#fff",
        }}
      />
      {/* Blue horizontal bar of G */}
      <View
        style={{
          position: "absolute",
          top: r - barH / 2,
          left: size * 0.39,
          right: size * 0.07,
          height: barH,
          backgroundColor: "#4285F4",
        }}
      />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Nav vector icons                                                    */
/* ------------------------------------------------------------------ */

function HomeIcon({ size = 22, color = t.dim }: { size?: number; color?: string }) {
  const s = size;
  return (
    <View style={{ width: s, height: s, alignItems: "center" }}>
      {/* 지붕 삼각형 */}
      <View
        style={{
          width: 0, height: 0,
          borderLeftWidth: s * 0.5, borderRightWidth: s * 0.5,
          borderBottomWidth: s * 0.47,
          borderLeftColor: "transparent", borderRightColor: "transparent",
          borderBottomColor: color
        }}
      />
      {/* 벽 */}
      <View
        style={{
          width: s * 0.64, height: s * 0.42,
          backgroundColor: color, marginTop: -s * 0.03,
          borderBottomLeftRadius: 2, borderBottomRightRadius: 2
        }}
      />
    </View>
  );
}

function MapPinIcon({ size = 22, color = t.dim }: { size?: number; color?: string }) {
  const s = size;
  const d = s * 0.58;
  return (
    <View style={{ width: s, height: s, alignItems: "center", paddingTop: s * 0.02 }}>
      {/* 원형 상단 */}
      <View style={{ width: d, height: d, borderRadius: d / 2, backgroundColor: color, alignItems: "center", justifyContent: "center" }}>
        {/* 가운데 흰 점 */}
        <View style={{ width: d * 0.36, height: d * 0.36, borderRadius: d * 0.18, backgroundColor: "rgba(255,255,255,0.9)" }} />
      </View>
      {/* 뾰족한 아래쪽 */}
      <View
        style={{
          width: 0, height: 0, marginTop: -s * 0.05,
          borderLeftWidth: s * 0.2, borderRightWidth: s * 0.2,
          borderTopWidth: s * 0.34,
          borderLeftColor: "transparent", borderRightColor: "transparent",
          borderTopColor: color
        }}
      />
    </View>
  );
}

function ChatBubbleIcon({ size = 22, color = t.dim }: { size?: number; color?: string }) {
  const s = size;
  return (
    <View style={{ width: s, height: s }}>
      {/* 말풍선 몸체 */}
      <View
        style={{
          position: "absolute", top: 0, left: 0, right: 0,
          height: s * 0.76, backgroundColor: color, borderRadius: s * 0.18
        }}
      />
      {/* 꼬리 (삼각형) */}
      <View
        style={{
          position: "absolute", bottom: 0, left: s * 0.14,
          width: 0, height: 0,
          borderRightWidth: s * 0.18, borderTopWidth: s * 0.28,
          borderRightColor: "transparent", borderTopColor: color
        }}
      />
    </View>
  );
}

function PersonIcon({ size = 22, color = t.dim }: { size?: number; color?: string }) {
  const s = size;
  const headD = s * 0.44;
  const bodyW = s * 0.74;
  return (
    <View style={{ width: s, height: s, alignItems: "center" }}>
      {/* 머리 */}
      <View style={{ width: headD, height: headD, borderRadius: headD / 2, backgroundColor: color, marginBottom: s * 0.04 }} />
      {/* 어깨/몸 반원 */}
      <View
        style={{
          width: bodyW, height: s * 0.38, backgroundColor: color,
          borderTopLeftRadius: bodyW / 2, borderTopRightRadius: bodyW / 2
        }}
      />
    </View>
  );
}

function SearchIcon({ size = 20, color = t.ink }: { size?: number; color?: string }) {
  const s = size;
  const bw = Math.max(1.5, s * 0.1);
  // 렌즈를 크게, 세로 중앙 정렬을 위해 살짝 아래 오프셋
  const offset = s * 0.06;
  const lD = s * 0.70;
  const lR = lD / 2;
  const lCx = offset + lR;
  const lCy = offset + lR;
  // 렌즈 외곽 45° edge
  const ex = lCx + lR * 0.707;
  const ey = lCy + lR * 0.707;
  // 손잡이: 짧게 끊음
  const endPt = s * 0.92;
  const hCx = (ex + endPt) / 2;
  const hCy = (ey + endPt) / 2;
  const hLen = (endPt - ex) * Math.SQRT2;
  return (
    <View style={{ width: s, height: s }}>
      <View style={{
        position: "absolute", top: offset, left: offset,
        width: lD, height: lD, borderRadius: lR,
        borderWidth: bw, borderColor: color
      }} />
      <View style={{
        position: "absolute",
        top: hCy - hLen / 2,
        left: hCx - bw / 2,
        width: bw, height: hLen,
        backgroundColor: color, borderRadius: bw / 2,
        transform: [{ rotate: "135deg" }]
      }} />
    </View>
  );
}

function BellIcon({ size = 20, color = t.ink }: { size?: number; color?: string }) {
  const s = size;
  const bw = s * 0.74;
  return (
    <View style={{ width: s, height: s, alignItems: "center" }}>
      {/* 상단 고리 */}
      <View style={{ width: s * 0.1, height: s * 0.14, backgroundColor: color, borderRadius: 2 }} />
      {/* 벨 몸체 */}
      <View
        style={{
          width: bw, height: s * 0.54, backgroundColor: color,
          borderTopLeftRadius: bw / 2, borderTopRightRadius: bw / 2
        }}
      />
      {/* 벨 하단 테두리 */}
      <View style={{ width: s * 0.88, height: s * 0.13, backgroundColor: color, borderRadius: 2 }} />
      {/* 추 */}
      <View style={{ width: s * 0.2, height: s * 0.2, borderRadius: s * 0.1, backgroundColor: color }} />
    </View>
  );
}

function SendArrowIcon({ size = 16, color = "#fff" }: { size?: number; color?: string }) {
  const s = size;
  return (
    <View style={{ width: s, height: s, alignItems: "center", justifyContent: "center" }}>
      <View
        style={{
          width: 0, height: 0,
          borderTopWidth: s * 0.5, borderBottomWidth: s * 0.5,
          borderLeftWidth: s * 0.88,
          borderTopColor: "transparent", borderBottomColor: "transparent",
          borderLeftColor: color
        }}
      />
    </View>
  );
}

function CameraIcon({ size = 22, color = t.dim }: { size?: number; color?: string }) {
  const s = size;
  return (
    <View style={{ width: s, height: s * 0.82 }}>
      {/* 카메라 몸체 */}
      <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: s * 0.62, backgroundColor: color, borderRadius: s * 0.12 }} />
      {/* 렌즈 */}
      <View style={{ position: "absolute", bottom: s * 0.13, left: "50%", marginLeft: -s * 0.175, width: s * 0.35, height: s * 0.35, borderRadius: s * 0.175, backgroundColor: "rgba(255,255,255,0.85)" }} />
      {/* 상단 뷰파인더 범프 */}
      <View style={{ position: "absolute", top: 0, left: "26%", width: s * 0.3, height: s * 0.2, backgroundColor: color, borderRadius: s * 0.06 }} />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Login                                                               */
/* ------------------------------------------------------------------ */

function LoginScreen({
  auth,
  onVerify,
  onPeek
}: {
  auth: UseFirebaseAuth;
  onVerify: () => void;
  onPeek: () => void;
}) {
  const { height } = useWindowDimensions();
  const isSmall = height < 700;
  const loading = auth.status === "loading";

  function handleKakao() {
    /* Kakao OAuth 미구현 — 익명 세션 후 닉네임 설정으로 진입 */
    void auth.signIn();
    onVerify();
  }

  function handleGoogle() {
    void auth.signInGoogle();
    /* Google 로그인 성공 시 useEffect에서 자동 진입 */
  }

  return (
    <View style={styles.loginWrap}>
      <View style={[styles.loginHero, isSmall && { gap: 14 }]}>
        <View style={[styles.logoCircle, isSmall && { width: 72, height: 72, borderRadius: 36 }]}>
          <BasketIcon size={isSmall ? 34 : 42} color="#fff" />
        </View>
        <View style={{ alignItems: "center", gap: isSmall ? 4 : 8 }}>
          <Text style={[styles.loginTitle, isSmall && { fontSize: 26 }]}>모구모구</Text>
          <Text style={styles.loginSubtitle}>우리 동네 대학생끼리{"\n"}나눠 사고, 같이 픽업해요</Text>
        </View>
      </View>

      {!!auth.error && (
        <View style={{ paddingHorizontal: 4, paddingBottom: 8 }}>
          <Text style={{ fontSize: 12, color: t.rose, textAlign: "center" }}>{auth.error}</Text>
        </View>
      )}

      <View style={{ gap: 11, paddingBottom: isSmall ? 20 : 26 }}>
        {/* 카카오 공식 버튼 */}
        <Pressable
          style={[styles.authButton, { backgroundColor: t.kakao, opacity: loading ? 0.6 : 1 }]}
          onPress={handleKakao}
          disabled={loading}
        >
          <KakaoIcon size={22} />
          <Text style={[styles.authButtonText, { color: t.kakaoInk }]}>카카오로 시작하기</Text>
        </Pressable>
        {/* Google 공식 버튼 */}
        <Pressable
          style={[
            styles.authButton,
            { backgroundColor: "#fff", borderWidth: 1, borderColor: "#DADCE0", opacity: loading ? 0.6 : 1 }
          ]}
          onPress={handleGoogle}
          disabled={loading}
        >
          <GoogleGIcon size={22} />
          <Text style={[styles.authButtonText, { color: "#3C4043" }]}>
            {loading ? "로그인 중…" : "Google로 시작하기"}
          </Text>
        </Pressable>
        <Pressable onPress={onPeek} style={{ paddingVertical: 6, alignItems: "center" }}>
          <Text style={{ color: t.dim, fontSize: 13 }}>먼저 둘러볼게요</Text>
        </Pressable>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Verify (nickname → locate → done)                                   */
/* ------------------------------------------------------------------ */

function VerifyScreen({
  step,
  nickname,
  locating,
  onNick,
  onNext,
  onLocate,
  onStart
}: {
  step: number;
  nickname: string;
  locating: boolean;
  onNick: (v: string) => void;
  onNext: () => void;
  onLocate: () => void;
  onStart: () => void;
}) {
  const nickReady = nickname.trim().length > 0;

  return (
    <View style={styles.verifyWrap}>
      <View style={styles.stepRow}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={[styles.stepBar, { backgroundColor: step >= i ? t.rose : t.border }]}
          />
        ))}
      </View>

      {step === 0 && (
        <>
          <View style={styles.flex}>
            <Text style={styles.verifyTitle}>동네에서 쓸{"\n"}닉네임을 정해주세요</Text>
            <Text style={styles.verifyDesc}>이웃에게 보여지는 이름이에요. 언제든 바꿀 수 있어요.</Text>
            <View
              style={[
                styles.nickField,
                { borderBottomColor: nickname.length ? t.rose : t.border }
              ]}
            >
              <TextInput
                value={nickname}
                onChangeText={(v) => onNick(v.slice(0, 12))}
                placeholder="예) 봉천동크루아상러버"
                placeholderTextColor={t.dim}
                style={styles.nickInput}
              />
              <Text style={{ fontSize: 13, color: t.dim }}>{nickname.length}/12</Text>
            </View>
          </View>
          <Pressable
            disabled={!nickReady}
            onPress={onNext}
            style={[
              styles.pillButton,
              { backgroundColor: nickReady ? t.pink : "#EDEAE3" }
            ]}
          >
            <Text style={[styles.pillButtonText, { color: nickReady ? "#fff" : t.dim }]}>다음</Text>
          </Pressable>
        </>
      )}

      {step === 1 && (
        <>
          <View style={styles.verifyCenter}>
            <View style={styles.locateCircle}>
              {locating
                ? <Text style={{ fontSize: 13, fontWeight: "700", color: t.muted }}>위치 확인 중…</Text>
                : <MapPinIcon size={44} color={t.rose} />
              }
            </View>
            <Text style={[styles.verifyTitle, { textAlign: "center", marginTop: 18 }]}>
              {locating ? "위치 확인 중…" : "동네를 인증해주세요"}
            </Text>
            <Text style={[styles.verifyDesc, { textAlign: "center", maxWidth: 240 }]}>
              {locating
                ? "현재 위치를 기반으로 동네를 확인하고 있어요"
                : "GPS로 현재 위치를 확인해 우리 동네 이웃임을 인증해요. 정확한 위치는 공개되지 않아요."}
            </Text>
          </View>
          <Pressable
            disabled={locating}
            onPress={onLocate}
            style={[styles.pillButton, { backgroundColor: t.pink, opacity: locating ? 0.5 : 1 }]}
          >
            <Text style={[styles.pillButtonText, { color: "#fff" }]}>현재 위치로 동네 인증</Text>
          </Pressable>
        </>
      )}

      {step === 2 && (
        <>
          <View style={styles.verifyCenter}>
            <View style={styles.doneCircle}>
              <Text style={{ fontSize: 40, color: "#fff" }}>✓</Text>
            </View>
            <Text style={[styles.verifyTitle, { textAlign: "center", marginTop: 20 }]}>
              봉천동 인증 완료!
            </Text>
            <Text style={[styles.verifyDesc, { textAlign: "center" }]}>
              이제 봉천동 반경 1km 안의{"\n"}공구를 보고 참여할 수 있어요
            </Text>
            <Pressable style={styles.eduBadge}>
              <Text style={{ fontSize: 13, color: t.chipInk }}>
                🎓 학교 이메일 인증하고 배지 받기 <Text style={{ color: t.dim }}>(나중에)</Text>
              </Text>
            </Pressable>
          </View>
          <Pressable
            onPress={onStart}
            style={[styles.pillButton, { backgroundColor: t.pink }]}
          >
            <Text style={[styles.pillButtonText, { color: "#fff" }]}>모구모구 시작하기</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Home                                                                */
/* ------------------------------------------------------------------ */

function HomeScreen({
  deals,
  filter,
  onFilter,
  onOpen
}: {
  deals: Deal[];
  filter: string;
  onFilter: (f: string) => void;
  onOpen: (id: string) => void;
}) {
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState("");

  const visible = deals.filter((d) => {
    if (filter !== "전체" && d.cat !== filter) return false;
    if (query.trim() && !d.title.includes(query.trim())) return false;
    return true;
  });

  return (
    <View style={styles.flex}>
      <View style={styles.homeHeader}>
        <Pressable style={styles.locButton}>
          <Text style={styles.locText}>봉천동</Text>
          <Text style={styles.chevron}>⌄</Text>
        </Pressable>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 18 }}>
          <Pressable
            onPress={() => {
              setShowSearch((prev) => !prev);
              setQuery("");
            }}
          >
            <SearchIcon size={20} color={showSearch ? t.rose : t.ink} />
          </Pressable>
          <View>
            <Pressable>
              <BellIcon size={20} color={t.ink} />
            </Pressable>
            <View style={styles.bellDot} />
          </View>
        </View>
      </View>

      {showSearch && (
        <View style={styles.searchBar}>
          <SearchIcon size={16} color={t.dim} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="공구 이름으로 검색"
            placeholderTextColor={t.dim}
            style={styles.searchInput}
            autoFocus
          />
          {!!query && (
            <Pressable onPress={() => setQuery("")}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: t.dim }}>✕</Text>
            </Pressable>
          )}
        </View>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScroll}
        contentContainerStyle={styles.chipRow}
      >
        {HOME_FILTERS.map((label) => {
          const active = label === filter;
          return (
            <Pressable
              key={label}
              onPress={() => onFilter(label)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: active ? t.ink : "#fff",
                  borderColor: active ? t.ink : t.border
                }
              ]}
            >
              <Text
                numberOfLines={1}
                style={{ fontSize: 13, fontWeight: "600", color: active ? "#fff" : t.chipInk }}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView style={styles.flex} contentContainerStyle={styles.dealList}>
        {visible.map((d) => (
          <DealCard key={d.id} deal={d} onPress={() => onOpen(d.id)} />
        ))}
      </ScrollView>
    </View>
  );
}

function DealCard({ deal, onPress }: { deal: Deal; onPress: () => void }) {
  return (
    <Pressable style={styles.dealCard} onPress={onPress}>
      <View style={[styles.dealThumb, { backgroundColor: deal.tint }]}>
        {deal.images[0] && (
          <Image source={{ uri: deal.images[0] }} style={StyleSheet.absoluteFill} />
        )}
        <View style={styles.thumbTag}>
          <Text style={styles.thumbTagText}>{deal.cat}</Text>
        </View>
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.rowBetween}>
          <View
            style={[
              styles.deadlinePill,
              { backgroundColor: deal.urgent ? t.urgentBg : t.calmBg }
            ]}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                color: deal.urgent ? t.urgentInk : t.chipInk
              }}
            >
              {deal.deadline}
            </Text>
          </View>
          <Text style={{ fontSize: 11, color: t.dim }}>{deal.dist}</Text>
        </View>
        <Text style={styles.dealTitle} numberOfLines={1}>
          {deal.title}
        </Text>
        {!!deal.store && <Text style={styles.dealStore}>{deal.store}</Text>}
        <View style={{ marginTop: 6 }}>
          <View style={[styles.rowBetween, { marginBottom: 5 }]}>
            <Text style={styles.dealPrice}>1인 {fmt(per(deal))}</Text>
            <Text style={styles.dealMeta}>
              {memberStr(deal)} · {remain(deal)}
            </Text>
          </View>
          <ProgressBar pct={barPct(deal)} />
        </View>
      </View>
    </Pressable>
  );
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${Math.min(100, Math.max(0, pct))}%` }]} />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Map                                                                 */
/* ------------------------------------------------------------------ */

function MapScreen({
  deals,
  mapSel,
  pick,
  onPickMarker,
  onList,
  onOpen
}: {
  deals: Deal[];
  mapSel: string;
  pick: Deal | null;
  onPickMarker: (id: string) => void;
  onList: () => void;
  onOpen: () => void;
}) {
  return (
    <View style={styles.mapWrap}>
      {/* faux roads / blocks */}
      <View style={[styles.mapRoad, { top: "18%", transform: [{ rotate: "-14deg" }] }]} />
      <View style={[styles.mapRoad, { top: "62%", height: 38, transform: [{ rotate: "8deg" }] }]} />
      <View style={styles.mapBlockA} />
      <View style={styles.mapBlockB} />

      {/* you marker */}
      <View style={styles.youOuter}>
        <View style={styles.youDot} />
      </View>

      {deals.map((d) => {
        const on = d.id === mapSel;
        const pos = mapPos(d.id);
        return (
          <Pressable
            key={d.id}
            onPress={() => onPickMarker(d.id)}
            style={[
              styles.mapMarker,
              {
                left: pos.left as any,
                top: pos.top as any,
                backgroundColor: on ? t.pink : "#fff"
              }
            ]}
          >
            <Text style={{ fontSize: 13, fontWeight: "800", color: on ? "#fff" : t.ink }}>
              {fmt(per(d))}
            </Text>
          </Pressable>
        );
      })}

      {/* top bar */}
      <View style={styles.mapTopBar}>
        <View style={styles.mapPill}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: t.ink }}>봉천동 · 반경 1km</Text>
        </View>
        <Pressable style={styles.mapPill} onPress={onList}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: t.rose }}>☰ 리스트</Text>
        </Pressable>
      </View>

      {/* bottom sheet */}
      {pick && (
      <View style={styles.mapSheet}>
        <Pressable style={{ flexDirection: "row", gap: 12 }} onPress={onOpen}>
          <View style={[styles.mapSheetThumb, { backgroundColor: pick.tint }]} />
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                color: pick.urgent ? t.urgentInk : t.chipInk
              }}
            >
              {pick.deadline}
            </Text>
            <Text style={styles.mapSheetTitle} numberOfLines={1}>
              {pick.title}
            </Text>
            <Text style={styles.dealStore}>
              {pick.spot} · {memberStr(pick)}
            </Text>
            <Text style={[styles.dealPrice, { marginTop: 3 }]}>1인 {fmt(per(pick))}</Text>
          </View>
        </Pressable>
        <Pressable style={styles.mapSheetButton} onPress={onOpen}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>자세히 보기</Text>
        </Pressable>
      </View>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Detail                                                              */
/* ------------------------------------------------------------------ */

function DetailScreen({
  deal,
  hearted,
  joined,
  isHost,
  onBack,
  onHeart,
  onCta,
  onEdit,
  onDelete
}: {
  deal: Deal;
  hearted: boolean;
  joined: boolean;
  isHost: boolean;
  onBack: () => void;
  onHeart: () => void;
  onCta: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const closedAndNotJoined = deal.closed && !joined;
  const fullAndNotJoined = !deal.closed && !joined && deal.cur >= deal.max;

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={{ paddingBottom: 12 }} stickyHeaderIndices={[]}>
        <View style={[styles.detailHero, { backgroundColor: deal.tint }]}>
          {deal.images[0] && (
            <Image
              source={{ uri: deal.images[0] }}
              resizeMode="cover"
              style={StyleSheet.absoluteFill}
            />
          )}
          <Pressable style={styles.detailBack} onPress={onBack}>
            <Text style={styles.backArrow}>‹</Text>
          </Pressable>
          {isHost && !deal.closed && (
            <View style={styles.detailHostActions}>
              <Pressable style={styles.detailActionButton} onPress={onEdit}>
                <Text style={{ fontSize: 13, fontWeight: "700", color: t.ink }}>수정</Text>
              </Pressable>
              <Pressable style={styles.detailActionButton} onPress={onDelete}>
                <Text style={{ fontSize: 13, fontWeight: "700", color: t.rose }}>삭제</Text>
              </Pressable>
            </View>
          )}
          {!deal.images[0] && <Text style={styles.detailHeroLabel}>[ 상품 사진 ]</Text>}
        </View>

        <View style={styles.detailSheet}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={[styles.tagPill, { backgroundColor: t.roseSoft }]}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: t.rose }}>{deal.cat}</Text>
            </View>
            <View
              style={[
                styles.tagPill,
                { backgroundColor: deal.urgent ? t.urgentBg : t.calmBg }
              ]}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: deal.urgent ? t.urgentInk : t.chipInk
                }}
              >
                {deal.deadline}
              </Text>
            </View>
          </View>

          <Text style={styles.detailTitle}>{deal.title}</Text>
          <Text style={styles.dealStore}>
            {deal.store ? `${deal.store} · ${deal.dist}` : deal.dist}
          </Text>

          {/* price card */}
          <View style={styles.priceCard}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
              <View>
                <Text style={styles.fieldHint}>예상 1인 부담금</Text>
                <Text style={styles.priceBig}>{fmt(per(deal))}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.fieldHint}>총 {fmt(deal.total)}</Text>
                <Text style={{ fontSize: 13, fontWeight: "700", color: t.ink, marginTop: 2 }}>
                  {memberStr(deal)} 모집
                </Text>
              </View>
            </View>
            <View style={{ marginTop: 13 }}>
              <ProgressBar pct={barPct(deal)} />
            </View>
            <Text style={{ fontSize: 12, fontWeight: "600", color: t.chipInk, marginTop: 7 }}>
              {remain(deal)}이면 모집 완료돼요!
            </Text>
          </View>

          {/* info rows */}
          <View style={styles.infoCard}>
            <InfoRow label="소분 방법" value={deal.method} divider />
            <InfoRow label="픽업 장소" value={deal.spot} divider />
            <InfoRow label="픽업 시간" value={deal.pickup} />
          </View>

          <Text style={styles.detailDesc}>{deal.desc}</Text>

          {/* leader trust */}
          <View style={styles.trustCard}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: t.ink, marginBottom: 12 }}>
              공구장 신뢰도
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={[styles.leaderAvatar, { backgroundColor: deal.tint }]}>
                <Text style={{ fontSize: 18, fontWeight: "800", color: "rgba(0,0,0,0.4)" }}>
                  {deal.leader.charAt(0)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: t.ink }}>{deal.leader}</Text>
                <Text style={{ fontSize: 12, color: t.muted, marginTop: 1 }}>
                  거래 {deal.deals}회 · 후기 {deal.reviews}개 · 노쇼 {deal.noshow}회
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontSize: 20, fontWeight: "800", color: tempColor(deal.temp) }}>
                  {tempStr(deal.temp)}
                </Text>
                <Text style={{ fontSize: 11, color: t.muted }}>매너온도</Text>
              </View>
            </View>
            <View style={{ marginTop: 12 }}>
              <GradientBar ratio={tempRatio(deal.temp)} knobColor={tempColor(deal.temp)} />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* sticky CTA */}
      <View style={styles.ctaBar}>
        <Pressable style={styles.heartButton} onPress={onHeart}>
          <Text style={{ fontSize: 22, color: hearted ? t.rose : t.muted }}>
            {hearted ? "♥" : "♡"}
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.ctaButton,
            (isHost || closedAndNotJoined || fullAndNotJoined) && { backgroundColor: t.border }
          ]}
          onPress={onCta}
          disabled={isHost || closedAndNotJoined || fullAndNotJoined}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: isHost || closedAndNotJoined || fullAndNotJoined ? t.dim : "#fff"
            }}
          >
            {isHost
              ? "참여완료"
              : closedAndNotJoined
                ? "종료된 공구예요"
                : fullAndNotJoined
                  ? "모집완료"
                  : joined
                    ? "채팅방 입장하기"
                    : "참여하기"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function InfoRow({ label, value, divider }: { label: string; value: string; divider?: boolean }) {
  return (
    <View style={[styles.infoRow, divider && styles.infoRowDivider]}>
      <Text style={styles.infoRowLabel}>{label}</Text>
      <Text style={styles.infoRowValue}>{value}</Text>
    </View>
  );
}

function GradientBar({ ratio, knobColor }: { ratio: number; knobColor: string }) {
  const segments = 40;
  return (
    <View style={styles.gradientWrap}>
      <View style={styles.gradientTrack}>
        {Array.from({ length: segments }).map((_, i) => (
          <View
            key={i}
            style={{ flex: 1, backgroundColor: gradientColor(TEMP_STOPS, i / (segments - 1)) }}
          />
        ))}
      </View>
      <View style={[styles.gradientKnob, { left: `${ratio * 100}%`, borderColor: knobColor }]} />
    </View>
  );
}

function ChatListScreen({
  chats,
  onSelect
}: {
  chats: Array<{ deal: Deal; isHost: boolean }>;
  onSelect: (dealId: string) => void;
}) {
  return (
    <View style={styles.flex}>
      <View style={styles.simpleHeader}>
        <Text style={styles.simpleHeaderTitle}>채팅</Text>
      </View>

      {chats.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Text style={{ fontSize: 14, color: t.muted }}>아직 참여 중인 공구방이 없어요</Text>
        </View>
      ) : (
        <ScrollView style={styles.flex} contentContainerStyle={styles.dealList}>
          {chats.map(({ deal, isHost }) => (
            <Pressable key={deal.id} style={styles.dealCard} onPress={() => onSelect(deal.id)}>
              <View style={[styles.dealThumb, { backgroundColor: deal.tint }]}>
                {deal.images[0] && (
                  <Image source={{ uri: deal.images[0] }} style={StyleSheet.absoluteFill} />
                )}
                <View style={styles.thumbTag}>
                  <Text style={styles.thumbTagText}>{deal.cat}</Text>
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.rowBetween}>
                  <Text style={styles.dealTitle} numberOfLines={1}>
                    {deal.title}
                  </Text>
                  {isHost && (
                    <View style={[styles.tagPill, { backgroundColor: t.roseSoft }]}>
                      <Text style={{ fontSize: 11, fontWeight: "700", color: t.rose }}>방장</Text>
                    </View>
                  )}
                </View>
                {!!deal.store && <Text style={styles.dealStore}>{deal.store}</Text>}
                <Text style={{ fontSize: 12, color: t.muted, marginTop: 4 }}>
                  참여자 {memberStr(deal)} · {statusOf(deal)}
                </Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Chat                                                                */
/* ------------------------------------------------------------------ */

function ChatScreen({
  deal,
  messages,
  onBack,
  onSend,
  onOpenDetail,
  onLeave
}: {
  deal: Deal;
  messages: ChatMsg[];
  onBack: () => void;
  onSend: (text: string) => void;
  onOpenDetail: () => void;
  onLeave: () => void;
}) {
  const [input, setInput] = useState("");
  const closed = deal.closed;

  function submit() {
    if (closed || !input.trim()) return;
    onSend(input);
    setInput("");
  }

  return (
    <View style={styles.flex}>
      <View style={styles.chatHeader}>
        <Pressable onPress={onBack} style={{ padding: 4 }}>
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>
        <Pressable
          onPress={onOpenDetail}
          style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10 }}
        >
          <View style={[styles.chatHeaderThumb, { backgroundColor: deal.tint, overflow: "hidden" }]}>
            {deal.images[0] && (
              <Image source={{ uri: deal.images[0] }} style={StyleSheet.absoluteFill} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: t.ink }} numberOfLines={1}>
              {deal.title}
            </Text>
            <Text style={{ fontSize: 12, color: t.muted }}>참여자 {memberStr(deal)}</Text>
          </View>
        </Pressable>
        <View style={[styles.tagPill, { backgroundColor: closed ? t.calmBg : t.roseSoft }]}>
          <Text style={{ fontSize: 11, fontWeight: "700", color: closed ? t.chipInk : t.rose }}>
            {statusOf(deal)}
          </Text>
        </View>
        <Pressable onPress={onLeave} style={{ paddingHorizontal: 2, paddingVertical: 4 }}>
          <Text style={{ fontSize: 12, fontWeight: "700", color: t.muted }}>나가기</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.chatBody} contentContainerStyle={{ padding: 14, gap: 10 }}>
        {messages.map((m, i) => {
          if (m.type === "system") {
            return (
              <View key={i} style={{ alignItems: "center" }}>
                <Text style={styles.systemMsg}>{m.text}</Text>
              </View>
            );
          }
          const isMe = m.type === "me";
          return (
            <View
              key={i}
              style={{
                flexDirection: "row",
                justifyContent: isMe ? "flex-end" : "flex-start"
              }}
            >
              <View style={{ maxWidth: "74%" }}>
                {!isMe && <Text style={styles.msgName}>{m.name}</Text>}
                <View
                  style={{
                    flexDirection: isMe ? "row-reverse" : "row",
                    alignItems: "flex-end",
                    gap: 6
                  }}
                >
                  <View
                    style={[
                      styles.bubble,
                      isMe ? styles.bubbleMe : styles.bubbleOther
                    ]}
                  >
                    <Text style={{ fontSize: 14, lineHeight: 20, color: isMe ? "#fff" : t.ink }}>
                      {m.text}
                    </Text>
                  </View>
                  {!!m.time && <Text style={styles.msgTime}>{m.time}</Text>}
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.composer}>
        <View style={[styles.composerInputWrap, closed && { backgroundColor: t.line }]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            editable={!closed}
            placeholder={closed ? "종료된 공구방이에요" : "메시지 보내기"}
            placeholderTextColor={t.dim}
            style={styles.composerInput}
            onSubmitEditing={submit}
            returnKeyType="send"
          />
        </View>
        <Pressable
          style={[styles.sendButton, closed && { backgroundColor: t.dim }]}
          onPress={submit}
          disabled={closed}
        >
          <SendArrowIcon size={16} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Calendar picker                                                     */
/* ------------------------------------------------------------------ */

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function CalendarPicker({
  selectedDate,
  onSelect
}: {
  selectedDate: string;
  onSelect: (date: string) => void;
}) {
  const selected = new Date(selectedDate);
  const [viewYear, setViewYear] = useState(selected.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected.getMonth());

  const todayStr = toDateStr(new Date());
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  function shiftMonth(delta: number) {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }

  const cells: Array<{ day: number; dateStr: string } | null> = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ day, dateStr: toDateStr(new Date(viewYear, viewMonth, day)) });
  }

  return (
    <View style={styles.calendarWrap}>
      <View style={styles.calendarHeader}>
        <Pressable onPress={() => shiftMonth(-1)} style={styles.calendarNavButton}>
          <Text style={styles.calendarNavArrow}>‹</Text>
        </Pressable>
        <Text style={styles.calendarHeaderTitle}>
          {viewYear}년 {viewMonth + 1}월
        </Text>
        <Pressable onPress={() => shiftMonth(1)} style={styles.calendarNavButton}>
          <Text style={styles.calendarNavArrow}>›</Text>
        </Pressable>
      </View>

      <View style={styles.calendarWeekRow}>
        {WEEKDAYS.map((w) => (
          <Text key={w} style={styles.calendarWeekday}>
            {w}
          </Text>
        ))}
      </View>

      <View style={styles.calendarGrid}>
        {cells.map((cell, i) => {
          if (!cell) return <View key={i} style={styles.calendarCell} />;
          const isPast = cell.dateStr < todayStr;
          const isSelected = cell.dateStr === selectedDate;
          const isToday = cell.dateStr === todayStr;
          return (
            <Pressable
              key={cell.dateStr}
              disabled={isPast}
              onPress={() => onSelect(cell.dateStr)}
              style={styles.calendarCell}
            >
              <View style={[styles.calendarDayCircle, isSelected && { backgroundColor: t.pink }]}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: isSelected || isToday ? "700" : "500",
                    color: isPast ? t.dim : isSelected ? "#fff" : t.ink
                  }}
                >
                  {cell.day}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Create                                                              */
/* ------------------------------------------------------------------ */

function CreateScreen({
  cat,
  onCat,
  title,
  onTitleChange,
  total,
  members,
  pickup,
  time,
  split,
  photos,
  deadlineDate,
  deadlineTime,
  onTotal,
  onMembers,
  onPickup,
  onTime,
  onSplitChange,
  onAddPhoto,
  onRemovePhoto,
  onDeadlineDate,
  onDeadlineTime,
  onBack,
  onPost,
  editing
}: {
  cat: string;
  onCat: (c: string) => void;
  title: string;
  onTitleChange: (v: string) => void;
  total: string;
  members: string;
  pickup: string;
  time: string;
  split: string;
  photos: string[];
  deadlineDate: string;
  deadlineTime: string;
  onTotal: (v: string) => void;
  onMembers: (v: string) => void;
  onPickup: (v: string) => void;
  onTime: (v: string) => void;
  onSplitChange: (v: string) => void;
  onAddPhoto: () => void | Promise<void>;
  onRemovePhoto: (uri: string) => void;
  onDeadlineDate: (date: string) => void;
  onDeadlineTime: (time: string) => void;
  onBack: () => void;
  onPost: () => void | Promise<void>;
  editing?: boolean;
}) {
  const totalInputRef = useRef<TextInput>(null);
  const membersInputRef = useRef<TextInput>(null);
  const [showDeadlineSheet, setShowDeadlineSheet] = useState(false);
  const [hourDraft, setHourDraft] = useState(deadlineTime.split(":")[0] ?? "23");
  const [minuteDraft, setMinuteDraft] = useState(deadlineTime.split(":")[1] ?? "59");
  const perPerson = fmt(Math.ceil((Number(total) || 0) / (Number(members) || 1)));

  function openDeadlineSheet() {
    setHourDraft(deadlineTime.split(":")[0] ?? "23");
    setMinuteDraft(deadlineTime.split(":")[1] ?? "59");
    setShowDeadlineSheet(true);
  }

  /* 입력 중엔 자유롭게 타이핑하게 두고, 포커스를 벗어날 때만 범위를 clamp+pad해서 반영한다 */
  function commitDeadlineTime() {
    const hh = Math.min(23, Number(hourDraft.replace(/[^0-9]/g, "")) || 0);
    const mm = Math.min(59, Number(minuteDraft.replace(/[^0-9]/g, "")) || 0);
    const hPad = String(hh).padStart(2, "0");
    const mPad = String(mm).padStart(2, "0");
    setHourDraft(hPad);
    setMinuteDraft(mPad);
    onDeadlineTime(`${hPad}:${mPad}`);
  }

  return (
    <View style={styles.flex}>
      <View style={styles.simpleHeader}>
        <Pressable onPress={onBack} style={{ padding: 4 }}>
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>
        <Text style={styles.simpleHeaderTitle}>{editing ? "공구 수정하기" : "공구 만들기"}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.createBody}>
        <View>
          <Text style={styles.fieldLabel}>상품 사진</Text>
          <View style={{ flexDirection: "row", gap: 9, marginTop: 9, flexWrap: "wrap" }}>
            {photos.length < 5 && (
              <Pressable style={styles.photoAdd} onPress={onAddPhoto}>
                <CameraIcon size={22} color={t.dim} />
                <Text style={{ fontSize: 11, fontWeight: "600", color: t.dim }}>
                  {photos.length}/5
                </Text>
              </Pressable>
            )}
            {photos.map((uri) => (
              <Pressable key={uri} onPress={() => onRemovePhoto(uri)}>
                <Image source={{ uri }} style={styles.photoThumb} />
                <View style={styles.photoRemoveBadge}>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: "#fff" }}>✕</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        <View>
          <Text style={styles.fieldLabel}>상품명</Text>
          <TextInput
            value={title}
            onChangeText={onTitleChange}
            placeholder="예) 코스트코 크루아상 24개입"
            placeholderTextColor={t.dim}
            style={styles.createInput}
          />
        </View>

        <View>
          <Text style={styles.fieldLabel}>카테고리</Text>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 9, flexWrap: "wrap" }}>
            {CREATE_CATS.map((label) => {
              const active = label === cat;
              return (
                <Pressable
                  key={label}
                  onPress={() => onCat(label)}
                  style={[
                    styles.catChip,
                    {
                      backgroundColor: active ? t.roseSoft : "#fff",
                      borderColor: active ? t.rose : t.border
                    }
                  ]}
                >
                  <Text
                    style={{ fontSize: 13, fontWeight: "600", color: active ? t.rose : t.chipInk }}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 11 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>총 가격</Text>
            <Pressable style={styles.suffixField} onPress={() => totalInputRef.current?.focus()}>
              <TextInput
                ref={totalInputRef}
                value={total}
                onChangeText={(v) => onTotal(v.replace(/[^0-9]/g, ""))}
                keyboardType="number-pad"
                style={styles.suffixInput}
              />
              <Text style={styles.suffix}>원</Text>
            </Pressable>
          </View>
          <View style={{ width: 108 }}>
            <Text style={styles.fieldLabel}>모집 인원</Text>
            <Pressable style={styles.suffixField} onPress={() => membersInputRef.current?.focus()}>
              <TextInput
                ref={membersInputRef}
                value={members}
                onChangeText={(v) => onMembers(v.replace(/[^0-9]/g, ""))}
                onBlur={() => {
                  if (Number(members) < 2) onMembers("2");
                }}
                keyboardType="number-pad"
                style={styles.suffixInput}
              />
              <Text style={styles.suffix}>명</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.perPersonBox}>
          <Text style={{ fontSize: 13, fontWeight: "600", color: t.roseInk }}>예상 1인 부담금</Text>
          <Text style={{ fontSize: 20, fontWeight: "800", color: t.rose }}>{perPerson}</Text>
        </View>

        <View style={{ flexDirection: "row", gap: 11 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>픽업 장소</Text>
            <TextInput
              value={pickup}
              onChangeText={onPickup}
              placeholder="정문 CU 앞"
              placeholderTextColor={t.dim}
              style={styles.createInput}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>픽업 시간</Text>
            <TextInput
              value={time}
              onChangeText={onTime}
              placeholder="오늘 저녁 7시"
              placeholderTextColor={t.dim}
              style={styles.createInput}
            />
          </View>
        </View>

        <View>
          <Text style={styles.fieldLabel}>공구 마감 시간</Text>
          <Pressable style={styles.createInput} onPress={openDeadlineSheet}>
            <Text style={{ fontSize: 14, color: t.ink, lineHeight: 44 }}>
              {formatDateLabel(deadlineDate)} {deadlineTime}
            </Text>
          </Pressable>
          <Text style={{ fontSize: 12, color: t.muted, marginTop: 6 }}>
            {formatDeadline(buildDeadlineIso(deadlineDate, deadlineTime))}
          </Text>
        </View>

        <View>
          <Text style={styles.fieldLabel}>소분 방법</Text>
          <TextInput
            value={split}
            onChangeText={onSplitChange}
            placeholder="예) 1인 4개씩 나눠가져요"
            placeholderTextColor={t.dim}
            style={styles.createInput}
          />
        </View>
      </ScrollView>

      <View style={styles.stickyFooter}>
        <Pressable style={[styles.footerButton, { backgroundColor: t.pink }]} onPress={onPost}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>
            {editing ? "수정 완료" : "공구 게시하기"}
          </Text>
        </Pressable>
      </View>

      {showDeadlineSheet && (
        <Pressable
          style={styles.sheetBackdrop}
          onPress={() => {
            commitDeadlineTime();
            setShowDeadlineSheet(false);
          }}
        >
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetGrabber} />
            <Text style={{ fontSize: 17, fontWeight: "800", color: t.ink }}>공구 마감 시간</Text>

            <CalendarPicker selectedDate={deadlineDate} onSelect={onDeadlineDate} />

            <View style={{ flexDirection: "row", gap: 11, marginTop: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>시</Text>
                <TextInput
                  value={hourDraft}
                  onChangeText={(v) => setHourDraft(v.replace(/[^0-9]/g, "").slice(0, 2))}
                  onBlur={commitDeadlineTime}
                  keyboardType="number-pad"
                  maxLength={2}
                  style={styles.createInput}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>분</Text>
                <TextInput
                  value={minuteDraft}
                  onChangeText={(v) => setMinuteDraft(v.replace(/[^0-9]/g, "").slice(0, 2))}
                  onBlur={commitDeadlineTime}
                  keyboardType="number-pad"
                  maxLength={2}
                  style={styles.createInput}
                />
              </View>
            </View>

            <Pressable
              style={[styles.pillButton, { backgroundColor: t.pink, marginTop: 16 }]}
              onPress={() => {
                commitDeadlineTime();
                setShowDeadlineSheet(false);
              }}
            >
              <Text style={[styles.pillButtonText, { color: "#fff" }]}>완료</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Review                                                              */
/* ------------------------------------------------------------------ */

function ReviewScreen({
  deal,
  ratings,
  onRate,
  onBack,
  onSubmit
}: {
  deal: Deal;
  ratings: Record<ReviewKey, number>;
  onRate: (key: ReviewKey, value: number) => void;
  onBack: () => void;
  onSubmit: (comment: string) => void | Promise<void>;
}) {
  const [comment, setComment] = useState("");
  const done = REVIEW_QUESTIONS.every((q) => ratings[q.key] > 0);

  return (
    <View style={styles.flex}>
      <View style={styles.simpleHeader}>
        <Pressable onPress={onBack} style={{ padding: 4 }}>
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>
        <Text style={styles.simpleHeaderTitle}>후기 작성</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 10 }}>
        <View style={{ alignItems: "center", paddingVertical: 14, paddingBottom: 20 }}>
          <View style={[styles.reviewAvatar, { backgroundColor: deal.tint }]}>
            <Text style={{ fontSize: 22, fontWeight: "800", color: "rgba(0,0,0,0.4)" }}>
              {deal.leader.charAt(0)}
            </Text>
          </View>
          <Text style={styles.reviewHeadline}>
            {deal.leader}님과의 거래는{"\n"}어떠셨나요?
          </Text>
          <Text style={{ fontSize: 13, color: t.muted, marginTop: 6 }}>{deal.title}</Text>
        </View>

        <View style={{ gap: 18 }}>
          {REVIEW_QUESTIONS.map((q) => (
            <View key={q.key}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: t.ink, marginBottom: 10 }}>
                {q.label}
              </Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {[1, 2, 3, 4, 5].map((v) => (
                  <Pressable key={v} onPress={() => onRate(q.key, v)} style={{ padding: 2 }}>
                    <Text style={{ fontSize: 32, color: v <= ratings[q.key] ? t.rose : t.trackOff }}>
                      {v <= ratings[q.key] ? "★" : "☆"}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </View>

        <View style={{ marginTop: 20 }}>
          <Text style={styles.fieldLabel}>한 줄 후기 (선택)</Text>
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="거래 경험을 짧게 남겨주세요"
            placeholderTextColor={t.dim}
            style={[styles.createInput, { marginTop: 8 }]}
          />
        </View>
      </ScrollView>

      <View style={styles.stickyFooter}>
        <Pressable
          disabled={!done}
          style={[styles.footerButton, { backgroundColor: done ? t.pink : "#EDEAE3" }]}
          onPress={() => void onSubmit(comment)}
        >
          <Text style={{ fontSize: 16, fontWeight: "700", color: done ? "#fff" : t.dim }}>
            후기 제출하기
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* My page                                                             */
/* ------------------------------------------------------------------ */

function MyPageScreen({
  nickname,
  notif,
  onToggle,
  onReviewDemo
}: {
  nickname: string;
  notif: Record<NotifKey, boolean>;
  onToggle: (key: NotifKey) => void;
  onReviewDemo: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.myBody}>
      <Text style={styles.myTitle}>마이페이지</Text>

      <View style={styles.profileCard}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <View style={styles.profileAvatar}>
            <Text style={{ fontSize: 22, fontWeight: "800", color: t.rose }}>
              {nickname.charAt(0)}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <Text style={{ fontSize: 17, fontWeight: "800", color: t.ink }}>{nickname}</Text>
              <View style={styles.eduChip}>
                <Text style={{ fontSize: 10, fontWeight: "700", color: t.greenInk }}>🎓 학교인증</Text>
              </View>
            </View>
            <Text style={{ fontSize: 13, color: t.muted, marginTop: 2 }}>봉천동 · 서울대학교</Text>
          </View>
          <Pressable style={styles.editButton}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: t.chipInk }}>편집</Text>
          </Pressable>
        </View>

        <View style={{ marginTop: 18 }}>
          <View style={[styles.rowBetween, { marginBottom: 7 }]}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: t.ink }}>매너온도</Text>
            <Text style={{ fontSize: 18, fontWeight: "800", color: t.rose }}>37.4°C</Text>
          </View>
          <GradientBar ratio={tempRatio(37.4)} knobColor={t.rose} />
          <Text style={{ fontSize: 11, color: t.muted, marginTop: 6 }}>
            첫 온도 36.5°C에서 0.9°C 올랐어요
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
        <StatCard value="8" label="거래 완료" />
        <StatCard value="6" label="받은 후기" />
        <StatCard value="0" label="노쇼" valueColor={t.greenInk} />
      </View>

      <Text style={styles.mySection}>이웃이 남긴 후기</Text>
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        <ReviewTag emoji="⏱️" text="시간 약속을 잘 지켜요" count={5} />
        <ReviewTag emoji="⚖️" text="소분이 공정해요" count={4} />
        <ReviewTag emoji="💬" text="친절하고 매너있어요" count={4} />
      </View>

      <Text style={styles.mySection}>알림 설정</Text>
      <View style={styles.notifCard}>
        {NOTIF_ITEMS.map((item, i) => (
          <View
            key={item.key}
            style={[
              styles.notifRow,
              i < NOTIF_ITEMS.length - 1 && { borderBottomWidth: 1, borderBottomColor: t.line }
            ]}
          >
            <Text style={{ fontSize: 14, color: t.ink }}>{item.label}</Text>
            <Toggle on={notif[item.key]} onPress={() => onToggle(item.key)} />
          </View>
        ))}
      </View>

      <Pressable style={styles.reviewDemoButton} onPress={onReviewDemo}>
        <Text style={{ fontSize: 13, fontWeight: "600", color: t.chipInk }}>
          최근 거래 후기 작성하기 →
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function StatCard({ value, label, valueColor }: { value: string; label: string; valueColor?: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={{ fontSize: 20, fontWeight: "800", color: valueColor ?? t.ink }}>{value}</Text>
      <Text style={{ fontSize: 12, color: t.muted, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function ReviewTag({ emoji, text, count }: { emoji: string; text: string; count: number }) {
  return (
    <View style={styles.reviewTag}>
      <Text style={{ fontSize: 13, color: t.inkSoft }}>
        {emoji} {text} <Text style={{ color: t.rose, fontWeight: "700" }}>{count}</Text>
      </Text>
    </View>
  );
}

function Toggle({ on, onPress }: { on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.toggleTrack, { backgroundColor: on ? t.rose : t.trackOff }]}
    >
      <View style={[styles.toggleKnob, { left: on ? 22 : 3 }]} />
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* Bottom nav                                                          */
/* ------------------------------------------------------------------ */

function BottomNav({
  active,
  onHome,
  onMap,
  onCreate,
  onChat,
  onMy
}: {
  active: MainTab;
  onHome: () => void;
  onMap: () => void;
  onCreate: () => void;
  onChat: () => void;
  onMy: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.nav, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <NavItem iconNode={<HomeIcon size={22} color={active === "home" ? t.rose : t.dim} />} label="홈" active={active === "home"} onPress={onHome} />
      <NavItem iconNode={<MapPinIcon size={22} color={active === "map" ? t.rose : t.dim} />} label="지도" active={active === "map"} onPress={onMap} />
      <Pressable style={styles.navCenter} onPress={onCreate}>
        <View style={styles.fab}>
          <Text style={{ fontSize: 28, color: "#fff", fontWeight: "300", lineHeight: 30 }}>+</Text>
        </View>
      </Pressable>
      <NavItem iconNode={<ChatBubbleIcon size={22} color={active === "chat" ? t.rose : t.dim} />} label="채팅" active={active === "chat"} onPress={onChat} />
      <NavItem iconNode={<PersonIcon size={22} color={active === "mypage" ? t.rose : t.dim} />} label="마이" active={active === "mypage"} onPress={onMy} />
    </View>
  );
}

function NavItem({
  iconNode,
  label,
  active,
  onPress
}: {
  iconNode: React.ReactNode;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.navItem} onPress={onPress}>
      {iconNode}
      <Text style={{ fontSize: 10, fontWeight: "600", color: active ? t.rose : t.dim }}>{label}</Text>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* Join bottom sheet                                                   */
/* ------------------------------------------------------------------ */

function JoinSheet({
  deal,
  onClose,
  onConfirm
}: {
  deal: Deal;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Pressable style={styles.sheetBackdrop} onPress={onClose}>
      <Pressable style={styles.sheet} onPress={() => {}}>
        <View style={styles.sheetGrabber} />
        <Text style={{ fontSize: 19, fontWeight: "800", color: t.ink }}>이 공구에 참여할까요?</Text>
        <Text style={{ fontSize: 13, color: t.muted, marginTop: 4 }}>{deal.title}</Text>

        <View style={styles.sheetSummary}>
          <View style={styles.rowBetween}>
            <Text style={{ fontSize: 14, color: t.chipInk }}>총 가격</Text>
            <Text style={{ fontSize: 14, fontWeight: "600", color: t.ink }}>{fmt(deal.total)}</Text>
          </View>
          <View style={styles.rowBetween}>
            <Text style={{ fontSize: 14, color: t.chipInk }}>모집 인원</Text>
            <Text style={{ fontSize: 14, fontWeight: "600", color: t.ink }}>{deal.max}명</Text>
          </View>
          <View style={styles.sheetDivider} />
          <View style={[styles.rowBetween, { alignItems: "center" }]}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: t.ink }}>내 부담금 (1/N)</Text>
            <Text style={{ fontSize: 22, fontWeight: "800", color: t.rose }}>{fmt(per(deal))}</Text>
          </View>
        </View>

        <View style={styles.sheetNote}>
          <Text style={{ fontSize: 12, color: t.roseInk, lineHeight: 18 }}>
            📍 {deal.spot}에서 {deal.pickup}에 픽업해요. 참여 확정 시 채팅방에 자동 입장됩니다.
          </Text>
        </View>

        <Pressable style={[styles.pillButton, { backgroundColor: t.pink, marginTop: 16 }]} onPress={onConfirm}>
          <Text style={[styles.pillButtonText, { color: "#fff" }]}>참여 확정하기</Text>
        </Pressable>
      </Pressable>
    </Pressable>
  );
}

function ConfirmModal({
  title,
  description,
  confirmLabel,
  onCancel,
  onConfirm
}: {
  title: string;
  description: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Pressable style={styles.modalBackdrop} onPress={onCancel}>
      <Pressable style={styles.confirmModal} onPress={() => {}}>
        <Text style={styles.confirmModalTitle}>{title}</Text>
        <Text style={styles.confirmModalDesc}>{description}</Text>
        <View style={{ flexDirection: "row", gap: 10, marginTop: 20 }}>
          <Pressable style={[styles.confirmModalButton, { backgroundColor: t.bg }]} onPress={onCancel}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: t.chipInk }}>취소</Text>
          </Pressable>
          <Pressable style={[styles.confirmModalButton, { backgroundColor: t.rose }]} onPress={onConfirm}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>{confirmLabel}</Text>
          </Pressable>
        </View>
      </Pressable>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.bg },
  flex: { flex: 1 },
  root: { flex: 1, backgroundColor: t.bg },
  body: { flex: 1, minHeight: 0 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },

  /* login */
  loginWrap: { flex: 1, paddingHorizontal: 28, paddingTop: "8%", paddingBottom: "4%", backgroundColor: "#FEF4F7" },
  loginHero: { flex: 1, alignItems: "center", justifyContent: "center", gap: 22 },
  logoCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: t.pink,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#E73C64",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 12
  },
  logoEmoji: { fontSize: 38 },
  loginTitle: { fontSize: 30, fontWeight: "800", color: t.ink, letterSpacing: -0.5 },
  loginSubtitle: { fontSize: 15, color: t.muted, lineHeight: 22, textAlign: "center" },
  authButton: {
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 4,
  },
  authButtonText: { fontSize: 16, fontWeight: "700" },

  /* verify */
  verifyWrap: { flex: 1, paddingHorizontal: 28, paddingTop: 14, paddingBottom: 24 },
  stepRow: { flexDirection: "row", gap: 6, marginBottom: 30 },
  stepBar: { height: 4, flex: 1, borderRadius: 2 },
  verifyTitle: { fontSize: 24, fontWeight: "800", color: t.ink, letterSpacing: -0.4, lineHeight: 33 },
  verifyDesc: { fontSize: 14, color: t.muted, marginTop: 10, lineHeight: 21 },
  verifyCenter: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6 },
  nickField: {
    marginTop: 34,
    borderBottomWidth: 2,
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 10
  },
  nickInput: { flex: 1, minWidth: 0, fontSize: 20, fontWeight: "600", color: t.ink, padding: 0 },
  locateCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#FFF0F5",
    alignItems: "center",
    justifyContent: "center"
  },
  doneCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: t.pink,
    alignItems: "center",
    justifyContent: "center"
  },
  eduBadge: {
    marginTop: 18,
    backgroundColor: t.calmBg,
    borderRadius: 11,
    paddingVertical: 11,
    paddingHorizontal: 16
  },

  /* shared buttons */
  pillButton: { height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center" },
  pillButtonText: { fontSize: 16, fontWeight: "700" },

  /* home */
  homeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12
  },
  locButton: { flexDirection: "row", alignItems: "center", gap: 5 },
  locText: { fontSize: 19, fontWeight: "800", color: t.ink },
  chevron: { fontSize: 18, color: t.ink, fontWeight: "700" },
  headerIcon: { fontSize: 20 },
  bellDot: {
    position: "absolute",
    top: -1,
    right: -1,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: t.rose
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: 12,
    height: 42,
    paddingHorizontal: 13,
    marginHorizontal: 20,
    marginBottom: 10
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    color: t.ink,
    padding: 0,
    outlineWidth: 0
  },
  chipScroll: { flexGrow: 0, flexShrink: 0 },
  chipRow: { gap: 8, paddingHorizontal: 20, paddingTop: 6, paddingBottom: 10 },
  filterChip: {
    height: 36,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center"
  },
  dealList: {
    flexGrow: 1,
    justifyContent: "flex-start",
    gap: 11,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 80
  },
  dealCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 12,
    flexDirection: "row",
    gap: 13,
    shadowColor: "#28180F",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2
  },
  dealThumb: {
    width: 86,
    height: 86,
    borderRadius: 13,
    justifyContent: "flex-end",
    padding: 7,
    overflow: "hidden"
  },
  thumbTag: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.6)",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2
  },
  thumbTagText: { fontSize: 10, fontWeight: "700", color: "rgba(0,0,0,0.34)" },
  deadlinePill: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  dealTitle: { fontSize: 15, fontWeight: "700", color: t.ink, marginTop: 7, lineHeight: 20 },
  dealStore: { fontSize: 12, color: t.muted, marginTop: 1 },
  dealPrice: { fontSize: 15, fontWeight: "800", color: t.rose },
  dealMeta: { fontSize: 11, fontWeight: "600", color: t.chipInk },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: t.line, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3, backgroundColor: t.rose },

  /* map */
  mapWrap: { flex: 1, backgroundColor: "#E8EDE6", overflow: "hidden" },
  mapRoad: {
    position: "absolute",
    left: "-10%",
    width: "120%",
    height: 46,
    backgroundColor: "#F3EDEF"
  },
  mapBlockA: {
    position: "absolute",
    left: "8%",
    top: "40%",
    width: 90,
    height: 80,
    borderRadius: 18,
    backgroundColor: "#D7E4CE"
  },
  mapBlockB: {
    position: "absolute",
    right: "10%",
    bottom: "24%",
    width: 70,
    height: 70,
    borderRadius: 14,
    backgroundColor: "#D7E4CE"
  },
  youOuter: {
    position: "absolute",
    left: "48%",
    top: "46%",
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(42,111,219,0.18)",
    alignItems: "center",
    justifyContent: "center"
  },
  youDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: "#2A6FDB", borderWidth: 3, borderColor: "#fff" },
  mapMarker: {
    position: "absolute",
    borderWidth: 2,
    borderColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 11,
    paddingVertical: 6,
    shadowColor: "#28180F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4
  },
  mapTopBar: {
    position: "absolute",
    top: 14,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  mapPill: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 14,
    shadowColor: "#28180F",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3
  },
  mapSheet: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 14,
    shadowColor: "#28180F",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 34,
    elevation: 10
  },
  mapSheetThumb: { width: 64, height: 64, borderRadius: 13 },
  mapSheetTitle: { fontSize: 15, fontWeight: "700", color: t.ink, marginTop: 3 },
  mapSheetButton: {
    height: 44,
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: t.pink,
    alignItems: "center",
    justifyContent: "center"
  },

  /* detail */
  detailHero: { height: 280, justifyContent: "center", alignItems: "center", overflow: "hidden" },
  detailBack: {
    position: "absolute",
    top: 14,
    left: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center"
  },
  backArrow: { fontSize: 30, color: t.ink, lineHeight: 32, marginTop: -2 },
  detailHostActions: {
    position: "absolute",
    top: 14,
    right: 16,
    flexDirection: "row",
    gap: 8
  },
  detailActionButton: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center"
  },
  detailHeroLabel: { fontFamily: Platform.OS === "ios" ? "Courier" : "monospace", fontSize: 13, color: "rgba(0,0,0,0.3)" },
  detailSheet: {
    flex: 1,
    backgroundColor: t.bg,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -20,
    paddingHorizontal: 20,
    paddingTop: 18
  },
  tagPill: { borderRadius: 9, paddingHorizontal: 9, paddingVertical: 3 },
  detailTitle: { fontSize: 21, fontWeight: "800", color: t.ink, marginTop: 11, lineHeight: 28 },
  priceCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginTop: 16 },
  fieldHint: { fontSize: 12, color: t.muted },
  priceBig: { fontSize: 26, fontWeight: "800", color: t.rose, marginTop: 2 },
  infoCard: { backgroundColor: "#fff", borderRadius: 16, paddingHorizontal: 16, marginTop: 11 },
  infoRow: { flexDirection: "row", gap: 12, paddingVertical: 13 },
  infoRowDivider: { borderBottomWidth: 1, borderBottomColor: t.line },
  infoRowLabel: { fontSize: 13, color: t.muted, width: 68 },
  infoRowValue: { fontSize: 13, fontWeight: "600", color: t.ink, flex: 1 },
  detailDesc: { fontSize: 14, color: t.inkSoft, lineHeight: 22, marginTop: 16 },
  trustCard: { backgroundColor: "#fff", borderRadius: 16, padding: 15, marginTop: 16, marginBottom: 18 },
  leaderAvatar: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  ctaBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: t.line,
    paddingHorizontal: 20,
    paddingVertical: 12
  },
  heartButton: {
    width: 48,
    height: 48,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#EBE2E5",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center"
  },
  ctaButton: { flex: 1, height: 52, borderRadius: 14, backgroundColor: t.pink, alignItems: "center", justifyContent: "center" },

  /* gradient bar */
  gradientWrap: { justifyContent: "center" },
  gradientTrack: { flexDirection: "row", height: 8, borderRadius: 4, overflow: "hidden" },
  gradientKnob: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#fff",
    borderWidth: 2.5,
    marginLeft: -7
  },

  /* chat */
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    backgroundColor: "#fff",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: t.line
  },
  chatHeaderThumb: { width: 38, height: 38, borderRadius: 11 },
  chatBody: { flex: 1, backgroundColor: t.bg },
  systemMsg: {
    fontSize: 12,
    color: t.muted,
    backgroundColor: "#E9E1E4",
    paddingVertical: 6,
    paddingHorizontal: 13,
    borderRadius: 20,
    overflow: "hidden",
    textAlign: "center"
  },
  msgName: { fontSize: 11, color: t.muted, marginBottom: 3, marginLeft: 4 },
  bubble: { paddingVertical: 9, paddingHorizontal: 13 },
  bubbleMe: { backgroundColor: t.pink, borderRadius: 16, borderTopRightRadius: 4 },
  bubbleOther: { backgroundColor: "#fff", borderRadius: 16, borderTopLeftRadius: 4 },
  msgTime: { fontSize: 10, color: t.dim },
  composer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: "#fff",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderTopWidth: 1,
    borderTopColor: t.line
  },
  composerInputWrap: {
    flex: 1,
    backgroundColor: t.calmBg,
    borderRadius: 22,
    paddingHorizontal: 14,
    height: 42,
    justifyContent: "center"
  },
  composerInput: { fontSize: 14, color: t.ink, padding: 0 },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: t.pink,
    alignItems: "center",
    justifyContent: "center"
  },

  /* simple header (create/review) */
  simpleHeader: { flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 8, paddingHorizontal: 16 },
  simpleHeaderTitle: { fontSize: 18, fontWeight: "800", color: t.ink },

  /* create */
  createBody: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 18, gap: 18 },
  fieldLabel: { fontSize: 13, fontWeight: "700", color: t.ink },
  photoAdd: {
    width: 72,
    height: 72,
    borderRadius: 13,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#D4C8CC",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    gap: 3
  },
  photoThumb: { width: 72, height: 72, borderRadius: 13 },
  photoRemoveBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center"
  },
  calendarWrap: { marginTop: 16 },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4
  },
  calendarNavButton: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  calendarNavArrow: { fontSize: 22, color: t.ink },
  calendarHeaderTitle: { fontSize: 15, fontWeight: "700", color: t.ink },
  calendarWeekRow: { flexDirection: "row", marginTop: 14 },
  calendarWeekday: { flex: 1, textAlign: "center", fontSize: 12, fontWeight: "600", color: t.muted },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: 4 },
  calendarCell: { width: "14.2857%", height: 40, alignItems: "center", justifyContent: "center" },
  calendarDayCircle: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  createInput: {
    marginTop: 8,
    height: 46,
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    backgroundColor: "#fff",
    color: t.ink
  },
  catChip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 11, borderWidth: 1 },
  suffixField: {
    marginTop: 8,
    height: 46,
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff"
  },
  suffixInput: { flex: 1, minWidth: 0, fontSize: 14, fontWeight: "600", color: t.ink, padding: 0 },
  suffix: { fontSize: 13, color: t.muted },
  perPersonBox: {
    backgroundColor: t.roseSoft,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  stickyFooter: { backgroundColor: t.bg, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  footerButton: { height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },

  /* review */
  reviewAvatar: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" },
  reviewHeadline: { fontSize: 18, fontWeight: "800", color: t.ink, marginTop: 12, textAlign: "center", lineHeight: 25 },

  /* mypage */
  myBody: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 80 },
  myTitle: { fontSize: 20, fontWeight: "800", color: t.ink, paddingTop: 6, paddingBottom: 16 },
  profileCard: { backgroundColor: "#fff", borderRadius: 18, padding: 18 },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FEE0EA",
    alignItems: "center",
    justifyContent: "center"
  },
  eduChip: { backgroundColor: t.greenBg, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  editButton: { borderWidth: 1, borderColor: t.border, borderRadius: 10, paddingVertical: 7, paddingHorizontal: 12 },
  statCard: { flex: 1, backgroundColor: "#fff", borderRadius: 20, padding: 15, alignItems: "center" },
  mySection: { fontSize: 13, fontWeight: "700", color: t.ink, marginTop: 22, marginBottom: 9 },
  reviewTag: { backgroundColor: "#fff", borderRadius: 11, paddingVertical: 8, paddingHorizontal: 13 },
  notifCard: { backgroundColor: "#fff", borderRadius: 16, paddingHorizontal: 16 },
  notifRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14 },
  toggleTrack: { width: 46, height: 27, borderRadius: 14, justifyContent: "center" },
  toggleKnob: {
    position: "absolute",
    top: 3,
    width: 21,
    height: 21,
    borderRadius: 11,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2
  },
  reviewDemoButton: {
    marginTop: 16,
    backgroundColor: t.calmBg,
    borderRadius: 13,
    paddingVertical: 14,
    alignItems: "center"
  },

  /* bottom nav */
  nav: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: t.line,
    paddingTop: 8,
    paddingHorizontal: 8,
    /* paddingBottom is set dynamically via useSafeAreaInsets */
  },
  navItem: { flex: 1, alignItems: "center", justifyContent: "flex-start", minHeight: 46, gap: 3 },
  navCenter: { flex: 1, alignItems: "center", justifyContent: "flex-start" },
  fab: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: t.pink,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -10,
    shadowColor: "#E73C64",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 10
  },

  /* join sheet */
  sheetBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(28,26,21,0.45)",
    justifyContent: "flex-end"
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 26
  },
  sheetGrabber: { width: 38, height: 4, borderRadius: 2, backgroundColor: t.border, alignSelf: "center", marginVertical: 6, marginBottom: 18 },
  sheetSummary: { backgroundColor: t.bg, borderRadius: 16, padding: 16, marginTop: 18, gap: 11 },
  sheetDivider: { height: 1, backgroundColor: "#E6DDE0" },
  sheetNote: { flexDirection: "row", gap: 9, backgroundColor: t.roseSoft, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, marginTop: 12 },

  /* delete confirm modal */
  modalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(28,26,21,0.45)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28
  },
  confirmModal: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 20
  },
  confirmModalTitle: { fontSize: 17, fontWeight: "800", color: t.ink, textAlign: "center" },
  confirmModalDesc: { fontSize: 13, color: t.muted, textAlign: "center", marginTop: 10, lineHeight: 19 },
  confirmModalButton: { flex: 1, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },

  /* toast */
  toast: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 96,
    alignItems: "center"
  },
  toastText: {
    backgroundColor: t.ink,
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 13,
    overflow: "hidden"
  }
});
