export function formatWon(amount: number) {
  return `${amount.toLocaleString("ko-KR")}원`;
}

export function formatDistance(meters: number) {
  if (meters < 1000) {
    return `${meters}m`;
  }

  return `${(meters / 1000).toFixed(1)}km`;
}

export function statusLabel(status: string) {
  const labels: Record<string, string> = {
    recruiting: "모집중",
    recruited: "모집완료",
    pickup_pending: "픽업대기",
    pickup_completed: "픽업완료",
    review_required: "후기필수",
    completed: "완료",
    canceled: "취소",
    disputed: "분쟁",
    pending: "대기",
    held: "보관중",
    releasable: "지급가능",
    payout_requested: "지급요청",
    paid: "지급완료"
  };

  return labels[status] ?? status;
}

