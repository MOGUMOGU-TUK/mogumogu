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

import { colors } from "../shared/theme/colors";

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

const DEALS: Deal[] = [
  {
    id: "d1",
    cat: "베이커리",
    title: "코스트코 크루아상 24개입",
    store: "코스트코 양재점",
    total: 16800,
    cur: 4,
    max: 6,
    dist: "120m",
    deadline: "2시간 뒤 마감",
    urgent: true,
    spot: "정문 CU 앞",
    pickup: "오늘 저녁 7시",
    leader: "민지",
    temp: 38.2,
    deals: 12,
    reviews: 9,
    noshow: 0,
    tint: "#F3DEC4",
    method: "1인 4개씩 소분",
    desc: "코스트코 대용량 크루아상을 같이 나눠가져요. 냉동 보관하면 2주는 거뜬해요. 아침 대용으로 최고!"
  },
  {
    id: "d2",
    cat: "식품",
    title: "노브랜드 생수 2L × 24병",
    store: "노브랜드 신림점",
    total: 8990,
    cur: 3,
    max: 4,
    dist: "300m",
    deadline: "5시간 뒤 마감",
    urgent: false,
    spot: "후문 버스정류장",
    pickup: "오늘 밤 9시",
    leader: "도현",
    temp: 37.1,
    deals: 7,
    reviews: 5,
    noshow: 0,
    tint: "#CFE2EC",
    method: "1인 6병씩",
    desc: "기숙사 살면 물 사다 나르기 힘들죠. 차로 가져올 거라 같이 나눠요. 6병씩 가져가면 됩니다."
  },
  {
    id: "d3",
    cat: "간식",
    title: "마라탕 재료 공구 (분모자·푸주)",
    store: "동네마트 봉천",
    total: 21000,
    cur: 5,
    max: 7,
    dist: "80m",
    deadline: "내일 오후 마감",
    urgent: false,
    spot: "학생회관 1층",
    pickup: "내일 점심 12시",
    leader: "서연",
    temp: 39.5,
    deals: 21,
    reviews: 18,
    noshow: 0,
    tint: "#F0D2CE",
    method: "재료별 1/N 소분",
    desc: "집에서 마라탕 해먹을 재료 대량으로 떼와요. 분모자, 푸주, 건두부 다 들어있어요. 양 푸짐!"
  },
  {
    id: "d4",
    cat: "생필품",
    title: "다이소 청소·정리템 대량",
    store: "다이소 봉천점",
    total: 12500,
    cur: 2,
    max: 5,
    dist: "450m",
    deadline: "8시간 뒤 마감",
    urgent: false,
    spot: "봉천역 2번출구",
    pickup: "오늘 밤 8시",
    leader: "준호",
    temp: 36.5,
    deals: 3,
    reviews: 2,
    noshow: 0,
    tint: "#D8E0CC",
    method: "품목별 나눔",
    desc: "자취 청소템 모음. 수세미, 행주, 정리용품 등 필요한 것만 골라가도 돼요."
  },
  {
    id: "d5",
    cat: "식품",
    title: "샤인머스캣 2박스 소분",
    store: "청과마트 봉천",
    total: 28000,
    cur: 6,
    max: 8,
    dist: "200m",
    deadline: "3시간 뒤 마감",
    urgent: true,
    spot: "기숙사 A동 앞",
    pickup: "오늘 저녁 6시 반",
    leader: "하늘",
    temp: 40.1,
    deals: 34,
    reviews: 29,
    noshow: 0,
    tint: "#D6E2C8",
    method: "한 송이씩",
    desc: "당도 높은 샤인머스캣 도매로 떼와서 소분해요. 한 송이씩 가져가시면 됩니다. 완전 꿀!"
  }
];

const MAP_POS: Record<string, { left: string; top: string }> = {
  d1: { left: "46%", top: "30%" },
  d2: { left: "72%", top: "40%" },
  d3: { left: "30%", top: "56%" },
  d4: { left: "64%", top: "70%" },
  d5: { left: "40%", top: "78%" }
};

const HOME_FILTERS = ["전체", "베이커리", "식품", "간식", "생필품"];
const CREATE_CATS = ["베이커리", "식품", "간식", "생필품", "뷰티"];

type ChatMsg = { type: "system" | "other" | "me"; name?: string; text: string; time?: string };

const BASE_MSGS: ChatMsg[] = [
  { type: "system", text: "민지님이 공구를 시작했어요" },
  { type: "other", name: "민지", text: "안녕하세요! 크루아상 공구 시작합니다 🥐", time: "오후 4:02" },
  { type: "other", name: "지우", text: "저 참여했어요~ 4개 가져갈게요", time: "오후 4:10" },
  { type: "me", name: "나", text: "저도 참여했습니다! 7시에 정문에서 뵐게요", time: "오후 4:21" },
  { type: "system", text: "앞으로 2명이면 모집 완료돼요" }
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
  const [selectedId, setSelectedId] = useState("d1");
  const [mapSel, setMapSel] = useState("d1");
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
  const [cTotal, setCTotal] = useState("16800");
  const [cMembers, setCMembers] = useState("6");
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

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sel = useMemo(() => DEALS.find((d) => d.id === selectedId) ?? DEALS[0]!, [selectedId]);
  const mapPick = useMemo(() => DEALS.find((d) => d.id === mapSel) ?? DEALS[0]!, [mapSel]);

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

  function confirmJoin() {
    setJoined((prev) => Array.from(new Set([...prev, selectedId])));
    setShowJoin(false);
    setScreen("chat");
    showToast("참여 완료! 채팅방에 입장했어요");
  }

  function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setExtraMsgs((prev) => [...prev, { type: "me", name: "나", text: trimmed, time: "지금" }]);
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
                onSignup={() => {
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
                filter={homeFilter}
                onFilter={setHomeFilter}
                onOpen={openDeal}
              />
            )}

            {screen === "map" && (
              <MapScreen
                mapSel={mapSel}
                pick={mapPick}
                onPickMarker={setMapSel}
                onList={() => go("home", "home")}
                onOpen={() => openDeal(mapSel)}
              />
            )}

            {screen === "detail" && (
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

            {screen === "chat" && (
              <ChatScreen
                deal={sel}
                extraMsgs={extraMsgs}
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
                onTotal={setCTotal}
                onMembers={setCMembers}
                onBack={() => go(tab)}
                onPost={() => {
                  go("home", "home");
                  showToast("공구가 게시됐어요! 🎉");
                }}
              />
            )}

            {screen === "review" && (
              <ReviewScreen
                deal={sel}
                ratings={ratings}
                onRate={(key, value) => setRatings((prev) => ({ ...prev, [key]: value }))}
                onBack={() => go("mypage", "mypage")}
                onSubmit={() => {
                  go("mypage", "mypage");
                  showToast("후기가 등록됐어요. 고마워요!");
                }}
              />
            )}

            {screen === "mypage" && (
              <MyPageScreen
                nickname={nickname.trim() || "봉천동이웃"}
                notif={notif}
                onToggle={(key) => setNotif((prev) => ({ ...prev, [key]: !prev[key] }))}
                onReviewDemo={() => {
                  setSelectedId("d1");
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

          {showJoin && (
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

function LoginScreen({ onSignup, onPeek }: { onSignup: () => void; onPeek: () => void }) {
  const { height } = useWindowDimensions();
  const isSmall = height < 700;
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

      <View style={{ gap: 11, paddingBottom: isSmall ? 8 : 14 }}>
        {/* 카카오 공식 버튼 */}
        <Pressable style={[styles.authButton, { backgroundColor: t.kakao }]} onPress={onSignup}>
          <KakaoIcon size={22} />
          <Text style={[styles.authButtonText, { color: t.kakaoInk }]}>카카오로 시작하기</Text>
        </Pressable>
        {/* Google 공식 버튼 */}
        <Pressable
          style={[styles.authButton, { backgroundColor: "#fff", borderWidth: 1, borderColor: "#DADCE0" }]}
          onPress={onSignup}
        >
          <GoogleGIcon size={22} />
          <Text style={[styles.authButtonText, { color: "#3C4043" }]}>Google로 시작하기</Text>
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
  filter,
  onFilter,
  onOpen
}: {
  filter: string;
  onFilter: (f: string) => void;
  onOpen: (id: string) => void;
}) {
  const visible = DEALS.filter((d) => filter === "전체" || d.cat === filter);

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
  mapSel,
  pick,
  onPickMarker,
  onList,
  onOpen
}: {
  mapSel: string;
  pick: Deal;
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

      {DEALS.map((d) => {
        const on = d.id === mapSel;
        const pos = MAP_POS[d.id]!;
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
  extraMsgs,
  onBack,
  onSend
}: {
  deal: Deal;
  extraMsgs: ChatMsg[];
  onBack: () => void;
  onSend: (text: string) => void;
}) {
  const [input, setInput] = useState("");
  const messages = [...BASE_MSGS, ...extraMsgs];

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
  onTotal,
  onMembers,
  onBack,
  onPost
}: {
  cat: string;
  onCat: (c: string) => void;
  total: string;
  members: string;
  onTotal: (v: string) => void;
  onMembers: (v: string) => void;
  onBack: () => void;
  onPost: () => void;
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
              placeholder="정문 CU 앞"
              placeholderTextColor={t.dim}
              style={styles.createInput}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>픽업 시간</Text>
            <TextInput
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
  onSubmit: () => void;
}) {
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
      </ScrollView>

      <View style={styles.stickyFooter}>
        <Pressable
          disabled={!done}
          style={[styles.footerButton, { backgroundColor: done ? t.pink : "#EDEAE3" }]}
          onPress={onSubmit}
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
