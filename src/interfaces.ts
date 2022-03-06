export interface IResult {
  code: string;
  msg?: string;
  data?: any;
  success: boolean;
}

export interface IFirebaseConfig {
  apiKey: string
  authDomain: string
  databaseURL: string
  projectId: string
  storageBucket: string
  messagingSenderId: string
  appId: string
  measurementId?: string
};