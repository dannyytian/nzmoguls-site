// firebase-init.js

const firebaseConfig = {
    apiKey: "AIzaSyA8mMxf7fWvncHkGrMDTPYrwhn8ueQ7P0A",
    authDomain: "nzmoguls-club.firebaseapp.com",
    projectId: "nzmoguls-club",
    storageBucket: "nzmoguls-club.firebasestorage.app",
    messagingSenderId: "147179359148",
    appId: "1:147179359148:web:06344a076283a9eb4c0809"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();
