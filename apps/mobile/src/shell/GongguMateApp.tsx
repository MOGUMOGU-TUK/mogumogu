import * as Notifications from "expo-notifications";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BackHandler,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import {
  useFirebaseAuth,
  type UseFirebaseAuth,
} from "../features/auth/useFirebaseAuth";
import { useChatMessages } from "../features/chat/useChatMessages";
import { useFirestoreData } from "../features/data/useFirestoreData";
import {
  verifyNeighborhood,
  mapLocationError,
  formatVerifiedLocationBrief,
  type VerifiedLocation
} from "../services/location/verifyNeighborhood";
import { sendMessageDoc } from "../services/firebase/chatRepository";
import { isFirebaseConfigured } from "../services/firebase/client";
import {
  cancelGongguDoc,
  createGongguDoc,
  hideGongguChatDoc,
  updateGongguDoc,
} from "../services/firebase/gongguRepository";
import {
  initNotifications,
  loadNotifSettings,
  saveNotifSettings,
  type NotifSettings,
} from "../services/firebase/notificationService";
import {
  cancelParticipationDoc,
  joinGongguDoc,
  submitReviewDoc,
} from "../services/firebase/participationRepository";
import { CreateScreen } from "../domains/gonggu/components/CreateScreen";
import { HOME_FILTERS, type Deal } from "../domains/gonggu/types";
import {
  TEMP_STOPS,
  barPct,
  fmt,
  gongguToUi,
  gradientColor,
  memberStr,
  qtyStr,
  remain,
  statusOf,
  tempColor,
  tempRatio,
  tempStr,
  unitPrice,
} from "../domains/gonggu/utils";
import type { ChatMessage, User } from "../types/domain";
import { t } from "../shared/theme/theme";
import { styles } from "./appStyles";

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
  | "mypage"
  | "notifications";

type MainTab = "home" | "map" | "chat" | "mypage";

type ChatMsg = {
  type: "system" | "other" | "me";
  name?: string;
  text: string;
  time?: string;
};

type ConfirmState = {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
};

function mapPos(id: string): { left: string; top: string } {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const left = 18 + Math.round(((h & 0xff) / 255) * 62);
  const top = 14 + Math.round((((h >> 8) & 0xff) / 255) * 64);
  return { left: `${left}%`, top: `${top}%` };
}

function chatMsgFromDomain(m: ChatMessage, myId: string): ChatMsg {
  if (m.messageType === "system") return { type: "system", text: m.text };
  return {
    type: m.senderId === myId ? "me" : "other",
    name: m.senderName,
    text: m.text,
    time: new Date(m.createdAt).toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

const SEED_MSGS: ChatMsg[] = [
  {
    type: "system",
    text: "공구방이 열렸어요. 픽업 장소와 소분 방식을 확인해주세요",
  },
  {
    type: "other",
    name: "공구장",
    text: "안녕하세요! 픽업 시간에 맞춰 준비해둘게요 😊",
    time: "오후 4:02",
  },
];

const REVIEW_QUESTIONS: Array<{ key: ReviewKey; label: string }> = [
  { key: "time", label: "시간 약속을 잘 지켰나요?" },
  { key: "fair", label: "소분이 공정했나요?" },
  { key: "manner", label: "소통이 매너있었나요?" },
  { key: "desc", label: "상품 설명과 일치했나요?" },
];

const NOTIF_ITEMS: Array<{ key: NotifKey; label: string }> = [
  { key: "join", label: "새 참여자 발생" },
  { key: "full", label: "모집 인원 달성" },
  { key: "deadline", label: "모집 마감 임박" },
  { key: "chat", label: "새 채팅 메시지" },
];

type ReviewKey = "time" | "fair" | "manner" | "desc";
type NotifKey = keyof NotifSettings;

type NotifItem = {
  id: string;
  title: string;
  body: string;
  gongguId?: string;
  type?: string;
  receivedAt: string;
  read: boolean;
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Root                                                                */
/* ------------------------------------------------------------------ */

export function GongguMateApp() {
  const insets = useSafeAreaInsets();
  const [screen, setScreen] = useState<Screen>("login");
  const [tab, setTab] = useState<MainTab>("home");
  const [selectedId, setSelectedId] = useState("");
  const [detailFrom, setDetailFrom] = useState<Screen>("home");
  const [mapSel, setMapSel] = useState("");
  const [joined, setJoined] = useState<string[]>([]);
  const [hearts, setHearts] = useState<string[]>([]);
  const [showJoin, setShowJoin] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [toast, setToast] = useState("");

  const [nickname, setNickname] = useState("");
  const [verifyStep, setVerifyStep] = useState(0);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const [verifiedLocation, setVerifiedLocation] = useState<VerifiedLocation | null>(null);
  const verifiedLocationLabel = formatVerifiedLocationBrief(verifiedLocation);

  const [extraMsgs, setExtraMsgs] = useState<ChatMsg[]>([]);
  const [homeFilter, setHomeFilter] = useState("전체");
  const [createCat, setCreateCat] = useState("식품");
  const [cTitle, setCTitle] = useState("");
  const [cTotal, setCTotal] = useState("");
  const [cQty, setCQty] = useState("10");
  const [cPickup, setCPickup] = useState("");
  const [cTime, setCTime] = useState("");
  const [ratings, setRatings] = useState<Record<ReviewKey, number>>({
    time: 0,
    fair: 0,
    manner: 0,
    desc: 0,
  });
  const [notif, setNotif] = useState<Record<NotifKey, boolean>>({
    join: true,
    full: true,
    deadline: true,
    chat: false,
  });
  const [notifItems, setNotifItems] = useState<NotifItem[]>([]);

  /* ── Firebase 훅 ── */
  const auth = useFirebaseAuth();
  const data = useFirestoreData(auth.user?.uid ?? null);

  /* ── 도메인 → UI 어댑터 ── */
  const deals = useMemo(
    () => data.gonggus.map((g) => gongguToUi(g, data.reviews)),
    [data.gonggus, data.reviews],
  );

  /* 첫 딜 로드 시 selectedId / mapSel 초기화 */
  useEffect(() => {
    if (deals.length > 0 && !selectedId) {
      setSelectedId(deals[0]!.id);
      setMapSel(deals[0]!.id);
    }
  }, [deals, selectedId]);

  /* Google 등 소셜 로그인 성공 시 카카오와 동일하게 닉네임·동네 인증으로 이동 */
  useEffect(() => {
    if (skipSocialAutoVerifyRef.current) return;
    if (screen === "login" && auth.user && !auth.user.isAnonymous) {
      if (auth.user.displayName && !nickname.trim()) {
        setNickname(auth.user.displayName.slice(0, 12));
      }
      setVerifyStep(0);
      setLocateError(null);
      setScreen("verify");
    }
  }, [auth.user, screen, nickname]);

  /* 로그인 후 FCM 토큰 등록 + 알림 설정 로드 */
  useEffect(() => {
    const uid = auth.user?.uid;
    if (!uid || auth.user?.isAnonymous) return;
    void initNotifications(uid);
    void loadNotifSettings(uid).then(setNotif);
  }, [auth.user?.uid, auth.user?.isAnonymous]);

  /* 포그라운드 알림 수신 → 알림 목록에 저장 */
  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener(
      (notification) => {
        const { title, body, data } = notification.request.content;
        const payload = data as { gongguId?: string; type?: string };
        setNotifItems((prev) => [
          {
            id: notification.request.identifier,
            title: title ?? "모구모구",
            body: body ?? "",
            gongguId: payload?.gongguId,
            type: payload?.type,
            receivedAt: new Date().toISOString(),
            read: false,
          },
          ...prev,
        ]);
      },
    );
    return () => sub.remove();
  }, []);

  /* 알림 탭 시 해당 화면으로 이동 */
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const { title, body, data } = response.notification.request.content;
        const payload = data as { gongguId?: string; type?: string };
        /* 알림 목록에 추가 (중복 방지) */
        const id = response.notification.request.identifier;
        setNotifItems((prev) => {
          if (prev.some((n) => n.id === id)) return prev;
          return [
            {
              id,
              title: title ?? "모구모구",
              body: body ?? "",
              gongguId: payload?.gongguId,
              type: payload?.type,
              receivedAt: new Date().toISOString(),
              read: true,
            },
            ...prev,
          ];
        });
        if (payload?.gongguId) {
          setSelectedId(payload.gongguId);
          setShowJoin(false);
          if (payload.type === "chat") {
            setTab("chat");
            setScreen("chat");
          } else {
            setTab("home");
            setScreen("detail");
          }
        }
      },
    );
    return () => sub.remove();
  }, []);

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
    () => deals.find((d) => d.id === selectedId) ?? deals[0] ?? null,
    [deals, selectedId],
  );
  const mapPick = useMemo(
    () => deals.find((d) => d.id === mapSel) ?? deals[0] ?? null,
    [deals, mapSel],
  );

  /* 취소(삭제)된 공구는 홈·지도 피드에서 제외 */
  const feedDeals = useMemo(
    () => deals.filter((d) => d.status !== "canceled"),
    [deals],
  );

  /* 내가 주최했거나 참여 중인 채팅방 (방장이 숨긴 방은 제외) */
  const myRooms = useMemo(
    () =>
      deals.filter((d) => {
        const isHost = d.hostId === currentUser.id;
        const isPart = data.participations.some(
          (p) => p.gongguId === d.id && p.userId === currentUser.id,
        );
        return (isHost && !d.hostHidden) || isPart;
      }),
    [deals, data.participations, currentUser.id],
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
      if (screen === "verify") {
        skipSocialAutoVerifyRef.current = true;
        setScreen("login");
        return true;
      }
      if (screen === "detail") {
        go(detailFrom === "notifications" ? "notifications" : tab);
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
      if (screen === "map" || screen === "mypage") {
        go("home", "home");
        return true;
      }
      return false; // login / home → 시스템이 처리 (앱 종료)
    });
    return () => sub.remove();
  }, [screen, tab, showJoin, confirm]);

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

  /* 채팅방 나가기: 방장은 목록에서 숨김, 참여자는 참여 취소 */
  function leaveRoom(deal: Deal) {
    const isHost = deal.hostId === currentUser.id;
    setConfirm({
      title: "채팅방을 나갈까요?",
      message: isHost
        ? "내 채팅 목록에서 이 방이 사라져요."
        : "참여가 취소되고 채팅방에서 나가게 돼요.",
      confirmLabel: "나가기",
      danger: true,
      onConfirm: async () => {
        setConfirm(null);
        if (isFirebaseConfigured()) {
          try {
            if (isHost) {
              await hideGongguChatDoc(deal.id);
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
        showToast("채팅방에서 나갔어요");
      },
    });
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
    }
    if (!isFirebaseConfigured()) {
      setExtraMsgs((prev) => [
        ...prev,
        { type: "me", name: currentUser.nickname, text: trimmed, time: "지금" },
      ]);
    }
  }

  async function handleCreate() {
    const input = {
      title: cTitle.trim() || `${createCat} 공구`,
      category: createCat,
      totalPrice: Number(cTotal) || 0,
      totalQuantity: Number(cQty) || 1,
      pickupPlaceName: cPickup || "장소 미정",
      pickupExpectedTime: cTime || "시간 미정",
      splitMethod: "수량 기준 비례 분담",
      recruitmentDeadline: "미정",
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
    setCTotal("");
    setCQty("10");
    setCPickup("");
    setCTime("");
    go("home", "home");
    showToast("공구가 게시됐어요! 🎉");
  }

  async function handleReview(comment: string) {
    if (!sel) return;
    const gonggu = data.gonggus.find((g) => g.id === sel.id);
    if (gonggu && isFirebaseConfigured()) {
      try {
        const avg = Object.values(ratings).reduce((a, b) => a + b, 0) / 4;
        await submitReviewDoc(
          gonggu,
          currentUser,
          Math.round(avg) || 3,
          comment,
        );
      } catch {
        /* 실패해도 화면 전환은 진행 */
      }
    }
    go("mypage", "mypage");
    showToast("후기가 등록됐어요. 고마워요!");
  }

  const showNav = (
    ["home", "map", "chatList", "chat", "mypage"] as Screen[]
  ).includes(screen);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={t.card}
        translucent={false}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "android" ? 0 : 0}
        style={styles.flex}
      >
        <View style={[styles.root, Platform.OS === "web" && styles.rootWeb]}>
          <View
            style={[styles.body, !showNav && { paddingBottom: insets.bottom }]}
          >
            {screen === "login" && (
              <LoginScreen
                auth={auth}
                onVerify={() => {
                  setVerifyStep(0);
                  setScreen("verify");
                }}
                onFirebaseRequired={() => {
                  showToast("Firebase 설정이 필요해요. apps/mobile/.env를 설정해주세요.");
                }}
                onPeek={() => {
                  if (!isFirebaseConfigured() || auth.user) {
                    go("home", "home");
                    return;
                  }
                  void auth.signIn().finally(() => go("home", "home"));
                }}
                onGoogleLogin={() => {
                  skipSocialAutoVerifyRef.current = false;
                }}
                onPeek={() => go("home", "home")}
              />
            )}

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
                onStart={() => go("home", "home")}
              />
            )}

            {screen === "home" && (
              <HomeScreen
                deals={deals}
                locationLabel={verifiedLocationLabel}
                isLocationVerified={Boolean(verifiedLocation)}
                filter={homeFilter}
                onFilter={setHomeFilter}
                onOpen={openDeal}
                hasUnread={notifItems.some((n) => !n.read)}
                onBell={() => setScreen("notifications")}
              />
            )}

            {screen === "map" && (
              <MapScreen
                deals={deals}
                locationLabel={verifiedLocationLabel}
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
                isHost={sel.hostId === currentUser.id}
                onBack={() =>
                  go(detailFrom === "notifications" ? "notifications" : tab)
                }
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
                  onBack={() => go("chatList", "chat")}
                  onSend={sendMessage}
                  onLeave={() => leaveRoom(sel)}
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
                pickup={cPickup}
                time={cTime}
                onTotal={setCTotal}
                onQty={setCQty}
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
                locationLabel={verifiedLocationLabel}
                notif={notif}
                onToggle={(key) => {
                  setNotif((prev) => {
                    const next = {
                      ...prev,
                      [key]: !prev[key],
                    } as NotifSettings;
                    const uid = auth.user?.uid;
                    if (uid && !auth.user?.isAnonymous) {
                      void saveNotifSettings(uid, next);
                    }
                    return next;
                  });
                }}
                onReviewDemo={() => {
                  if (deals.length > 0) setSelectedId(deals[0]!.id);
                  setRatings({ time: 0, fair: 0, manner: 0, desc: 0 });
                  setScreen("review");
                }}
              />
            )}

            {screen === "notifications" && (
              <NotifScreen
                items={notifItems}
                deals={deals}
                onBack={() => go("home", "home")}
                onOpen={(gongguId, notifId) => {
                  setNotifItems((prev) =>
                    prev.map((n) =>
                      n.id === notifId ? { ...n, read: true } : n,
                    ),
                  );
                  setDetailFrom("notifications");
                  setSelectedId(gongguId);
                  setScreen("detail");
                }}
                onClear={() => setNotifItems([])}
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
            <JoinSheet
              deal={sel}
              onClose={() => setShowJoin(false)}
              onConfirm={confirmJoin}
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

function BasketIcon({
  size = 44,
  color = "#fff",
}: {
  size?: number;
  color?: string;
}) {
  const lw = Math.max(2.5, size * 0.065);
  const bodyTint = color === "#fff" ? t.pink : "#fff";
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
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
        <View
          style={{
            width: "72%",
            height: lw * 0.75,
            backgroundColor: bodyTint,
            opacity: 0.3,
            marginBottom: size * 0.08,
          }}
        />
        <View
          style={{
            width: "72%",
            height: lw * 0.75,
            backgroundColor: bodyTint,
            opacity: 0.3,
          }}
        />
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
          top: 0,
          left: 0,
          right: 0,
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
    <View
      style={{
        width: size,
        height: size,
        borderRadius: r,
        overflow: "hidden",
        marginRight: 10,
      }}
    >
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: r,
          height: r,
          backgroundColor: "#4285F4",
        }}
      />
      <View
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: r,
          height: r,
          backgroundColor: "#EA4335",
        }}
      />
      <View
        style={{
          position: "absolute",
          bottom: 0,
          right: 0,
          width: r,
          height: r,
          backgroundColor: "#FBBC05",
        }}
      />
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: r,
          height: r,
          backgroundColor: "#34A853",
        }}
      />
      {/* White donut cutout */}
      <View
        style={{
          position: "absolute",
          top: r - iR,
          left: r - iR,
          width: iR * 2,
          height: iR * 2,
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

function HomeIcon({
  size = 22,
  color = t.dim,
}: {
  size?: number;
  color?: string;
}) {
  const s = size;
  return (
    <View style={{ width: s, height: s, alignItems: "center" }}>
      {/* 지붕 삼각형 */}
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: s * 0.5,
          borderRightWidth: s * 0.5,
          borderBottomWidth: s * 0.47,
          borderLeftColor: "transparent",
          borderRightColor: "transparent",
          borderBottomColor: color,
        }}
      />
      {/* 벽 */}
      <View
        style={{
          width: s * 0.64,
          height: s * 0.42,
          backgroundColor: color,
          marginTop: -s * 0.03,
          borderBottomLeftRadius: 2,
          borderBottomRightRadius: 2,
        }}
      />
    </View>
  );
}

function MapPinIcon({
  size = 22,
  color = t.dim,
}: {
  size?: number;
  color?: string;
}) {
  const s = size;
  const d = s * 0.58;
  return (
    <View
      style={{
        width: s,
        height: s,
        alignItems: "center",
        paddingTop: s * 0.02,
      }}
    >
      {/* 원형 상단 */}
      <View
        style={{
          width: d,
          height: d,
          borderRadius: d / 2,
          backgroundColor: color,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* 가운데 흰 점 */}
        <View
          style={{
            width: d * 0.36,
            height: d * 0.36,
            borderRadius: d * 0.18,
            backgroundColor: "rgba(255,255,255,0.9)",
          }}
        />
      </View>
      {/* 뾰족한 아래쪽 */}
      <View
        style={{
          width: 0,
          height: 0,
          marginTop: -s * 0.05,
          borderLeftWidth: s * 0.2,
          borderRightWidth: s * 0.2,
          borderTopWidth: s * 0.34,
          borderLeftColor: "transparent",
          borderRightColor: "transparent",
          borderTopColor: color,
        }}
      />
    </View>
  );
}

function ChatBubbleIcon({
  size = 22,
  color = t.dim,
}: {
  size?: number;
  color?: string;
}) {
  const s = size;
  return (
    <View style={{ width: s, height: s }}>
      {/* 말풍선 몸체 */}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: s * 0.76,
          backgroundColor: color,
          borderRadius: s * 0.18,
        }}
      />
      {/* 꼬리 (삼각형) */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: s * 0.14,
          width: 0,
          height: 0,
          borderRightWidth: s * 0.18,
          borderTopWidth: s * 0.28,
          borderRightColor: "transparent",
          borderTopColor: color,
        }}
      />
    </View>
  );
}

function PersonIcon({
  size = 22,
  color = t.dim,
}: {
  size?: number;
  color?: string;
}) {
  const s = size;
  const headD = s * 0.44;
  const bodyW = s * 0.74;
  return (
    <View style={{ width: s, height: s, alignItems: "center" }}>
      {/* 머리 */}
      <View
        style={{
          width: headD,
          height: headD,
          borderRadius: headD / 2,
          backgroundColor: color,
          marginBottom: s * 0.04,
        }}
      />
      {/* 어깨/몸 반원 */}
      <View
        style={{
          width: bodyW,
          height: s * 0.38,
          backgroundColor: color,
          borderTopLeftRadius: bodyW / 2,
          borderTopRightRadius: bodyW / 2,
        }}
      />
    </View>
  );
}

function SearchIcon({
  size = 20,
  color = t.ink,
}: {
  size?: number;
  color?: string;
}) {
  const s = size;
  const bw = Math.max(1.5, s * 0.1);
  // 렌즈를 크게, 세로 중앙 정렬을 위해 살짝 아래 오프셋
  const offset = s * 0.06;
  const lD = s * 0.7;
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
      <View
        style={{
          position: "absolute",
          top: offset,
          left: offset,
          width: lD,
          height: lD,
          borderRadius: lR,
          borderWidth: bw,
          borderColor: color,
        }}
      />
      <View
        style={{
          position: "absolute",
          top: hCy - hLen / 2,
          left: hCx - bw / 2,
          width: bw,
          height: hLen,
          backgroundColor: color,
          borderRadius: bw / 2,
          transform: [{ rotate: "135deg" }],
        }}
      />
    </View>
  );
}

function BellIcon({
  size = 20,
  color = t.ink,
}: {
  size?: number;
  color?: string;
}) {
  const s = size;
  const bw = s * 0.74;
  return (
    <View style={{ width: s, height: s, alignItems: "center" }}>
      {/* 상단 고리 */}
      <View
        style={{
          width: s * 0.1,
          height: s * 0.14,
          backgroundColor: color,
          borderRadius: 2,
        }}
      />
      {/* 벨 몸체 */}
      <View
        style={{
          width: bw,
          height: s * 0.54,
          backgroundColor: color,
          borderTopLeftRadius: bw / 2,
          borderTopRightRadius: bw / 2,
        }}
      />
      {/* 벨 하단 테두리 */}
      <View
        style={{
          width: s * 0.88,
          height: s * 0.13,
          backgroundColor: color,
          borderRadius: 2,
        }}
      />
      {/* 추 */}
      <View
        style={{
          width: s * 0.2,
          height: s * 0.2,
          borderRadius: s * 0.1,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

function SendArrowIcon({
  size = 16,
  color = "#fff",
}: {
  size?: number;
  color?: string;
}) {
  const s = size;
  return (
    <View
      style={{
        width: s,
        height: s,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          width: 0,
          height: 0,
          borderTopWidth: s * 0.5,
          borderBottomWidth: s * 0.5,
          borderLeftWidth: s * 0.88,
          borderTopColor: "transparent",
          borderBottomColor: "transparent",
          borderLeftColor: color,
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
  onFirebaseRequired,
  onGoogleLogin,
  onPeek,
}: {
  auth: UseFirebaseAuth;
  onVerify: () => void;
  onFirebaseRequired: () => void;
  onGoogleLogin: () => void;
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
    if (auth.status === "disabled") {
      onFirebaseRequired();
      return;
    }

    onGoogleLogin();
    void auth.signInGoogle();
    /* 로그인 성공 시 useEffect에서 verify 화면으로 이동 */
  }

  return (
    <View style={styles.loginWrap}>
      <View style={[styles.loginHero, isSmall && { gap: 14 }]}>
        <View
          style={[
            styles.logoCircle,
            isSmall && { width: 72, height: 72, borderRadius: 36 },
          ]}
        >
          <BasketIcon size={isSmall ? 34 : 42} color="#fff" />
        </View>
        <View style={{ alignItems: "center", gap: isSmall ? 4 : 8 }}>
          <Text style={[styles.loginTitle, isSmall && { fontSize: 26 }]}>
            모구모구
          </Text>
          <Text style={styles.loginSubtitle}>
            우리 동네 대학생끼리{"\n"}나눠 사고, 같이 픽업해요
          </Text>
        </View>
      </View>

      {!!auth.error && (
        <View style={{ paddingHorizontal: 4, paddingBottom: 8 }}>
          <Text style={{ fontSize: 12, color: t.rose, textAlign: "center" }}>
            {auth.error}
          </Text>
        </View>
      )}

      <View style={{ gap: 11, paddingBottom: isSmall ? 20 : 26 }}>
        {/* 카카오 공식 버튼 */}
        <Pressable
          style={[
            styles.authButton,
            { backgroundColor: t.kakao, opacity: loading ? 0.6 : 1 },
          ]}
          onPress={handleKakao}
          disabled={loading}
        >
          <KakaoIcon size={22} />
          <Text style={[styles.authButtonText, { color: t.kakaoInk }]}>
            카카오로 시작하기
          </Text>
        </Pressable>
        {/* Google 공식 버튼 */}
        <Pressable
          style={[
            styles.authButton,
            {
              backgroundColor: "#fff",
              borderWidth: 1,
              borderColor: "#DADCE0",
              opacity: loading ? 0.6 : 1,
            },
          ]}
          onPress={handleGoogle}
          disabled={loading}
        >
          <GoogleGIcon size={22} />
          <Text style={[styles.authButtonText, { color: "#3C4043" }]}>
            {loading ? "로그인 중…" : "Google로 시작하기"}
          </Text>
        </Pressable>
        <Pressable
          onPress={onPeek}
          style={{ paddingVertical: 6, alignItems: "center" }}
        >
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
  locateError,
  neighborhood,
  onNick,
  onNext,
  onLocate,
  onStart,
}: {
  step: number;
  nickname: string;
  locating: boolean;
  locateError: string | null;
  neighborhood: string;
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
            style={[
              styles.stepBar,
              { backgroundColor: step >= i ? t.rose : t.border },
            ]}
          />
        ))}
      </View>

      {step === 0 && (
        <>
          <View style={styles.flex}>
            <Text style={styles.verifyTitle}>
              동네에서 쓸{"\n"}닉네임을 정해주세요
            </Text>
            <Text style={styles.verifyDesc}>
              이웃에게 보여지는 이름이에요. 언제든 바꿀 수 있어요.
            </Text>
            <View
              style={[
                styles.nickField,
                { borderBottomColor: nickname.length ? t.rose : t.border },
              ]}
            >
              <TextInput
                value={nickname}
                onChangeText={(v) => onNick(v.slice(0, 12))}
                placeholder="예) 크루아상러버"
                placeholderTextColor={t.dim}
                style={styles.nickInput}
              />
              <Text style={{ fontSize: 13, color: t.dim }}>
                {nickname.length}/12
              </Text>
            </View>
          </View>
          <Pressable
            disabled={!nickReady}
            onPress={onNext}
            style={[
              styles.pillButton,
              { backgroundColor: nickReady ? t.pink : "#EDEAE3" },
            ]}
          >
            <Text
              style={[
                styles.pillButtonText,
                { color: nickReady ? "#fff" : t.dim },
              ]}
            >
              다음
            </Text>
          </Pressable>
        </>
      )}

      {step === 1 && (
        <>
          <View style={styles.verifyCenter}>
            <View style={styles.locateCircle}>
              {locating ? (
                <Text
                  style={{ fontSize: 13, fontWeight: "700", color: t.muted }}
                >
                  위치 확인 중…
                </Text>
              ) : (
                <MapPinIcon size={44} color={t.rose} />
              )}
            </View>
            <Text
              style={[
                styles.verifyTitle,
                { textAlign: "center", marginTop: 18 },
              ]}
            >
              {locating ? "위치 확인 중…" : "동네를 인증해주세요"}
            </Text>
            <Text
              style={[
                styles.verifyDesc,
                { textAlign: "center", maxWidth: 240 },
              ]}
            >
              {locating
                ? "현재 위치를 기반으로 동네를 확인하고 있어요"
                : "GPS로 현재 위치를 확인해 우리 동네 이웃임을 인증해요. 정확한 위치는 공개되지 않아요."}
            </Text>
            {!!locateError && (
              <Text
                style={{
                  fontSize: 12,
                  color: t.rose,
                  textAlign: "center",
                  marginTop: 10,
                }}
              >
                {locateError}
              </Text>
            )}
          </View>
          <Pressable
            disabled={locating}
            onPress={onLocate}
            style={[
              styles.pillButton,
              { backgroundColor: t.pink, opacity: locating ? 0.5 : 1 },
            ]}
          >
            <Text style={[styles.pillButtonText, { color: "#fff" }]}>
              현재 위치로 동네 인증
            </Text>
          </Pressable>
        </>
      )}

      {step === 2 && (
        <>
          <View style={styles.verifyCenter}>
            <View style={styles.doneCircle}>
              <Text style={{ fontSize: 40, color: "#fff" }}>✓</Text>
            </View>
            <Text
              style={[
                styles.verifyTitle,
                { textAlign: "center", marginTop: 20 },
              ]}
            >
              {neighborhood} 인증 완료!
            </Text>
            <Text style={[styles.verifyDesc, { textAlign: "center" }]}>
              이제 {neighborhood} 반경 1km 안의{"\n"}공구를 보고 참여할 수
              있어요
            </Text>
            <Pressable style={styles.eduBadge}>
              <Text style={{ fontSize: 13, color: t.chipInk }}>
                🎓 학교 이메일 인증하고 배지 받기{" "}
                <Text style={{ color: t.dim }}>(나중에)</Text>
              </Text>
            </Pressable>
          </View>
          <Pressable
            onPress={onStart}
            style={[styles.pillButton, { backgroundColor: t.pink }]}
          >
            <Text style={[styles.pillButtonText, { color: "#fff" }]}>
              모구모구 시작하기
            </Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Home                                                                */
/* ------------------------------------------------------------------ */

function EmptyState({
  emoji,
  title,
  desc,
}: {
  emoji: string;
  title: string;
  desc?: string;
}) {
  return (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyEmoji}>{emoji}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      {!!desc && <Text style={styles.emptyDesc}>{desc}</Text>}
    </View>
  );
}

function HomeScreen({
  deals,
  locationLabel,
  isLocationVerified,
  filter,
  onFilter,
  onOpen,
  hasUnread,
  onBell,
}: {
  deals: Deal[];
  locationLabel: string;
  isLocationVerified: boolean;
  filter: string;
  onFilter: (f: string) => void;
  onOpen: (id: string) => void;
  hasUnread: boolean;
  onBell: () => void;
}) {

  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const searching = searchOpen && q.length > 0;
  const visible = deals.filter(
    (d) =>
      (filter === "전체" || d.cat === filter) &&
      (q === "" || d.title.toLowerCase().includes(q))
  );
  const headerLocation = isLocationVerified ? `📍 ${locationLabel}` : locationLabel;

  return (
    <View style={styles.flex}>
      <View style={styles.homeHeader}>
        <Pressable style={styles.locButton}>
          <Text style={styles.locText}>{headerLocation}</Text>
          <Text style={styles.chevron}>⌄</Text>
        </Pressable>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 18 }}>
          <Pressable
            onPress={() =>
              setSearchOpen((open) => {
                if (open) setQuery("");
                return !open;
              })
            }
          >
            <SearchIcon size={20} color={searchOpen ? t.rose : t.ink} />
          </Pressable>
          <View>
            <Pressable onPress={onBell}>
              <BellIcon size={20} color={t.ink} />
            </Pressable>
            {hasUnread && <View style={styles.bellDot} />}
          </View>
        </View>
      </View>

      {searchOpen && (
        <View style={styles.searchBar}>
          <SearchIcon size={16} color={t.dim} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            autoFocus
            placeholder="제목 검색"
            placeholderTextColor={t.dim}
            style={styles.searchInput}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Text style={styles.searchClear}>✕</Text>
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
                  borderColor: active ? t.ink : t.border,
                },
              ]}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: active ? "#fff" : t.chipInk,
                }}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {visible.length === 0 ? (
        searching ? (
          <EmptyState
            emoji="🔍"
            title={`'${query.trim()}' 검색 결과가 없어요`}
            desc={"다른 키워드로 검색해보세요."}
          />
        ) : (
          <EmptyState
            emoji="🧺"
            title={
              filter === "전체"
                ? "진행 중인 공구가 없어요"
                : `'${filter}' 공구가 없어요`
            }
            desc={
              filter === "전체"
                ? "우리 동네에 아직 열린 공구가 없어요.\n첫 공구를 만들어보세요!"
                : "다른 카테고리를 둘러보거나 새 공구를 열어보세요."
            }
          />
        )
      ) : (
        <ScrollView contentContainerStyle={styles.dealList}>
          {visible.map((d) => (
            <DealCard key={d.id} deal={d} onPress={() => onOpen(d.id)} />
          ))}
        </ScrollView>
      )}
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
      <View style={{ flex: 1 }}>
        <View style={styles.rowBetween}>
          <View
            style={[
              styles.deadlinePill,
              { backgroundColor: deal.urgent ? t.urgentBg : t.calmBg },
            ]}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                color: deal.urgent ? t.urgentInk : t.chipInk,
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
        <View style={{ marginTop: 6 }}>
          <View style={[styles.rowBetween, { marginBottom: 5 }]}>
            <Text style={styles.dealPrice}>1개당 {fmt(unitPrice(deal))}</Text>
            <Text style={styles.dealMeta}>
              {qtyStr(deal)} · {remain(deal)}
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
      <View
        style={[
          styles.progressFill,
          { width: `${Math.min(100, Math.max(0, pct))}%` },
        ]}
      />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Map                                                                 */
/* ------------------------------------------------------------------ */

function MapScreen({
  deals,
  locationLabel,
  mapSel,
  pick,
  onPickMarker,
  onList,
  onOpen,
}: {
  deals: Deal[];
  locationLabel: string;
  mapSel: string;
  pick: Deal | null;
  onPickMarker: (id: string) => void;
  onList: () => void;
  onOpen: () => void;
}) {
  return (
    <View style={styles.mapWrap}>
      {/* faux roads / blocks */}
      <View
        style={[
          styles.mapRoad,
          { top: "18%", transform: [{ rotate: "-14deg" }] },
        ]}
      />
      <View
        style={[
          styles.mapRoad,
          { top: "62%", height: 38, transform: [{ rotate: "8deg" }] },
        ]}
      />
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
                backgroundColor: on ? t.pink : "#fff",
              },
            ]}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: "800",
                color: on ? "#fff" : t.ink,
              }}
            >
              {fmt(unitPrice(d))}
            </Text>
          </Pressable>
        );
      })}

      {/* top bar */}
      <View style={styles.mapTopBar}>
        <View style={styles.mapPill}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: t.ink }}>{locationLabel} · 반경 1km</Text>
        </View>
        <Pressable style={styles.mapPill} onPress={onList}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: t.rose }}>
            ☰ 리스트
          </Text>
        </Pressable>
      </View>

      {/* bottom sheet */}
      {pick && (
        <View style={styles.mapSheet}>
          <Pressable style={{ flexDirection: "row", gap: 12 }} onPress={onOpen}>
            <View
              style={[styles.mapSheetThumb, { backgroundColor: pick.tint }]}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "700",
                  color: pick.urgent ? t.urgentInk : t.chipInk,
                }}
              >
                {pick.deadline}
              </Text>
              <Text style={styles.mapSheetTitle} numberOfLines={1}>
                {pick.title}
              </Text>
              <Text style={styles.dealStore}>
                {pick.spot} · {qtyStr(pick)}
              </Text>
              <Text style={[styles.dealPrice, { marginTop: 3 }]}>
                1개당 {fmt(unitPrice(pick))}
              </Text>
            </View>
          </Pressable>
          <Pressable style={styles.mapSheetButton} onPress={onOpen}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>
              자세히 보기
            </Text>
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
  onDelete,
  onCta,
}: {
  deal: Deal;
  hearted: boolean;
  joined: boolean;
  isHost: boolean;
  onBack: () => void;
  onHeart: () => void;
  onDelete: () => void;
  onCta: () => void;
}) {
  return (
    <View style={styles.flex}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 12 }}
        stickyHeaderIndices={[]}
      >
        <View style={[styles.detailHero, { backgroundColor: deal.tint }]}>
          <Pressable style={styles.detailBack} onPress={onBack}>
            <Text style={styles.backArrow}>‹</Text>
          </Pressable>
          {isHost && (
            <Pressable style={styles.detailDelete} onPress={onDelete}>
              <Text style={styles.detailDeleteText}>삭제</Text>
            </Pressable>
          )}
          <Text style={styles.detailHeroLabel}>[ 상품 사진 ]</Text>
        </View>

        <View style={styles.detailSheet}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={[styles.tagPill, { backgroundColor: t.roseSoft }]}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: t.rose }}>
                {deal.cat}
              </Text>
            </View>
            <View
              style={[
                styles.tagPill,
                { backgroundColor: deal.urgent ? t.urgentBg : t.calmBg },
              ]}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: deal.urgent ? t.urgentInk : t.chipInk,
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
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "flex-end",
              }}
            >
              <View>
                <Text style={styles.fieldHint}>1개당 가격</Text>
                <Text style={styles.priceBig}>{fmt(unitPrice(deal))}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.fieldHint}>총 {fmt(deal.total)}</Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "700",
                    color: t.ink,
                    marginTop: 2,
                  }}
                >
                  {qtyStr(deal)} 확보 · {memberStr(deal)}
                </Text>
              </View>
            </View>
            <View style={{ marginTop: 13 }}>
              <ProgressBar pct={barPct(deal)} />
            </View>
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: t.chipInk,
                marginTop: 7,
              }}
            >
              {remain(deal)} 남았어요!
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
            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: t.ink,
                marginBottom: 12,
              }}
            >
              공구장 신뢰도
            </Text>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <View
                style={[styles.leaderAvatar, { backgroundColor: deal.tint }]}
              >
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "800",
                    color: "rgba(0,0,0,0.4)",
                  }}
                >
                  {deal.leader.charAt(0)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: t.ink }}>
                  {deal.leader}
                </Text>
                <Text style={{ fontSize: 12, color: t.muted, marginTop: 1 }}>
                  거래 {deal.deals}회 · 후기 {deal.reviews}개 · 노쇼{" "}
                  {deal.noshow}회
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: "800",
                    color: tempColor(deal.temp),
                  }}
                >
                  {tempStr(deal.temp)}
                </Text>
                <Text style={{ fontSize: 11, color: t.muted }}>매너온도</Text>
              </View>
            </View>
            <View style={{ marginTop: 12 }}>
              <GradientBar
                ratio={tempRatio(deal.temp)}
                knobColor={tempColor(deal.temp)}
              />
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

function InfoRow({
  label,
  value,
  divider,
}: {
  label: string;
  value: string;
  divider?: boolean;
}) {
  return (
    <View style={[styles.infoRow, divider && styles.infoRowDivider]}>
      <Text style={styles.infoRowLabel}>{label}</Text>
      <Text style={styles.infoRowValue}>{value}</Text>
    </View>
  );
}

function GradientBar({
  ratio,
  knobColor,
}: {
  ratio: number;
  knobColor: string;
}) {
  const segments = 40;
  return (
    <View style={styles.gradientWrap}>
      <View style={styles.gradientTrack}>
        {Array.from({ length: segments }).map((_, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              backgroundColor: gradientColor(TEMP_STOPS, i / (segments - 1)),
            }}
          />
        ))}
      </View>
      <View
        style={[
          styles.gradientKnob,
          { left: `${ratio * 100}%`, borderColor: knobColor },
        ]}
      />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Chat                                                                */
/* ------------------------------------------------------------------ */

function ChatListScreen({
  rooms,
  meId,
  onOpen,
  onLeave,
}: {
  rooms: Deal[];
  meId: string;
  onOpen: (id: string) => void;
  onLeave: (deal: Deal) => void;
}) {
  return (
    <View style={styles.flex}>
      <View style={styles.listHeader}>
        <Text style={styles.listHeaderTitle}>채팅</Text>
      </View>
      {rooms.length === 0 ? (
        <EmptyState
          emoji="💬"
          title="참여 중인 채팅이 없어요"
          desc={
            "공구에 참여하면 채팅방이 열려요.\n홈에서 마음에 드는 공구를 찾아보세요!"
          }
        />
      ) : (
        <ScrollView contentContainerStyle={styles.roomList}>
          {rooms.map((room) => {
            const ended = room.status === "canceled";
            const isHost = room.hostId === meId;
            return (
              <View key={room.id} style={styles.roomRow}>
                <Pressable
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }}
                  onPress={() => onOpen(room.id)}
                >
                  <View
                    style={[styles.roomThumb, { backgroundColor: room.tint }]}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.roomTitle} numberOfLines={1}>
                      {room.title}
                    </Text>
                    <Text style={styles.roomMeta} numberOfLines={1}>
                      {isHost ? "내 공구" : "참여 중"} ·{" "}
                      {ended ? "종료됨" : qtyStr(room)}
                    </Text>
                  </View>
                </Pressable>
                <Pressable
                  style={styles.roomLeaveBtn}
                  onPress={() => onLeave(room)}
                >
                  <Text style={styles.roomLeaveText}>나가기</Text>
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

function ChatScreen({
  deal,
  messages,
  onBack,
  onSend,
  onLeave,
}: {
  deal: Deal;
  messages: ChatMsg[];
  onBack: () => void;
  onSend: (text: string) => void;
  onLeave: () => void;
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
        <View
          style={[styles.chatHeaderThumb, { backgroundColor: deal.tint }]}
        />
        <View style={{ flex: 1 }}>
          <Text
            style={{ fontSize: 15, fontWeight: "700", color: t.ink }}
            numberOfLines={1}
          >
            {deal.title}
          </Text>
          <Text style={{ fontSize: 12, color: t.muted }}>
            {memberStr(deal)} · {statusOf(deal)}
          </Text>
        </View>
        <Pressable style={styles.chatLeaveBtn} onPress={onLeave}>
          <Text style={styles.chatLeaveText}>나가기</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.chatBody}
        contentContainerStyle={{ padding: 14, gap: 10 }}
      >
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
                justifyContent: isMe ? "flex-end" : "flex-start",
              }}
            >
              <View style={{ maxWidth: "74%" }}>
                {!isMe && <Text style={styles.msgName}>{m.name}</Text>}
                <View
                  style={{
                    flexDirection: isMe ? "row" : "row-reverse",
                    alignItems: "flex-end",
                    gap: 6,
                  }}
                >
                  <View
                    style={[
                      styles.bubble,
                      isMe ? styles.bubbleMe : styles.bubbleOther,
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        lineHeight: 20,
                        color: isMe ? "#fff" : t.ink,
                      }}
                    >
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
          <SendArrowIcon size={16} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

/* Review                                                              */
/* ------------------------------------------------------------------ */

function ReviewScreen({
  deal,
  ratings,
  onRate,
  onBack,
  onSubmit,
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
        <View
          style={{
            alignItems: "center",
            paddingVertical: 14,
            paddingBottom: 20,
          }}
        >
          <View style={[styles.reviewAvatar, { backgroundColor: deal.tint }]}>
            <Text
              style={{
                fontSize: 22,
                fontWeight: "800",
                color: "rgba(0,0,0,0.4)",
              }}
            >
              {deal.leader.charAt(0)}
            </Text>
          </View>
          <Text style={styles.reviewHeadline}>
            {deal.leader}님과의 거래는{"\n"}어떠셨나요?
          </Text>
          <Text style={{ fontSize: 13, color: t.muted, marginTop: 6 }}>
            {deal.title}
          </Text>
        </View>

        <View style={{ gap: 18 }}>
          {REVIEW_QUESTIONS.map((q) => (
            <View key={q.key}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "700",
                  color: t.ink,
                  marginBottom: 10,
                }}
              >
                {q.label}
              </Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {[1, 2, 3, 4, 5].map((v) => (
                  <Pressable
                    key={v}
                    onPress={() => onRate(q.key, v)}
                    style={{ padding: 2 }}
                  >
                    <Text
                      style={{
                        fontSize: 32,
                        color: v <= ratings[q.key] ? t.rose : t.trackOff,
                      }}
                    >
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
          style={[
            styles.footerButton,
            { backgroundColor: done ? t.pink : "#EDEAE3" },
          ]}
          onPress={() => void onSubmit(comment)}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: done ? "#fff" : t.dim,
            }}
          >
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
  locationLabel,
  notif,
  onToggle,
  onReviewDemo,
}: {
  nickname: string;
  locationLabel: string;
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
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                flexWrap: "wrap",
              }}
            >
              <Text style={{ fontSize: 17, fontWeight: "800", color: t.ink }}>
                {nickname}
              </Text>
              <View style={styles.eduChip}>
                <Text
                  style={{ fontSize: 10, fontWeight: "700", color: t.greenInk }}
                >
                  🎓 학교인증
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 13, color: t.muted, marginTop: 2 }}>{locationLabel}</Text>
          </View>
          <Pressable style={styles.editButton}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: t.chipInk }}>
              편집
            </Text>
          </Pressable>
        </View>

        <View style={{ marginTop: 18 }}>
          <View style={[styles.rowBetween, { marginBottom: 7 }]}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: t.ink }}>
              매너온도
            </Text>
            <Text style={{ fontSize: 18, fontWeight: "800", color: t.rose }}>
              37.4°C
            </Text>
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
              i < NOTIF_ITEMS.length - 1 && {
                borderBottomWidth: 1,
                borderBottomColor: t.line,
              },
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

function StatCard({
  value,
  label,
  valueColor,
}: {
  value: string;
  label: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.statCard}>
      <Text
        style={{ fontSize: 20, fontWeight: "800", color: valueColor ?? t.ink }}
      >
        {value}
      </Text>
      <Text style={{ fontSize: 12, color: t.muted, marginTop: 2 }}>
        {label}
      </Text>
    </View>
  );
}

function ReviewTag({
  emoji,
  text,
  count,
}: {
  emoji: string;
  text: string;
  count: number;
}) {
  return (
    <View style={styles.reviewTag}>
      <Text style={{ fontSize: 13, color: t.inkSoft }}>
        {emoji} {text}{" "}
        <Text style={{ color: t.rose, fontWeight: "700" }}>{count}</Text>
      </Text>
    </View>
  );
}

function Toggle({ on, onPress }: { on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.toggleTrack,
        { backgroundColor: on ? t.rose : t.trackOff },
      ]}
    >
      <View style={[styles.toggleKnob, { left: on ? 22 : 3 }]} />
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* Notifications screen                                                */
/* ------------------------------------------------------------------ */

const TYPE_LABEL: Record<string, string> = {
  join: "새 참여자",
  full: "모집 완료",
  deadline: "마감 임박",
  chat: "채팅 메시지",
};

function relativeTime(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "방금";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

function NotifScreen({
  items,
  deals,
  onBack,
  onOpen,
  onClear,
}: {
  items: NotifItem[];
  deals: Deal[];
  onBack: () => void;
  onOpen: (gongguId: string, notifId: string) => void;
  onClear: () => void;
}) {
  return (
    <View style={styles.flex}>
      <View style={styles.homeHeader}>
        <Pressable onPress={onBack} style={{ padding: 4, marginLeft: -4 }}>
          <Text style={{ fontSize: 20, color: t.ink, fontWeight: "300" }}>
            ‹
          </Text>
        </Pressable>
        <Text
          style={{
            fontSize: 17,
            fontWeight: "800",
            color: t.ink,
            flex: 1,
            textAlign: "center",
          }}
        >
          알림
        </Text>
        {items.length > 0 ? (
          <Pressable onPress={onClear}>
            <Text style={{ fontSize: 13, color: t.muted }}>모두 지우기</Text>
          </Pressable>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      {items.length === 0 ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
          }}
        >
          <BellIcon size={40} color={t.dim} />
          <Text style={{ fontSize: 15, fontWeight: "700", color: t.dim }}>
            알림이 없어요
          </Text>
          <Text style={{ fontSize: 13, color: t.muted }}>
            공구 참여·채팅 알림이 여기에 표시돼요
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: 32,
            gap: 8,
          }}
        >
          {items.map((item) => {
            const deal = item.gongguId
              ? deals.find((d) => d.id === item.gongguId)
              : null;
            const typeLabel = item.type ? (TYPE_LABEL[item.type] ?? "") : "";
            return (
              <Pressable
                key={item.id}
                onPress={() => item.gongguId && onOpen(item.gongguId, item.id)}
                style={[
                  styles.notifItemCard,
                  !item.read && { borderWidth: 2, borderColor: t.pink },
                ]}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: 12,
                  }}
                >
                  <View style={styles.notifIconWrap}>
                    <BellIcon size={16} color={t.rose} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        marginBottom: 2,
                      }}
                    >
                      {!!typeLabel && (
                        <View style={styles.notifTypeBadge}>
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: "700",
                              color: t.rose,
                            }}
                          >
                            {typeLabel}
                          </Text>
                        </View>
                      )}
                      <Text style={{ fontSize: 11, color: t.muted }}>
                        {relativeTime(item.receivedAt)}
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "700",
                        color: t.ink,
                        marginBottom: 2,
                      }}
                    >
                      {item.title}
                    </Text>
                    {!!item.body && (
                      <Text
                        style={{
                          fontSize: 13,
                          color: t.inkSoft,
                          lineHeight: 18,
                        }}
                        numberOfLines={2}
                      >
                        {item.body}
                      </Text>
                    )}
                    {deal && (
                      <Text
                        style={{ fontSize: 12, color: t.muted, marginTop: 4 }}
                      >
                        {deal.title} · {deal.spot}
                      </Text>
                    )}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
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
  onMy,
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
      <NavItem
        iconNode={
          <HomeIcon size={22} color={active === "home" ? t.rose : t.dim} />
        }
        label="홈"
        active={active === "home"}
        onPress={onHome}
      />
      <NavItem
        iconNode={
          <MapPinIcon size={22} color={active === "map" ? t.rose : t.dim} />
        }
        label="지도"
        active={active === "map"}
        onPress={onMap}
      />
      <Pressable style={styles.navCenter} onPress={onCreate}>
        <View style={styles.fab}>
          <Text
            style={{
              fontSize: 28,
              color: "#fff",
              fontWeight: "300",
              lineHeight: 30,
            }}
          >
            +
          </Text>
        </View>
      </Pressable>
      <NavItem
        iconNode={
          <ChatBubbleIcon
            size={22}
            color={active === "chat" ? t.rose : t.dim}
          />
        }
        label="채팅"
        active={active === "chat"}
        onPress={onChat}
      />
      <NavItem
        iconNode={
          <PersonIcon size={22} color={active === "mypage" ? t.rose : t.dim} />
        }
        label="마이"
        active={active === "mypage"}
        onPress={onMy}
      />
    </View>
  );
}

function NavItem({
  iconNode,
  label,
  active,
  onPress,
}: {
  iconNode: React.ReactNode;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.navItem} onPress={onPress}>
      {iconNode}
      <Text
        style={{
          fontSize: 10,
          fontWeight: "600",
          color: active ? t.rose : t.dim,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* Join bottom sheet                                                   */
/* ------------------------------------------------------------------ */

function ConfirmSheet({
  title,
  message,
  confirmLabel,
  danger,
  onConfirm,
  onClose,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Pressable style={styles.sheetBackdrop} onPress={onClose}>
      <Pressable style={styles.sheet} onPress={() => {}}>
        <View style={styles.sheetGrabber} />
        <Text style={{ fontSize: 19, fontWeight: "800", color: t.ink }}>
          {title}
        </Text>
        <Text
          style={{ fontSize: 14, color: t.muted, marginTop: 8, lineHeight: 20 }}
        >
          {message}
        </Text>
        <View style={{ flexDirection: "row", gap: 10, marginTop: 20 }}>
          <Pressable
            style={[styles.pillButton, styles.confirmCancel]}
            onPress={onClose}
          >
            <Text style={[styles.pillButtonText, { color: t.ink }]}>취소</Text>
          </Pressable>
          <Pressable
            style={[
              styles.pillButton,
              { flex: 1, backgroundColor: danger ? t.rose : t.pink },
            ]}
            onPress={onConfirm}
          >
            <Text style={[styles.pillButtonText, { color: "#fff" }]}>
              {confirmLabel}
            </Text>
          </Pressable>
        </View>
      </Pressable>
    </Pressable>
  );
}

function JoinSheet({
  deal,
  onClose,
  onConfirm,
}: {
  deal: Deal;
  onClose: () => void;
  onConfirm: (quantity: number) => void;
}) {
  const remaining = Math.max(0, deal.max - deal.cur);
  const [qty, setQty] = useState(remaining > 0 ? 1 : 0);
  const price = unitPrice(deal);
  const canJoin = remaining > 0 && qty > 0;

  return (
    <Pressable style={styles.sheetBackdrop} onPress={onClose}>
      <Pressable style={styles.sheet} onPress={() => {}}>
        <View style={styles.sheetGrabber} />
        <Text style={{ fontSize: 19, fontWeight: "800", color: t.ink }}>
          이 공구에 참여할까요?
        </Text>
        <Text style={{ fontSize: 13, color: t.muted, marginTop: 4 }}>
          {deal.title}
        </Text>

        <View style={styles.sheetSummary}>
          <View style={styles.rowBetween}>
            <Text style={{ fontSize: 14, color: t.chipInk }}>
              총 가격 · 총 수량
            </Text>
            <Text style={{ fontSize: 14, fontWeight: "600", color: t.ink }}>
              {fmt(deal.total)} · {deal.max}개
            </Text>
          </View>
          <View style={styles.rowBetween}>
            <Text style={{ fontSize: 14, color: t.chipInk }}>1개당 가격</Text>
            <Text style={{ fontSize: 14, fontWeight: "600", color: t.ink }}>
              {fmt(price)}
            </Text>
          </View>

          <View style={styles.sheetDivider} />

          <View style={[styles.rowBetween, { alignItems: "center" }]}>
            <View>
              <Text style={{ fontSize: 15, fontWeight: "700", color: t.ink }}>
                참여 수량
              </Text>
              <Text style={{ fontSize: 12, color: t.muted, marginTop: 2 }}>
                남은 수량 {remaining}개
              </Text>
            </View>
            <View style={styles.stepper}>
              <Pressable
                style={styles.stepperBtn}
                onPress={() => setQty((q) => Math.max(1, q - 1))}
                disabled={!canJoin || qty <= 1}
              >
                <Text style={styles.stepperSign}>−</Text>
              </Pressable>
              <Text style={styles.stepperValue}>{qty}</Text>
              <Pressable
                style={styles.stepperBtn}
                onPress={() => setQty((q) => Math.min(remaining, q + 1))}
                disabled={!canJoin || qty >= remaining}
              >
                <Text style={styles.stepperSign}>+</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.sheetDivider} />

          <View style={[styles.rowBetween, { alignItems: "center" }]}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: t.ink }}>
              내 부담금
            </Text>
            <Text style={{ fontSize: 22, fontWeight: "800", color: t.rose }}>
              {fmt(price * qty)}
            </Text>
          </View>
        </View>

        <View style={styles.sheetNote}>
          <Text style={{ fontSize: 12, color: t.roseInk, lineHeight: 18 }}>
            📍 {deal.spot}에서 {deal.pickup}에 픽업해요. 참여 확정 시 채팅방에
            자동 입장됩니다.
          </Text>
        </View>

        <Pressable
          style={[
            styles.pillButton,
            { backgroundColor: canJoin ? t.pink : t.trackOff, marginTop: 16 },
          ]}
          onPress={() => canJoin && onConfirm(qty)}
          disabled={!canJoin}
        >
          <Text style={[styles.pillButtonText, { color: "#fff" }]}>
            {canJoin ? `${qty}개 참여 확정하기` : "모집이 완료됐어요"}
          </Text>
        </Pressable>
      </Pressable>
    </Pressable>
  );
}
