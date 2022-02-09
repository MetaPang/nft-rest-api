import firebase from 'firebase/app';
import { getDatabase } from 'firebase/database';

interface IFirebaseConfig {
  apiKey: string
  authDomain: string
  databaseURL: string
  projectId: string
  storageBucket: string
  messagingSenderId: string
  appId: string
  measurementId?: string
};

const firebaseConfig: IFirebaseConfig = {
  apiKey: 'AIzaSyA-ZnxT3IAS3rcan5ub91dnLsZTpSAqk_8',
  authDomain: 'bangbangslime-febd7.firebaseapp.com',
  databaseURL: 'https://bangbangslime-febd7-default-rtdb.firebaseio.com',
  projectId: 'bangbangslime-febd7',
  storageBucket: 'bangbangslime-febd7.appspot.com',
  messagingSenderId: '622462435619',
  appId: '1:622462435619:web:1d70e1968aefbad3124c96',
  measurementId: 'G-HN9XVCVD19'
};

firebase.initializeApp(firebaseConfig);
const database = getDatabase();

export default database;
