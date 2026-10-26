
import { initializeApp } from "firebase/app";

import { getAuth } from "firebase/auth";

import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

// Your Hush Firebase configuration.
const firebaseConfig = {
  apiKey: "AIzaSyCTeo3ux8ZYR3mwxY78ysGyk0F8y1-BaT8",
  authDomain: "anonymous-x-295e2.firebaseapp.com",
  projectId: "anonymous-x-295e2",
  storageBucket: "anonymous-x-295e2.firebasestorage.app",
  messagingSenderId: "476742473273",
  appId: "1:476742473273:web:431f93fddb996782a51fe8",
  measurementId: "G-8SFKNF80NW"
};

// Initialize Firebase.
const app = initializeApp(firebaseConfig);

// Connect Firebase Authentication.
const auth = getAuth(app);

// Connect to Cloud Firestore.
const db = getFirestore(app);

// Temporary test function.
// Remove this after confirming Firestore works.
export async function testFirestore() {
  const testPost = {
    text: "Hush Firebase connection test",
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, "posts"), testPost);

  console.log(
    "Firestore test successful. Document ID:",
    docRef.id
  );
}

// Export the database and authentication connections.
export { db, auth };