import { useEffect, useMemo, useRef, useState } from "react";
import {
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
import { createGongguDoc } from "../services/firebase/gongguRepository";
import {
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
};

const HOME_FILTERS = ["전체", "베이커리", "식품", "간식", "생필품", "기타"];
const CREATE_CATS = ["베이커리", "식품", "간식", "생필품", "뷰티", "기타"];

type ChatMsg = { type: "system" | "other" | "me"; name?: string; text: string; time?: string };

/* Gonggu → Deal 어댑터 */
const CATEGORY_TINTS: Record<string, string> = {
  베이커리: "#F3DEC4",
  식품: "#CFE2EC",
  간식: "#F0D2CE",
  생필품: "#D8E0CC",
  뷰티: "#E8D5E5",
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
    store: g.purchaseStore,
    total: g.totalPrice,
    cur: g.currentParticipants,
    max: g.targetParticipants,
    dist: g.pickupDistanceMeters > 0 ? `${g.pickupDistanceMeters}m` : "근처",
    deadline: g.recruitmentDeadline,
    urgent: /[12]시간|30분|마감/.test(g.recruitmentDeadline),
    spot: g.pickupPlaceName,
    pickup: g.pickupExpectedTime,
    leader: g.hostNickname,
    temp: g.hostTrustScore,
    deals: 0,
    reviews: gReviews.length,
    noshow: 0,
    tint: CATEGORY_TINTS[g.category] ?? "#EEE0E5",
    method: g.splitMethod,
    desc: g.description
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

const fmt = (n: number) => `${Number(n).toLocaleString("ko-KR")}원`;
const per = (d: Deal) => Math.ceil(d.total / d.max);
const memberStr = (d: Deal) => `${d.cur}/${d.max}명`;
const barPct = (d: Deal) => Math.round((d.cur / d.max) * 100);
const remain = (d: Deal) => `앞으로 ${d.max - d.cur}명`;
const statusOf = (d: Deal) => (d.cur >= d.max ? "모집완료" : "모집중");
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
  const [screen, setScreen] = useState<Screen>("login");
  const [tab, setTab] = useState<MainTab>("home");
  const [selectedId, setSelectedId] = useState("");
  const [mapSel, setMapSel] = useState("");
  const [joined, setJoined] = useState<string[]>([]);
  const [hearts, setHearts] = useState<string[]>([]);
  const [showJoin, setShowJoin] = useState(false);
  const [toast, setToast] = useState("");

  const [nickname, setNickname] = useState("");
  const [verifyStep, setVerifyStep] = useState(0);
  const [locating, setLocating] = useState(false);

  const [extraMsgs, setExtraMsgs] = useState<ChatMsg[]>([]);
  const [homeFilter, setHomeFilter] = useState("전체");
  const [createCat, setCreateCat] = useState("베이커리");
  const [cTotal, setCTotal] = useState("");
  const [cMembers, setCMembers] = useState("4");
  const [cPickup, setCPickup] = useState("");
  const [cTime, setCTime] = useState("");
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

  /* 첫 딜 로드 시 selectedId / mapSel 초기화 */
  useEffect(() => {
    if (deals.length > 0 && !selectedId) {
      setSelectedId(deals[0]!.id);
      setMapSel(deals[0]!.id);
    }
  }, [deals, selectedId]);

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
    () => deals.find((d) => d.id === mapSel) ?? deals[0] ?? null,
    [deals, mapSel]
  );

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

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 1900);
  }

  function openDeal(id: string) {
    setSelectedId(id);
    setScreen("detail");
  }

  async function confirmJoin() {
    if (!selectedId) return;
    if (isFirebaseConfigured()) {
      try {
        await joinGongguDoc(selectedId, currentUser);
      } catch {
        showToast("참여 중 오류가 발생했어요. 다시 시도해주세요.");
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
    }
    if (!isFirebaseConfigured()) {
      setExtraMsgs((prev) => [...prev, { type: "me", name: currentUser.nickname, text: trimmed, time: "지금" }]);
    }
  }

  async function handleCreate() {
    if (isFirebaseConfigured()) {
      try {
        await createGongguDoc(
          {
            title: `${createCat} 공구`,
            totalPrice: Number(cTotal) || 0,
            targetParticipants: Number(cMembers) || 4,
            pickupPlaceName: cPickup || "장소 미정",
            pickupExpectedTime: cTime || "시간 미정"
          },
          currentUser
        );
      } catch {
        showToast("공구 생성에 실패했어요. 다시 시도해주세요.");
        return;
      }
    }
    go("home", "home");
    showToast("공구가 게시됐어요! 🎉");
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

  const showNav = (["home", "map", "chat", "mypage"] as Screen[]).includes(screen);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" backgroundColor={t.card} translucent={false} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "android" ? 0 : 0}
        style={styles.flex}
      >
        <View style={styles.root}>
          <View style={styles.body}>
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
                deals={deals}
                filter={homeFilter}
                onFilter={setHomeFilter}
                onOpen={openDeal}
              />
            )}

            {screen === "map" && (
              <MapScreen
                deals={deals}
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
                onBack={() => go(tab)}
                onHeart={() =>
                  setHearts((prev) =>
                    prev.includes(sel.id) ? prev.filter((x) => x !== sel.id) : [...prev, sel.id]
                  )
                }
                onCta={() => {
                  if (joined.includes(sel.id)) go("chat");
                  else setShowJoin(true);
                }}
              />
            )}

            {screen === "chat" && sel && (
              <ChatScreen
                deal={sel}
                messages={chatMsgs}
                onBack={() => go(tab)}
                onSend={sendMessage}
              />
            )}

            {screen === "create" && (
              <CreateScreen
                cat={createCat}
                onCat={setCreateCat}
                total={cTotal}
                members={cMembers}
                pickup={cPickup}
                time={cTime}
                onTotal={setCTotal}
                onMembers={setCMembers}
                onPickup={setCPickup}
                onTime={setCTime}
                onBack={() => go(tab)}
                onPost={handleCreate}
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
              active={screen as MainTab}
              onHome={() => go("home", "home")}
              onMap={() => go("map", "map")}
              onCreate={() => setScreen("create")}
              onChat={() => go("chat", "chat")}
              onMy={() => go("mypage", "mypage")}
            />
          )}

          {showJoin && sel && (
            <JoinSheet deal={sel} onClose={() => setShowJoin(false)} onConfirm={confirmJoin} />
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

      <View style={{ gap: 11, paddingBottom: isSmall ? 8 : 14 }}>
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
              <Text style={{ fontSize: 46 }}>{locating ? "⏳" : "📍"}</Text>
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
  const visible = deals.filter((d) => filter === "전체" || d.cat === filter);

  return (
    <View style={styles.flex}>
      <View style={styles.homeHeader}>
        <Pressable style={styles.locButton}>
          <Text style={styles.locText}>봉천동</Text>
          <Text style={styles.chevron}>⌄</Text>
        </Pressable>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
          <Text style={styles.headerIcon}>🔍</Text>
          <View>
            <Text style={styles.headerIcon}>🔔</Text>
            <View style={styles.bellDot} />
          </View>
        </View>
      </View>

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
              <Text style={{ fontSize: 13, fontWeight: "600", color: active ? "#fff" : t.chipInk }}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.dealList}>
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
        <View style={styles.thumbTag}>
          <Text style={styles.thumbTagText}>{deal.cat}</Text>
        </View>
      </View>
      <View style={{ flex: 1, justifyContent: "space-between" }}>
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
        <Text style={styles.dealStore}>{deal.store}</Text>
        <View>
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
  onBack,
  onHeart,
  onCta
}: {
  deal: Deal;
  hearted: boolean;
  joined: boolean;
  onBack: () => void;
  onHeart: () => void;
  onCta: () => void;
}) {
  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={{ paddingBottom: 12 }} stickyHeaderIndices={[]}>
        <View style={[styles.detailHero, { backgroundColor: deal.tint }]}>
          <Pressable style={styles.detailBack} onPress={onBack}>
            <Text style={styles.backArrow}>‹</Text>
          </Pressable>
          <Text style={styles.detailHeroLabel}>[ 상품 사진 ]</Text>
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
            {deal.store} · {deal.dist}
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
        <Pressable style={styles.ctaButton} onPress={onCta}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>
            {joined ? "채팅방 입장하기" : "참여하기"}
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

/* ------------------------------------------------------------------ */
/* Chat                                                                */
/* ------------------------------------------------------------------ */

function ChatScreen({
  deal,
  messages,
  onBack,
  onSend
}: {
  deal: Deal;
  messages: ChatMsg[];
  onBack: () => void;
  onSend: (text: string) => void;
}) {
  const [input, setInput] = useState("");

  function submit() {
    if (!input.trim()) return;
    onSend(input);
    setInput("");
  }

  return (
    <View style={styles.flex}>
      <View style={styles.chatHeader}>
        <Pressable onPress={onBack} style={{ padding: 4 }}>
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>
        <View style={[styles.chatHeaderThumb, { backgroundColor: deal.tint }]} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: t.ink }} numberOfLines={1}>
            {deal.title}
          </Text>
          <Text style={{ fontSize: 12, color: t.muted }}>참여자 {memberStr(deal)}</Text>
        </View>
        <View style={[styles.tagPill, { backgroundColor: t.roseSoft }]}>
          <Text style={{ fontSize: 11, fontWeight: "700", color: t.rose }}>{statusOf(deal)}</Text>
        </View>
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
                    flexDirection: isMe ? "row" : "row-reverse",
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
        <View style={styles.composerInputWrap}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="메시지 보내기"
            placeholderTextColor={t.dim}
            style={styles.composerInput}
            onSubmitEditing={submit}
            returnKeyType="send"
          />
        </View>
        <Pressable style={styles.sendButton} onPress={submit}>
          <Text style={{ fontSize: 16, color: "#fff" }}>➤</Text>
        </Pressable>
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
  total,
  members,
  pickup,
  time,
  onTotal,
  onMembers,
  onPickup,
  onTime,
  onBack,
  onPost
}: {
  cat: string;
  onCat: (c: string) => void;
  total: string;
  members: string;
  pickup: string;
  time: string;
  onTotal: (v: string) => void;
  onMembers: (v: string) => void;
  onPickup: (v: string) => void;
  onTime: (v: string) => void;
  onBack: () => void;
  onPost: () => void | Promise<void>;
}) {
  const perPerson = fmt(Math.ceil((Number(total) || 0) / (Number(members) || 1)));

  return (
    <View style={styles.flex}>
      <View style={styles.simpleHeader}>
        <Pressable onPress={onBack} style={{ padding: 4 }}>
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>
        <Text style={styles.simpleHeaderTitle}>공구 만들기</Text>
      </View>

      <ScrollView contentContainerStyle={styles.createBody}>
        <View>
          <Text style={styles.fieldLabel}>상품 사진</Text>
          <View style={{ flexDirection: "row", gap: 9, marginTop: 9 }}>
            <Pressable style={styles.photoAdd}>
              <Text style={{ fontSize: 22 }}>📷</Text>
              <Text style={{ fontSize: 11, fontWeight: "600", color: t.dim }}>0/5</Text>
            </Pressable>
            <View style={[styles.photoThumb, { backgroundColor: "#EDDEE3" }]} />
          </View>
        </View>

        <View>
          <Text style={styles.fieldLabel}>상품명</Text>
          <TextInput
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
            <View style={styles.suffixField}>
              <TextInput
                value={total}
                onChangeText={onTotal}
                keyboardType="number-pad"
                style={styles.suffixInput}
              />
              <Text style={styles.suffix}>원</Text>
            </View>
          </View>
          <View style={{ width: 108 }}>
            <Text style={styles.fieldLabel}>모집 인원</Text>
            <View style={styles.suffixField}>
              <TextInput
                value={members}
                onChangeText={onMembers}
                keyboardType="number-pad"
                style={styles.suffixInput}
              />
              <Text style={styles.suffix}>명</Text>
            </View>
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
          <Text style={styles.fieldLabel}>소분 방법</Text>
          <TextInput
            placeholder="예) 1인 4개씩 나눠가져요"
            placeholderTextColor={t.dim}
            style={styles.createInput}
          />
        </View>
      </ScrollView>

      <View style={styles.stickyFooter}>
        <Pressable style={[styles.footerButton, { backgroundColor: t.pink }]} onPress={onPost}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>공구 게시하기</Text>
        </Pressable>
      </View>
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
    <View style={[styles.nav, { paddingBottom: Math.max(insets.bottom, 6) }]}>
      <NavItem icon="🏠" label="홈" active={active === "home"} onPress={onHome} />
      <NavItem icon="📍" label="지도" active={active === "map"} onPress={onMap} />
      <Pressable style={styles.navCenter} onPress={onCreate}>
        <View style={styles.fab}>
          <Text style={{ fontSize: 26, color: "#fff", fontWeight: "300", lineHeight: 28 }}>＋</Text>
        </View>
      </Pressable>
      <NavItem icon="💬" label="채팅" active={active === "chat"} onPress={onChat} />
      <NavItem icon="👤" label="마이" active={active === "mypage"} onPress={onMy} />
    </View>
  );
}

function NavItem({
  icon,
  label,
  active,
  onPress
}: {
  icon: string;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.navItem} onPress={onPress}>
      <Text style={{ fontSize: 20, opacity: active ? 1 : 0.4 }}>{icon}</Text>
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
  nickInput: { flex: 1, fontSize: 20, fontWeight: "600", color: t.ink, padding: 0 },
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
    paddingTop: 8,
    paddingBottom: 4
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
  chipScroll: { flexGrow: 0 },
  chipRow: { gap: 8, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10 },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1
  },
  dealList: { gap: 11, paddingHorizontal: 16, paddingTop: 6, paddingBottom: 24 },
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
  dealTitle: { fontSize: 15, fontWeight: "700", color: t.ink, marginTop: 5, lineHeight: 20 },
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
    bottom: 14,
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
  detailHero: { height: 280, justifyContent: "center", alignItems: "center" },
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
  suffixInput: { flex: 1, fontSize: 14, fontWeight: "600", color: t.ink, padding: 0 },
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
  myBody: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 },
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
    marginTop: -18,
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
