import { Platform, StyleSheet } from "react-native";

import { t } from "../theme/theme";

export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.bg },
  flex: { flex: 1 },
  root: { flex: 1, backgroundColor: t.bg },
  rootWeb: { width: "100%", maxWidth: 480, alignSelf: "center" },
  body: { flex: 1, minHeight: 0 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },

  /* empty state */
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, paddingVertical: 60, gap: 10 },
  emptyEmoji: { fontSize: 44, marginBottom: 4 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: t.ink, textAlign: "center" },
  emptyDesc: { fontSize: 14, color: t.muted, lineHeight: 20, textAlign: "center" },

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
  chipScroll: { flexShrink: 0, flexGrow: 0 },
  chipRow: { gap: 8, paddingHorizontal: 20, paddingTop: 6, paddingBottom: 10, alignItems: "center" },
  filterChip: {
    flexShrink: 0,
    flexGrow: 0,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1
  },
  dealList: { gap: 11, paddingHorizontal: 16, paddingTop: 6, paddingBottom: 80 },
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
  dealTitle: { fontSize: 15, fontWeight: "700", color: t.ink, marginTop: 2, lineHeight: 20 },
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
  mapOverlayBanner: {
    position: "absolute",
    top: 64,
    left: 20,
    right: 20,
    backgroundColor: "rgba(26, 26, 26, 0.82)",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14
  },
  mapOverlayText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
    textAlign: "center",
    lineHeight: 18
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
  stepper: { flexDirection: "row", alignItems: "center", gap: 4 },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: t.card,
    borderWidth: 1,
    borderColor: t.border,
    alignItems: "center",
    justifyContent: "center"
  },
  stepperSign: { fontSize: 20, fontWeight: "700", color: t.ink, lineHeight: 22 },
  stepperValue: { minWidth: 36, textAlign: "center", fontSize: 18, fontWeight: "800", color: t.ink },
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
  },

  /* detail 삭제 버튼 (방장 전용) */
  detailDelete: {
    position: "absolute",
    top: 14,
    right: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.92)"
  },
  detailDeleteText: { fontSize: 13, fontWeight: "700", color: t.rose },

  /* 채팅방 헤더 나가기 버튼 */
  chatLeaveBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 14, backgroundColor: t.bg },
  chatLeaveText: { fontSize: 12, fontWeight: "700", color: t.muted },

  /* 채팅 목록 화면 */
  listHeader: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10 },
  listHeaderTitle: { fontSize: 22, fontWeight: "800", color: t.ink },
  roomList: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 80, gap: 8 },
  roomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    shadowColor: "#28180F",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2
  },
  roomThumb: { width: 52, height: 52, borderRadius: 12 },
  roomTitle: { fontSize: 15, fontWeight: "700", color: t.ink },
  roomMeta: { fontSize: 12, color: t.muted, marginTop: 3 },
  roomLeaveBtn: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 14, backgroundColor: t.bg },
  roomLeaveText: { fontSize: 12, fontWeight: "700", color: t.muted },

  /* 확인 시트 취소 버튼 */
  confirmCancel: { flex: 1, backgroundColor: t.bg },

  /* 알림 목록 화면 (main 병합) */
  notifItemCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1
  },
  notifIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: t.roseSoft,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1
  },
  notifTypeBadge: {
    backgroundColor: t.roseSoft,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2
  },

  /* 홈 제목 검색바 */
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 6,
    paddingHorizontal: 14,
    height: 42,
    borderRadius: 21,
    backgroundColor: t.bg,
    borderWidth: 1,
    borderColor: t.border
  },
  searchInput: { flex: 1, fontSize: 14, color: t.ink, padding: 0 },
  searchClear: { fontSize: 15, fontWeight: "700", color: t.dim, paddingHorizontal: 2 }
});
