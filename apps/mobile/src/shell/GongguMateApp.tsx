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
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { useFirebaseAuth } from "../features/auth/useFirebaseAuth";
import { useChatMessages } from "../domains/chat/hooks/useChatMessages";
import { useFirestoreData } from "../features/data/useFirestoreData";
import {
  verifyNeighborhood,
  mapLocationError,
  formatVerifiedLocationBrief,
  type VerifiedLocation
} from "../services/location/verifyNeighborhood";
import { sendMessageDoc } from "../domains/chat/services/chatRepository";
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
} from "../domains/notifications/services/notificationService";
import {
  cancelParticipationDoc,
  joinGongguDoc,
  submitReviewDoc,
} from "../services/firebase/participationRepository";
import type { MainTab, Screen } from "../app/navigationTypes";
import { LoginScreen } from "../domains/auth/components/LoginScreen";
import { CreateScreen } from "../domains/gonggu/components/CreateScreen";
import { DetailScreen as GongguDetailScreen } from "../domains/gonggu/components/DetailScreen";
import { HomeScreen as GongguHomeScreen } from "../domains/gonggu/components/HomeScreen";
import { JoinSheet as GongguJoinSheet } from "../domains/gonggu/components/JoinSheet";
import { TemperatureGradientBar as GradientBar } from "../shared/ui/TemperatureGradientBar";
import { VerifyScreen } from "../domains/location/components/VerifyScreen";
import { ChatListScreen } from "../domains/chat/components/ChatListScreen";
import { ChatScreen } from "../domains/chat/components/ChatScreen";
import { MapScreen } from "../domains/map/components/MapScreen";
import { NotifScreen } from "../domains/notifications/components/NotifScreen";
import { NOTIF_ITEMS, type NotifItem, type NotifKey } from "../domains/notifications/types";
import { ReviewScreen } from "../domains/review/components/ReviewScreen";
import type { ReviewKey } from "../domains/review/types";
import type { ChatMsg } from "../domains/chat/types";
import { chatMsgFromDomain, SEED_MSGS } from "../domains/chat/utils";
import type { Deal } from "../domains/gonggu/types";
import {
  gongguToUi,
  isDealNearLocation,
  tempRatio,
} from "../domains/gonggu/utils";
import type { User } from "../types/domain";
import { EmptyState } from "../shared/ui/EmptyState";
import { t } from "../shared/theme/theme";
import {
  ChatBubbleIcon,
  HomeIcon,
  MapPinIcon,
  PersonIcon,
} from "../shared/ui/icons";
import { styles } from "./appStyles";

/* ------------------------------------------------------------------ */
/* Types & data                                                        */
/* ------------------------------------------------------------------ */

type ConfirmState = {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
};

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

  const feedDeals = useMemo(
    () =>
      deals.filter(
        (d) => d.status !== "canceled" && isDealNearLocation(d, verifiedLocation)
      ),
    [deals, verifiedLocation],
  );

  /* 피드 기준 selectedId / mapSel 보정 */
  useEffect(() => {
    if (feedDeals.length === 0) {
      if (selectedId) setSelectedId("");
      if (mapSel) setMapSel("");
      return;
    }

    const fallbackId = feedDeals[0]!.id;
    if (!selectedId || !feedDeals.some((d) => d.id === selectedId)) {
      setSelectedId(fallbackId);
    }
    if (!mapSel || !feedDeals.some((d) => d.id === mapSel)) {
      setMapSel(fallbackId);
    }
  }, [feedDeals, selectedId, mapSel]);

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
    () => deals.find((d) => d.id === selectedId) ?? feedDeals[0] ?? null,
    [deals, feedDeals, selectedId],
  );
  const mapPick = useMemo(
    () => feedDeals.find((d) => d.id === mapSel) ?? feedDeals[0] ?? null,
    [feedDeals, mapSel],
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
      ...(verifiedLocation
        ? {
            pickupLatitude: verifiedLocation.latitude,
            pickupLongitude: verifiedLocation.longitude,
            pickupNeighborhood: verifiedLocation.neighborhood
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
              <GongguHomeScreen
                deals={feedDeals}
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
                deals={feedDeals}
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
            <GongguJoinSheet
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

/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Verify (nickname → locate → done)                                   */
/* ------------------------------------------------------------------ */

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
