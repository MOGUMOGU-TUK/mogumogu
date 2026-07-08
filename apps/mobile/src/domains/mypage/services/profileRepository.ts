import { doc, getDoc, setDoc } from "firebase/firestore";

import { getFirebaseServices } from "../../../services/firebase/client";
import type { VerifiedLocation } from "../../location/services/verifyNeighborhood";

const USERS = "users";

export type UserProfileDoc = {
  nickname?: string;
  lastNicknameChangedAt?: string | null;
  verifiedLocation?: VerifiedLocation | null;
};

export async function loadUserProfileDoc(uid: string): Promise<UserProfileDoc | null> {
  const services = getFirebaseServices();
  if (!services) return null;

  const snap = await getDoc(doc(services.db, USERS, uid));
  const data = snap.data() as { profile?: UserProfileDoc } | undefined;
  return data?.profile ?? null;
}

export async function saveUserProfileDoc(
  uid: string,
  profile: UserProfileDoc,
): Promise<void> {
  const services = getFirebaseServices();
  if (!services) return;

  await setDoc(
    doc(services.db, USERS, uid),
    {
      profile,
      profileUpdatedAt: new Date().toISOString(),
    },
    { merge: true },
  );
}
