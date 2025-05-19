import { initializeApp } from "firebase/app";
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCJ5jPXKVyzF6vecF-MoiPXha0iurtX-AM",
    authDomain: "bestprice-4c8cd.firebaseapp.com",
    projectId: "bestprice-4c8cd",
    storageBucket: "bestprice-4c8cd.appspot.com",      // popravljen URL
    messagingSenderId: "334606045846",
    appId: "1:334606045846:web:0f6857d76641dc2cae28b7"
};
  const firebaseApp = initializeApp(firebaseConfig);
  const auth = getAuth(firebaseApp);
  const firestore = getFirestore(firebaseApp);

export { firestore, auth};