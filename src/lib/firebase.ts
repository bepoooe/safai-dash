import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyALVkB5jfl6O0CLNBtGmaX87Kc6UBu2TLE",
  authDomain: "safai-saathi-94ff0.firebaseapp.com",
  projectId: "safai-saathi-94ff0",
  storageBucket: "safai-saathi-94ff0.firebasestorage.app",
  messagingSenderId: "6015045092",
  appId: "1:6015045092:web:67cef730d1d5f45b0d4bf1",
  measurementId: "G-VXSJC8JN9Z"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
