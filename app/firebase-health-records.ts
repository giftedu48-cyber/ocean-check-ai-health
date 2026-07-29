"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import {
  addDoc,
  collection,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";

export type SavedHealthCheck = {
  id: string;
  region: string;
  score: number;
  status: string;
  checkedAt: string;
  metrics: { label: string; score: number; weight: number }[];
  notes: string[];
};

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseReady = Object.values(firebaseConfig).every(Boolean);

const getFirebaseServices = () => {
  if (!isFirebaseReady) {
    throw new Error("Firebase 프로젝트 연결이 필요합니다.");
  }

  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return { auth: getAuth(app), db: getFirestore(app) };
};

const ensureAnonymousUser = async () => {
  const { auth } = getFirebaseServices();
  if (auth.currentUser) return auth.currentUser;
  return (await signInAnonymously(auth)).user;
};

export const saveHealthCheck = async (record: Omit<SavedHealthCheck, "id">) => {
  const { db } = getFirebaseServices();
  const user = await ensureAnonymousUser();
  const saved = await addDoc(collection(db, "users", user.uid, "healthChecks"), {
    ...record,
    createdAt: serverTimestamp(),
  });
  return saved.id;
};

export const loadHealthChecks = async (): Promise<SavedHealthCheck[]> => {
  const { db } = getFirebaseServices();
  const user = await ensureAnonymousUser();
  const checks = query(
    collection(db, "users", user.uid, "healthChecks"),
    orderBy("createdAt", "desc"),
    limit(20),
  );
  const snapshot = await getDocs(checks);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as SavedHealthCheck);
};
