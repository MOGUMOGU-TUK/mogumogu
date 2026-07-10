import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  setDoc,
  where,
} from "firebase/firestore";

import { getFirebaseServices } from "../../../services/firebase/client";

const HEARTS = "hearts";

const heartId = (userId: string, gongguId: string) => `${userId}__${gongguId}`;

export async function toggleHeart(userId: string, gongguId: string, hearted: boolean): Promise<void> {
  const services = getFirebaseServices();
  if (!services) return;
  const ref = doc(services.db, HEARTS, heartId(userId, gongguId));
  if (hearted) {
    await deleteDoc(ref);
  } else {
    await setDoc(ref, { userId, gongguId, createdAt: Date.now() });
  }
}

export function subscribeHearts(userId: string, onChange: (gongguIds: string[]) => void): () => void {
  const services = getFirebaseServices();
  if (!services) return () => {};
  const q = query(collection(services.db, HEARTS), where("userId", "==", userId));
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => d.data().gongguId as string));
  });
}
