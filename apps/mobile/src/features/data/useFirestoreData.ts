import { useEffect, useState } from "react";

import { isFirebaseConfigured } from "../../services/firebase/client";
import { subscribeGonggus } from "../../services/firebase/gongguRepository";
import {
  subscribeParticipations,
  subscribeReviews,
  subscribeSettlements
} from "../../services/firebase/participationRepository";
import { seedSnapshot } from "../../services/mock/seed";
import type { Gonggu, Participation, Review, Settlement } from "../../types/domain";

export type GongguSource = "firestore" | "seed" | "loading";

export type FirestoreData = {
  gonggus: Gonggu[];
  participations: Participation[];
  settlements: Settlement[];
  reviews: Review[];
  source: GongguSource;
};

/**
 * Firestore 실시간 데이터 (mock → Firebase 전환 2·3단계).
 *
 * - Firebase 설정 시: gonggus / participations / settlements / reviews 컬렉션을 각각 구독
 * - 미설정 시: seed 데이터로 동작 (source `"seed"`)
 * - gonggus 가 비어 있으면 데모용으로 seed 공구를 보여준다.
 */
export function useFirestoreData(): FirestoreData {
  const configured = isFirebaseConfigured();
  const [gonggus, setGonggus] = useState<Gonggu[]>(seedSnapshot.gonggus);
  const [source, setSource] = useState<GongguSource>(configured ? "loading" : "seed");
  const [participations, setParticipations] = useState<Participation[]>(seedSnapshot.participations);
  const [settlements, setSettlements] = useState<Settlement[]>(seedSnapshot.settlements);
  const [reviews, setReviews] = useState<Review[]>(seedSnapshot.reviews);

  useEffect(() => {
    if (!configured) {
      return;
    }

    const unsubscribers = [
      subscribeGonggus(
        (items) => {
          setGonggus(items.length > 0 ? items : seedSnapshot.gonggus);
          setSource(items.length > 0 ? "firestore" : "seed");
        },
        () => setSource("seed")
      ),
      subscribeParticipations(setParticipations),
      subscribeSettlements(setSettlements),
      subscribeReviews(setReviews)
    ];

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [configured]);

  return { gonggus, participations, settlements, reviews, source };
}
