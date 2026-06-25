import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import { colors, spacing } from "../shared/theme/colors";
import { formatDistance, formatWon, statusLabel } from "../shared/ui/format";
import {
  cancelParticipation,
  confirmPickup,
  createGonggu,
  findParticipation,
  getCurrentUser,
  getPricePerPerson,
  joinGonggu,
  sendMessage,
  submitReview
} from "../services/mock/mockRepository";
import { getFirebaseServices, isFirebaseConfigured } from "../services/firebase/client";
import { createGongguDoc } from "../services/firebase/gongguRepository";
import { useFirebaseAuth, type AuthStatus } from "../features/auth/useFirebaseAuth";
import { useGonggus, type GongguSource } from "../features/gonggu/useGonggus";
import { seedSnapshot } from "../services/mock/seed";
import type { AppSnapshot, Gonggu, Settlement } from "../types/domain";

type Screen = "login" | "location" | "home" | "create" | "detail" | "chat" | "settlement" | "review" | "profile";
type HomeTab = "list" | "map";

export function GongguMateApp() {
  const [snapshot, setSnapshot] = useState<AppSnapshot>(seedSnapshot);
  const [screen, setScreen] = useState<Screen>("login");
  const [homeTab, setHomeTab] = useState<HomeTab>("list");
  const [selectedGongguId, setSelectedGongguId] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const currentUser = useMemo(() => getCurrentUser(snapshot), [snapshot]);
  const firebaseConfigured = isFirebaseConfigured();
  const auth = useFirebaseAuth();
  const live = useGonggus();
  const selectedGonggu = snapshot.gonggus.find((gonggu) => gonggu.id === selectedGongguId) ?? null;

  // 1단계: 로그인 화면 진입 시 자동으로 익명 인증을 시도한다.
  // (콘솔에서 익명 로그인을 끈 상태면 status "error" 로 떨어지고, 버튼으로 재시도 가능)
  useEffect(() => {
    if (auth.status === "signed_out") {
      void auth.signIn();
    }
  }, [auth.status]);

  // 2단계: Firestore 공구 리스트를 snapshot.gonggus 에 동기화한다.
  // (참여/정산/후기 등 로컬 상태는 별도 필드라 덮어쓰이지 않는다)
  useEffect(() => {
    setSnapshot((prev) => (prev.gonggus === live.gonggus ? prev : { ...prev, gonggus: live.gonggus }));
  }, [live.gonggus]);

  function openGonggu(gongguId: string) {
    setSelectedGongguId(gongguId);
    setScreen("detail");
  }

  function login() {
    // 익명 인증이 아직 안 됐으면(미설정/이전 실패) 다시 시도. 실패해도 POC 흐름은 계속 진행.
    if (auth.status === "error" || auth.status === "signed_out") {
      void auth.signIn();
    }
    setIsLoggedIn(true);
    setScreen(currentUser.locationVerified ? "home" : "location");
  }

  // 공구 생성: Firebase 설정 시 Firestore 에 생성(구독이 리스트에 반영), 아니면 로컬 mock.
  // rules: gonggus create 는 로그인 사용자 허용.
  async function handleCreateGonggu(input: {
    title: string;
    totalPrice: number;
    targetParticipants: number;
    pickupPlaceName: string;
    pickupExpectedTime: string;
  }) {
    if (firebaseConfigured) {
      try {
        await createGongguDoc(input, currentUser);
      } catch {
        Alert.alert("공구 생성 실패", "잠시 후 다시 시도해주세요.");
      }
      return;
    }
    setSnapshot((prev) => createGonggu(prev, input));
  }

  function verifyLocation() {
    setSnapshot((prev) => ({
      ...prev,
      users: prev.users.map((user) =>
        user.id === currentUser.id ? { ...user, locationVerified: true, neighborhood: "신촌동" } : user
      )
    }));
    setScreen("home");
  }

  function goBack() {
    if (screen === "detail" || screen === "create" || screen === "profile") {
      setScreen("home");
      return;
    }

    if (screen === "chat" || screen === "settlement" || screen === "review") {
      setScreen("detail");
      return;
    }

    setScreen("home");
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardAvoiding}
      >
        {screen === "login" ? (
          <LoginScreen
            firebaseConfigured={firebaseConfigured}
            authStatus={auth.status}
            uid={auth.uid}
            authError={auth.error}
            onLogin={login}
          />
        ) : screen === "location" ? (
          <LocationScreen userName={currentUser.nickname} onVerify={verifyLocation} />
        ) : (
          <View style={styles.shell}>
            <AppHeader
              screen={screen}
              userName={currentUser.nickname}
              onBack={goBack}
              onProfile={() => setScreen("profile")}
            />
            {screen === "home" && (
              <HomeScreen
                snapshot={snapshot}
                source={live.source}
                homeTab={homeTab}
                onChangeTab={setHomeTab}
                onOpenGonggu={openGonggu}
                onCreate={() => setScreen("create")}
              />
            )}
            {screen === "create" && (
              <CreateGongguScreen
                onCreate={(input) => {
                  void handleCreateGonggu(input);
                  setScreen("home");
                }}
              />
            )}
            {screen === "profile" && <ProfileScreen snapshot={snapshot} />}
            {selectedGonggu && screen === "detail" && (
              <DetailScreen
                snapshot={snapshot}
                gonggu={selectedGonggu}
                currentUserId={currentUser.id}
                onJoin={() => setSnapshot((prev) => joinGonggu(prev, selectedGonggu.id, currentUser.id))}
                onCancel={() => setSnapshot((prev) => cancelParticipation(prev, selectedGonggu.id, currentUser.id))}
                onChat={() => setScreen("chat")}
                onSettlement={() => setScreen("settlement")}
                onReview={() => setScreen("review")}
                onConfirmPickup={() => setSnapshot((prev) => confirmPickup(prev, selectedGonggu.id, currentUser.id))}
              />
            )}
            {selectedGonggu && screen === "chat" && (
              <ChatScreen
                snapshot={snapshot}
                gonggu={selectedGonggu}
                currentUserId={currentUser.id}
                onSend={(text) => setSnapshot((prev) => sendMessage(prev, selectedGonggu.id, currentUser, text))}
              />
            )}
            {selectedGonggu && screen === "settlement" && (
              <SettlementScreen snapshot={snapshot} gonggu={selectedGonggu} />
            )}
            {selectedGonggu && screen === "review" && (
              <ReviewScreen
                gonggu={selectedGonggu}
                onSubmit={(rating, comment) => {
                  setSnapshot((prev) => submitReview(prev, selectedGonggu.id, currentUser.id, rating, comment));
                  Alert.alert("후기 완료", "정산 상태가 지급 가능으로 변경되었습니다.");
                  setScreen("settlement");
                }}
              />
            )}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function LoginScreen({
  firebaseConfigured,
  authStatus,
  uid,
  authError,
  onLogin
}: {
  firebaseConfigured: boolean;
  authStatus: AuthStatus;
  uid: string | null;
  authError: string | null;
  onLogin: () => void;
}) {
  const projectId = getFirebaseServices()?.app.options.projectId ?? "미설정";
  const connected = authStatus === "signed_in";

  return (
    <View style={styles.login}>
      <View style={styles.logoMark}>
        <Text style={styles.logoText}>m</Text>
      </View>
      <Text style={styles.heroTitle}>mogumogu</Text>
      <Text style={styles.heroCopy}>
        근처 이웃과 대용량 상품을 나누고, 모집부터 픽업 후기까지 한 번에 관리하세요.
      </Text>
      <View style={styles.loginPanel}>
        <View style={styles.rowBetween}>
          <Text style={styles.panelTitle}>로그인</Text>
          <Text style={connected ? styles.connectedBadge : styles.offlineBadge}>
            {connected
              ? `Firebase ${projectId} · 연결됨`
              : firebaseConfigured
                ? `Firebase ${projectId}`
                : "Firebase 미설정"}
          </Text>
        </View>
        <Text style={styles.bodyText}>{loginStatusText(authStatus, uid, authError)}</Text>
        <PrimaryButton
          label={authStatus === "loading" ? "익명 연결 중…" : "민준으로 시작하기"}
          onPress={onLogin}
        />
        <SecondaryButton label="Google 로그인 자리" onPress={onLogin} />
      </View>
    </View>
  );
}

function loginStatusText(status: AuthStatus, uid: string | null, error: string | null): string {
  switch (status) {
    case "signed_in":
      return `익명 인증 완료 · UID ${uid?.slice(0, 8) ?? ""}… (Firestore 연동 준비됨)`;
    case "loading":
      return "Firebase 익명 인증을 진행하고 있습니다…";
    case "error":
      return error ?? "익명 로그인에 실패했습니다.";
    case "disabled":
      return "현재 mock 계정으로 화면 흐름을 유지합니다. (.env 설정 시 Firebase 익명 인증이 켜집니다)";
    case "signed_out":
    default:
      return "Firebase 익명 인증을 준비하고 있습니다.";
  }
}

function LocationScreen({ userName, onVerify }: { userName: string; onVerify: () => void }) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>동네 인증</Text>
      <Text style={styles.title}>{userName}님, 주변 공구를 찾기 전에 동네를 확인할게요.</Text>
      <InfoBox
        title="POC 위치 인증"
        body="실서비스에서는 expo-location으로 GPS 좌표를 가져오고, Firestore에는 geohash와 대략화된 좌표만 저장합니다."
      />
      <View style={styles.mapMock}>
        <Text style={styles.mapPin}>⌖</Text>
        <Text style={styles.mapTitle}>신촌동 반경 1km</Text>
        <Text style={styles.bodyText}>정확한 집 위치는 공개하지 않습니다.</Text>
      </View>
      <PrimaryButton label="현재 위치로 인증하기" onPress={onVerify} />
    </ScrollView>
  );
}

function AppHeader({
  screen,
  userName,
  onBack,
  onProfile
}: {
  screen: Screen;
  userName: string;
  onBack: () => void;
  onProfile: () => void;
}) {
  const isHome = screen === "home";

  return (
    <View style={styles.header}>
      <View style={styles.headerSide}>
        {!isHome && (
          <Pressable accessibilityRole="button" onPress={onBack} style={styles.iconButton}>
            <Text style={styles.iconButtonText}>‹</Text>
          </Pressable>
        )}
      </View>
      <View style={styles.headerCenter}>
        <Text style={styles.headerTitle}>{isHome ? "mogumogu" : headerTitle(screen)}</Text>
        {isHome && <Text style={styles.headerSubtitle}>신촌동 · 반경 1km</Text>}
      </View>
      <View style={styles.headerSideRight}>
        <Pressable accessibilityRole="button" onPress={onProfile} style={styles.profilePill}>
          <Text style={styles.profileInitial}>{userName.slice(0, 1)}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function headerTitle(screen: Screen) {
  const titles: Record<Screen, string> = {
    login: "로그인",
    location: "동네 인증",
    home: "mogumogu",
    create: "공구 작성",
    detail: "공구 상세",
    chat: "채팅",
    settlement: "정산 상태",
    review: "후기 작성",
    profile: "내 프로필"
  };

  return titles[screen];
}

function gongguSourceLabel(source: GongguSource, count: number): string {
  switch (source) {
    case "firestore":
      return `Firestore 실시간 · ${count}개`;
    case "loading":
      return "Firestore 불러오는 중…";
    case "seed":
    default:
      return "샘플 데이터 (Firestore 비어있음/미설정)";
  }
}

function HomeScreen({
  snapshot,
  source,
  homeTab,
  onChangeTab,
  onOpenGonggu,
  onCreate
}: {
  snapshot: AppSnapshot;
  source: GongguSource;
  homeTab: HomeTab;
  onChangeTab: (tab: HomeTab) => void;
  onOpenGonggu: (gongguId: string) => void;
  onCreate: () => void;
}) {
  return (
    <View style={styles.flex}>
      <View style={styles.toolbar}>
        <SegmentedControl
          value={homeTab}
          options={[
            { label: "리스트", value: "list" },
            { label: "지도", value: "map" }
          ]}
          onChange={onChangeTab}
        />
        <PrimaryButton compact label="공구 만들기" onPress={onCreate} />
      </View>
      {homeTab === "list" ? (
        <ScrollView contentContainerStyle={styles.listContent}>
          <Text style={styles.caption}>{gongguSourceLabel(source, snapshot.gonggus.length)}</Text>
          <InfoBox
            title="오늘의 POC 흐름"
            body="아래 공구에 참여한 뒤 채팅, 픽업 완료, 후기 작성, 정산 지급가능 상태를 확인해보세요."
          />
          {snapshot.gonggus.map((gonggu) => (
            <GongguCard key={gonggu.id} gonggu={gonggu} onPress={() => onOpenGonggu(gonggu.id)} />
          ))}
        </ScrollView>
      ) : (
        <MapPlaceholder gonggus={snapshot.gonggus} onOpenGonggu={onOpenGonggu} />
      )}
    </View>
  );
}

function GongguCard({ gonggu, onPress }: { gonggu: Gonggu; onPress: () => void }) {
  const progress = gonggu.currentParticipants / gonggu.targetParticipants;

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.card}>
      <Image source={{ uri: gonggu.imageUrl }} style={styles.cardImage} />
      <View style={styles.cardBody}>
        <View style={styles.rowBetween}>
          <Text style={styles.badge}>{gonggu.category}</Text>
          <Text style={styles.statusBadge}>{statusLabel(gonggu.status)}</Text>
        </View>
        <Text style={styles.cardTitle}>{gonggu.title}</Text>
        <Text style={styles.bodyText} numberOfLines={2}>
          {gonggu.description}
        </Text>
        <View style={styles.metaGrid}>
          <Meta label="1/N" value={formatWon(getPricePerPerson(gonggu))} />
          <Meta label="픽업" value={gonggu.pickupExpectedTime} />
          <Meta label="거리" value={formatDistance(gonggu.pickupDistanceMeters)} />
          <Meta label="신뢰" value={`${gonggu.hostTrustScore.toFixed(1)}도`} />
        </View>
        <ProgressBar progress={progress} />
        <Text style={styles.caption}>
          {gonggu.currentParticipants}/{gonggu.targetParticipants}명 모집 · {gonggu.pickupPlaceName}
        </Text>
      </View>
    </Pressable>
  );
}

function DetailScreen({
  snapshot,
  gonggu,
  currentUserId,
  onJoin,
  onCancel,
  onChat,
  onSettlement,
  onReview,
  onConfirmPickup
}: {
  snapshot: AppSnapshot;
  gonggu: Gonggu;
  currentUserId: string;
  onJoin: () => void;
  onCancel: () => void;
  onChat: () => void;
  onSettlement: () => void;
  onReview: () => void;
  onConfirmPickup: () => void;
}) {
  const participation = findParticipation(snapshot, gonggu.id, currentUserId);
  const settlement = snapshot.settlements.find((item) => item.id === gonggu.settlementId);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Image source={{ uri: gonggu.imageUrl }} style={styles.heroImage} />
      <View style={styles.rowBetween}>
        <Text style={styles.badge}>{gonggu.receiptVerified ? "영수증 인증" : "사진 인증 대기"}</Text>
        <Text style={styles.statusBadge}>{statusLabel(gonggu.status)}</Text>
      </View>
      <Text style={styles.title}>{gonggu.title}</Text>
      <Text style={styles.bodyText}>{gonggu.description}</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>핵심 정보</Text>
        <View style={styles.metaGrid}>
          <Meta label="총 금액" value={formatWon(gonggu.totalPrice)} />
          <Meta label="예상 1/N" value={formatWon(getPricePerPerson(gonggu))} />
          <Meta label="모집" value={`${gonggu.currentParticipants}/${gonggu.targetParticipants}명`} />
          <Meta label="마감" value={gonggu.recruitmentDeadline} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>픽업/소분</Text>
        <InfoBox
          title={gonggu.pickupPlaceName}
          body={`${gonggu.pickupExpectedTime} · ${gonggu.splitMethod} · ${formatDistance(
            gonggu.pickupDistanceMeters
          )}`}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>공구장 신뢰도</Text>
        <InfoBox
          title={`${gonggu.hostNickname} · ${gonggu.hostTrustScore.toFixed(1)}도`}
          body="시간 약속, 소분 공정성, 소통 매너를 거래 완료 후 필수 후기로 반영합니다."
        />
      </View>

      {participation ? (
        <View style={styles.actionStack}>
          <InfoBox
            title="참여 중"
            body={`결제 상태: ${participation.paymentStatus} · 픽업: ${participation.pickupConfirmationStatus} · 후기: ${participation.reviewStatus}`}
          />
          <SecondaryButton label="공구 채팅방" onPress={onChat} />
          <SecondaryButton label="정산 상태 보기" onPress={onSettlement} />
          {participation.pickupConfirmationStatus !== "confirmed" && (
            <PrimaryButton label="픽업 완료 처리" onPress={onConfirmPickup} />
          )}
          {participation.pickupConfirmationStatus === "confirmed" && participation.reviewStatus !== "completed" && (
            <PrimaryButton label="필수 후기 작성" onPress={onReview} />
          )}
          {participation.status === "payment_confirmed" && (
            <DangerButton label="참여 취소" onPress={onCancel} />
          )}
        </View>
      ) : (
        <View style={styles.actionStack}>
          <PrimaryButton
            label={`${formatWon(getPricePerPerson(gonggu))}로 참여하기`}
            onPress={onJoin}
            disabled={gonggu.currentParticipants >= gonggu.targetParticipants}
          />
          <SecondaryButton label="정산 조건 미리 보기" onPress={onSettlement} />
        </View>
      )}

      {settlement && <SettlementMini settlement={settlement} />}
    </ScrollView>
  );
}

function ChatScreen({
  snapshot,
  gonggu,
  currentUserId,
  onSend
}: {
  snapshot: AppSnapshot;
  gonggu: Gonggu;
  currentUserId: string;
  onSend: (text: string) => void;
}) {
  const [text, setText] = useState("");
  const messages = snapshot.messages.filter((message) => message.gongguId === gonggu.id);

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.chatContent}>
        <InfoBox title={gonggu.title} body="참여자와 공구장만 접근 가능한 채팅방입니다." />
        {messages.map((message) => {
          const isMine = message.senderId === currentUserId;
          return (
            <View
              key={message.id}
              style={[
                styles.messageBubble,
                message.messageType === "system" && styles.systemMessage,
                isMine && styles.myMessage
              ]}
            >
              <Text style={styles.messageSender}>{message.senderName}</Text>
              <Text style={styles.messageText}>{message.text}</Text>
            </View>
          );
        })}
      </ScrollView>
      <View style={styles.composer}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="메시지 입력"
          style={styles.composerInput}
          placeholderTextColor={colors.textMuted}
        />
        <PrimaryButton
          compact
          label="전송"
          onPress={() => {
            onSend(text);
            setText("");
          }}
        />
      </View>
    </View>
  );
}

function SettlementScreen({ snapshot, gonggu }: { snapshot: AppSnapshot; gonggu: Gonggu }) {
  const settlement = snapshot.settlements.find((item) => item.id === gonggu.settlementId);
  const participants = snapshot.participations.filter((item) => item.gongguId === gonggu.id);

  if (!settlement) {
    return (
      <View style={styles.content}>
        <InfoBox title="정산 정보 없음" body="정산 데이터가 아직 생성되지 않았습니다." />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>정산 도우미</Text>
      <Text style={styles.title}>{statusLabel(settlement.status)}</Text>
      <Text style={styles.bodyText}>
        POC에서는 실제 돈을 보관하지 않고, 결제/정산 상태값과 지급 가능 조건만 검증합니다.
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>금액</Text>
        <View style={styles.metaGrid}>
          <Meta label="총액" value={formatWon(settlement.totalAmount)} />
          <Meta label="1인 금액" value={formatWon(settlement.pricePerPerson)} />
          <Meta label="인원" value={`${settlement.participantCount}명`} />
          <Meta label="모드" value={settlement.mode} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>지급 조건</Text>
        <InfoBox
          title="픽업 완료 + 필수 후기 완료"
          body="참여자가 픽업 완료 후 후기를 남기면 mock 정산 상태가 지급가능으로 변경됩니다."
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>참여자 상태</Text>
        {participants.length === 0 ? (
          <Text style={styles.bodyText}>아직 현재 사용자의 참여 내역이 없습니다.</Text>
        ) : (
          participants.map((participation) => (
            <View key={`${participation.gongguId}_${participation.userId}`} style={styles.stateRow}>
              <Text style={styles.stateTitle}>참여자 {participation.userId}</Text>
              <Text style={styles.caption}>
                결제 {participation.paymentStatus} · 픽업 {participation.pickupConfirmationStatus} · 후기{" "}
                {participation.reviewStatus}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function ReviewScreen({ gonggu, onSubmit }: { gonggu: Gonggu; onSubmit: (rating: number, comment: string) => void }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("시간 약속을 잘 지켰고 소분도 깔끔했어요.");

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>필수 후기</Text>
      <Text style={styles.title}>{gonggu.hostNickname}님과의 공구는 어땠나요?</Text>
      <Text style={styles.bodyText}>
        후기가 완료되면 신뢰도와 정산 지급 가능 조건에 반영됩니다.
      </Text>
      <View style={styles.ratingRow}>
        {[1, 2, 3, 4, 5].map((value) => (
          <Pressable key={value} onPress={() => setRating(value)} style={styles.ratingButton}>
            <Text style={[styles.ratingText, value <= rating && styles.ratingTextActive]}>★</Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        multiline
        value={comment}
        onChangeText={setComment}
        style={styles.textArea}
        placeholder="후기를 입력해주세요"
        placeholderTextColor={colors.textMuted}
      />
      <PrimaryButton label="후기 제출하고 정산 가능 처리" onPress={() => onSubmit(rating, comment)} />
    </ScrollView>
  );
}

function CreateGongguScreen({
  onCreate
}: {
  onCreate: (input: {
    title: string;
    totalPrice: number;
    targetParticipants: number;
    pickupPlaceName: string;
    pickupExpectedTime: string;
  }) => void;
}) {
  const [title, setTitle] = useState("쿠팡 대용량 물티슈 같이 나눠요");
  const [totalPrice, setTotalPrice] = useState("15900");
  const [targetParticipants, setTargetParticipants] = useState("3");
  const [pickupPlaceName, setPickupPlaceName] = useState("홍대입구역 8번 출구");
  const [pickupExpectedTime, setPickupExpectedTime] = useState("오늘 21:00");

  const parsedTotalPrice = Number(totalPrice);
  const parsedParticipants = Number(targetParticipants);
  const pricePerPerson =
    Number.isFinite(parsedTotalPrice) && Number.isFinite(parsedParticipants) && parsedParticipants > 0
      ? Math.ceil(parsedTotalPrice / parsedParticipants)
      : 0;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>새 공구</Text>
      <Text style={styles.title}>상품과 픽업 조건을 입력하세요.</Text>
      <Field label="상품명" value={title} onChangeText={setTitle} />
      <Field label="총 가격" value={totalPrice} onChangeText={setTotalPrice} keyboardType="number-pad" />
      <Field label="모집 인원" value={targetParticipants} onChangeText={setTargetParticipants} keyboardType="number-pad" />
      <Field label="픽업 장소" value={pickupPlaceName} onChangeText={setPickupPlaceName} />
      <Field label="픽업 예상 시간" value={pickupExpectedTime} onChangeText={setPickupExpectedTime} />
      <InfoBox title="예상 1/N" body={`${formatWon(pricePerPerson)} · 실제 결제는 MVP에서 mock 처리됩니다.`} />
      <PrimaryButton
        label="공구 게시하기"
        onPress={() =>
          onCreate({
            title,
            totalPrice: parsedTotalPrice,
            targetParticipants: parsedParticipants,
            pickupPlaceName,
            pickupExpectedTime
          })
        }
        disabled={!title.trim() || pricePerPerson <= 0}
      />
    </ScrollView>
  );
}

function ProfileScreen({ snapshot }: { snapshot: AppSnapshot }) {
  const user = getCurrentUser(snapshot);
  const joinedCount = snapshot.participations.filter((item) => item.userId === user.id).length;
  const reviewCount = snapshot.reviews.filter((item) => item.reviewerId === user.id).length;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.profileHero}>
        <View style={styles.profileAvatar}>
          <Text style={styles.profileAvatarText}>{user.nickname.slice(0, 1)}</Text>
        </View>
        <Text style={styles.title}>{user.nickname}</Text>
        <Text style={styles.bodyText}>{user.neighborhood} 인증 완료</Text>
      </View>
      <View style={styles.metaGrid}>
        <Meta label="매너 온도" value={`${user.trustScore.toFixed(1)}도`} />
        <Meta label="완료 공구" value={`${user.completedGongguCount}회`} />
        <Meta label="참여 중" value={`${joinedCount}건`} />
        <Meta label="작성 후기" value={`${reviewCount}개`} />
      </View>
      <InfoBox
        title="학교 이메일 인증"
        body={user.universityVerified ? "인증 완료 · 대학가 공구 참여 가능" : "미인증"}
      />
      <InfoBox
        title="알림 설정"
        body="POC에서는 인앱 상태로만 표시합니다. 실서비스에서는 Expo Notifications/FCM을 연결합니다."
      />
    </ScrollView>
  );
}

function MapPlaceholder({
  gonggus,
  onOpenGonggu
}: {
  gonggus: Gonggu[];
  onOpenGonggu: (gongguId: string) => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.mapMockLarge}>
        <Text style={styles.mapPin}>⌖</Text>
        <Text style={styles.mapTitle}>지도 POC</Text>
        <Text style={styles.bodyText}>react-native-maps 또는 Naver Map 모듈 연결 전 placeholder입니다.</Text>
        {gonggus.map((gonggu, index) => (
          <Pressable
            key={gonggu.id}
            accessibilityRole="button"
            onPress={() => onOpenGonggu(gonggu.id)}
            style={[styles.mapMarker, index % 2 === 0 ? styles.mapMarkerLeft : styles.mapMarkerRight]}
          >
            <Text style={styles.mapMarkerText}>{formatWon(getPricePerPerson(gonggu))}</Text>
          </Pressable>
        ))}
      </View>
      {gonggus.map((gonggu) => (
        <GongguCard key={gonggu.id} gonggu={gonggu} onPress={() => onOpenGonggu(gonggu.id)} />
      ))}
    </ScrollView>
  );
}

function SegmentedControl<T extends string>({
  value,
  options,
  onChange
}: {
  value: T;
  options: Array<{ label: string; value: T }>;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            onPress={() => onChange(option.value)}
            style={[styles.segmentButton, active && styles.segmentButtonActive]}
          >
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function PrimaryButton({
  label,
  onPress,
  disabled,
  compact
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.primaryButton, compact && styles.compactButton, disabled && styles.disabledButton]}
    >
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.secondaryButton}>
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function DangerButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.dangerButton}>
      <Text style={styles.dangerButtonText}>{label}</Text>
    </Pressable>
  );
}

function InfoBox({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.infoBox}>
      <Text style={styles.infoTitle}>{title}</Text>
      <Text style={styles.bodyText}>{body}</Text>
    </View>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaItem}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

function ProgressBar({ progress }: { progress: number }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${Math.min(100, Math.max(0, progress * 100))}%` }]} />
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  keyboardType
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "number-pad";
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        style={styles.input}
        placeholderTextColor={colors.textMuted}
      />
    </View>
  );
}

function SettlementMini({ settlement }: { settlement: Settlement }) {
  return (
    <View style={styles.settlementMini}>
      <View>
        <Text style={styles.sectionTitle}>정산 상태</Text>
        <Text style={styles.bodyText}>
          {statusLabel(settlement.status)} · {formatWon(settlement.pricePerPerson)} / 1인
        </Text>
      </View>
      <Text style={styles.statusBadge}>{settlement.mode}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background
  },
  keyboardAvoiding: {
    flex: 1
  },
  shell: {
    flex: 1,
    backgroundColor: colors.background
  },
  flex: {
    flex: 1
  },
  login: {
    flex: 1,
    justifyContent: "center",
    padding: spacing.xl,
    backgroundColor: colors.background
  },
  logoMark: {
    alignItems: "center",
    justifyContent: "center",
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: colors.primary,
    marginBottom: spacing.lg
  },
  logoText: {
    color: colors.surface,
    fontSize: 32,
    fontWeight: "800"
  },
  heroTitle: {
    color: colors.text,
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: 0,
    marginBottom: spacing.sm
  },
  heroCopy: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: spacing.xl
  },
  loginPanel: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md
  },
  panelTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700"
  },
  header: {
    minHeight: 64,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center"
  },
  headerSide: {
    width: 48,
    alignItems: "flex-start"
  },
  headerSideRight: {
    width: 48,
    alignItems: "flex-end"
  },
  headerCenter: {
    flex: 1,
    alignItems: "center"
  },
  headerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800"
  },
  headerSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center"
  },
  iconButtonText: {
    color: colors.text,
    fontSize: 36,
    lineHeight: 38
  },
  profilePill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceAlt
  },
  profileInitial: {
    color: colors.primaryDark,
    fontSize: 16,
    fontWeight: "800"
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg
  },
  listContent: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxl
  },
  toolbar: {
    padding: spacing.lg,
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center",
    justifyContent: "space-between"
  },
  kicker: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "800"
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "800",
    lineHeight: 32
  },
  bodyText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21
  },
  caption: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    overflow: "hidden"
  },
  cardImage: {
    height: 144,
    backgroundColor: colors.surfaceAlt
  },
  heroImage: {
    height: 220,
    borderRadius: 8,
    backgroundColor: colors.surfaceAlt
  },
  cardBody: {
    padding: spacing.lg,
    gap: spacing.md
  },
  cardTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 26
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm
  },
  badge: {
    alignSelf: "flex-start",
    color: colors.primaryDark,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: "800"
  },
  statusBadge: {
    alignSelf: "flex-start",
    color: colors.text,
    backgroundColor: "#FFF4D6",
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: "800"
  },
  connectedBadge: {
    alignSelf: "flex-start",
    color: colors.primaryDark,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: "800"
  },
  offlineBadge: {
    alignSelf: "flex-start",
    color: colors.danger,
    backgroundColor: "#FFF0F0",
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: "800"
  },
  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  metaItem: {
    width: "48%",
    minHeight: 58,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  metaLabel: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: spacing.xs
  },
  metaValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800"
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.surfaceAlt,
    overflow: "hidden"
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: colors.primary
  },
  section: {
    gap: spacing.md
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800"
  },
  infoBox: {
    padding: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  infoTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: spacing.xs
  },
  primaryButton: {
    minHeight: 50,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg
  },
  compactButton: {
    minHeight: 42
  },
  disabledButton: {
    opacity: 0.45
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: "800"
  },
  secondaryButton: {
    minHeight: 50,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg
  },
  secondaryButtonText: {
    color: colors.primaryDark,
    fontSize: 15,
    fontWeight: "800"
  },
  dangerButton: {
    minHeight: 50,
    borderRadius: 8,
    backgroundColor: "#FFF0F0",
    borderWidth: 1,
    borderColor: "#FFD0D0",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg
  },
  dangerButtonText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: "800"
  },
  actionStack: {
    gap: spacing.md
  },
  segmented: {
    flex: 1,
    flexDirection: "row",
    padding: 4,
    borderRadius: 8,
    backgroundColor: colors.surfaceAlt
  },
  segmentButton: {
    flex: 1,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6
  },
  segmentButtonActive: {
    backgroundColor: colors.surface
  },
  segmentText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: "700"
  },
  segmentTextActive: {
    color: colors.primaryDark
  },
  mapMock: {
    height: 240,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    gap: spacing.sm
  },
  mapMockLarge: {
    minHeight: 360,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#E6F2EC",
    gap: spacing.sm,
    overflow: "hidden"
  },
  mapPin: {
    color: colors.primary,
    fontSize: 44,
    fontWeight: "800"
  },
  mapTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800"
  },
  mapMarker: {
    position: "absolute",
    minWidth: 78,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    alignItems: "center"
  },
  mapMarkerLeft: {
    left: 36,
    top: 96
  },
  mapMarkerRight: {
    right: 44,
    bottom: 86
  },
  mapMarkerText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: "800"
  },
  chatContent: {
    padding: spacing.lg,
    gap: spacing.md
  },
  messageBubble: {
    maxWidth: "82%",
    alignSelf: "flex-start",
    padding: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border
  },
  myMessage: {
    alignSelf: "flex-end",
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  systemMessage: {
    alignSelf: "center",
    backgroundColor: "#FFF8E6",
    borderColor: "#F6E4B5"
  },
  messageSender: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: spacing.xs
  },
  messageText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20
  },
  composer: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface
  },
  composerInput: {
    flex: 1,
    minHeight: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    color: colors.text
  },
  stateRow: {
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.xs
  },
  stateTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "800"
  },
  settlementMini: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  ratingRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.sm
  },
  ratingButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center"
  },
  ratingText: {
    color: colors.border,
    fontSize: 36
  },
  ratingTextActive: {
    color: colors.secondary
  },
  textArea: {
    minHeight: 140,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    color: colors.text,
    textAlignVertical: "top"
  },
  field: {
    gap: spacing.sm
  },
  fieldLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "800"
  },
  input: {
    minHeight: 50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    color: colors.text
  },
  profileHero: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xl
  },
  profileAvatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary
  },
  profileAvatarText: {
    color: colors.surface,
    fontSize: 30,
    fontWeight: "800"
  }
});
