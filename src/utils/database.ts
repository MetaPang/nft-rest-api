import { initializeApp } from 'firebase/app';
import 'dotenv/config';

import { IFirebaseConfig } from '../interfaces';

const {
  FIREBASE_APP_KEY,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_DATABASE_URL,
  FIREBASE_PRODUCT_ID,
  FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGE_SENDER_ID,
  FIREBASE_APP_ID,
  FIREBASE_MEASUREMENT_ID
} = process.env;

const firebaseConfig: IFirebaseConfig = {
  apiKey: FIREBASE_APP_KEY,
  authDomain: FIREBASE_AUTH_DOMAIN,
  databaseURL: FIREBASE_DATABASE_URL,
  projectId: FIREBASE_PRODUCT_ID,
  storageBucket: FIREBASE_STORAGE_BUCKET,
  messagingSenderId: FIREBASE_MESSAGE_SENDER_ID,
  appId: FIREBASE_APP_ID,
  measurementId: FIREBASE_MEASUREMENT_ID
};

const database = initializeApp(firebaseConfig);

export default database;
