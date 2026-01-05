import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: "G-LK73P1LZ7Y"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export const authenticateUser = async (fullName: string, passwordInput: string): Promise<boolean> => {
  try {
    // According to prompt: Collection is 'Cedar', Doc ID is the Name (e.g., 'Asep Sadboy')
    const docRef = doc(db, 'Cedar', fullName);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      // Compare passwords (case-sensitive or insensitive depending on requirement, doing exact match here)
      if (data.Password === passwordInput) {
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error("Auth error:", error);
    return false;
  }
};