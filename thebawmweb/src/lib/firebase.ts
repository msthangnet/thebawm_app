import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyA4MKMdrVNBfvR21tUXyeXE1pvK6LjnE3E",
  authDomain: "the-bawmnet.firebaseapp.com",
  databaseURL: "https://the-bawmnet-default-rtdb.firebaseio.com",
  projectId: "the-bawmnet",
  storageBucket: "the-bawmnet.appspot.com",
  messagingSenderId: "959825450038",
  appId: "1:959825450038:web:85e6b44d76955af3b6b497",
  measurementId: "G-M4FXZE461H"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
