const firebaseConfig = {
  apiKey: "AIzaSyDTpMZfwXVkhFy75TTGS874H0wLOGF9ijk",
  authDomain: "ujian-ba67f.firebaseapp.com",
  databaseURL: "https://ujian-ba67f-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ujian-ba67f",
  storageBucket: "ujian-ba67f.appspot.com", 
  messagingSenderId: "654821216343",
  appId: "1:654821216343:web:22d61af47d4798953c1312"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
