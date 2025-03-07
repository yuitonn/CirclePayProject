// src/config/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: "AIzaSyAMONtO8kFLUChqHlitl8lZN4EjEQCRN64",
    authDomain: "circle-pay-a4ee5.firebaseapp.com",
    projectId: "circle-pay-a4ee5",
    storageBucket: "circle-pay-a4ee5.firebasestorage.app",
    messagingSenderId: "106826133499",
    appId: "1:106826133499:web:68bef556edd1ff4fe6e55e",
    measurementId: "G-LCG8J6J6KC"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
