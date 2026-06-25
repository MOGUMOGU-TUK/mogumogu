import { useEffect, useState } from "react";

import { isFirebaseConfigured } from "../../services/firebase/client";
import { subscribeGonggus } from "../../services/firebase/gongguRepository";
import { seedSnapshot } from "../../services/mock/seed";
import type { Gonggu } from "../../types/domain";

export type GongguSource = "firestore" | "seed" | "loading";

export type UseGonggus = {
  gonggus: Gonggu[];
  source: GongguSource;
};

/**
 * 공구 리스트 데이터 소스 (mock → Firebase 전환 2단계).
 *
 * - Firebase 설정 시: `gonggus` 컬렉션 실시간 구독 → source `"firestore"`
 * - 미설정 / 구독 실패 / 빈 컬렉션: seed 데이터로 폴백 → source `"seed"`
 */
export function useGonggus(): UseGonggus {
  const [state, setState] = useState<UseGonggus>(() =>
    isFirebaseConfigured()
      ? { gonggus: seedSnapshot.gonggus, source: "loading" }
      : { gonggus: seedSnapshot.gonggus, source: "seed" }
  );

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      return;
    }

    return subscribeGonggus(
      (gonggus) =>
        setState(
          gonggus.length > 0
            ? { gonggus, source: "firestore" }
            : { gonggus: seedSnapshot.gonggus, source: "seed" }
        ),
      () => setState({ gonggus: seedSnapshot.gonggus, source: "seed" })
    );
  }, []);

  return state;
}
