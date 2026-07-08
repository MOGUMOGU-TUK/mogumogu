import { useEffect, useMemo, useRef, useState } from "react";
import {
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
import { isFirebaseConfigured } from "../services/firebase/client";
import {
  cancelGongguDoc,
  createGongguDoc,
  hideGongguChatDoc,
} from "../domains/gonggu/services/gongguRepository";
import {
  clearNotifsDoc,
  initNotifications,
  loadNotifSettings,
  markNotifReadDoc,
  saveNotifSettings,
  subscribeNotifs,
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
import { DetailScreen as GongguDetailScreen } from "../domains/gonggu/components/DetailScreen";
import { HomeScreen as GongguHomeScreen } from "../domains/gonggu/components/HomeScreen";
import { JoinSheet as GongguJoinSheet } from "../domains/gonggu/components/JoinSheet";
import { VerifyScreen } from "../domains/location/components/VerifyScreen";
import { ChatListScreen } from "../domains/chat/components/ChatListScreen";
import { ChatScreen } from "../domains/chat/components/ChatScreen";
import { MapScreen } from "../domains/map/components/MapScreen";
import { MyPageScreen } from "../domains/mypage/components/MyPageScreen";
import { NotifScreen } from "../domains/notifications/components/NotifScreen";
import type { NotifItem, NotifKey } from "../domains/notifications/types";
import { ReviewScreen } from "../domains/review/components/ReviewScreen";
import type { ReviewKey } from "../domains/review/types";
import type { ChatMsg } from "../domains/chat/types";
import { chatMsgFromDomain, SEED_MSGS } from "../domains/chat/utils";
import type { Deal } from "../domains/gonggu/types";
import { gongguToUi } from "../domains/gonggu/utils";
import { isWithinRadiusKm } from "../domains/location/services/geo";
import type { User } from "../types/domain";
import { ConfirmSheet, type ConfirmState } from "../shared/ui/ConfirmSheet";
import { EmptyState } from "../shared/ui/EmptyState";
import { t } from "../shared/theme/theme";
import { styles } from "../shared/ui/appStyles";

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
    () => deals.filter((d) => d.status !== "canceled"),
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

  /* 인앱 알림 — Firestore 실시간 구독 */
  useEffect(() => {
    const uid = auth.user?.uid;
    if (!uid || auth.user?.isAnonymous) return;
    return subscribeNotifs(uid, setNotifItems);
  }, [auth.user?.uid, auth.user?.isAnonymous]);

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
    () => mapDeals.find((d) => d.id === mapSel) ?? mapDeals[0] ?? null,
    [mapDeals, mapSel],
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
    if (!verifiedLocation) {
      showToast("동네 인증 후 공구를 만들 수 있어요.");
      return;
    }

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
                onFirebaseRequired={() => {
                  showToast("Firebase 설정이 필요해요. apps/mobile/.env를 설정해주세요.");
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
