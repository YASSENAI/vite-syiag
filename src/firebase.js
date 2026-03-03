import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyA--UcgGXvIhrTVHtcsDUehlHWPH8YQxkI",
    authDomain: "siyag-c8d99.firebaseapp.com",
    projectId: "siyag-c8d99",
    storageBucket: "siyag-c8d99.firebasestorage.app",
    messagingSenderId: "733522218208",
    appId: "1:733522218208:web:8deafaccd5349facbb1485",
    measurementId: "G-W1WZPDJ7GB"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
