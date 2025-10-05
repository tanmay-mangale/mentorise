const firebase = require("firebase/compat/app");
require("firebase/compat/auth");

const firebaseConfig = {
    apiKey: "AIzaSyDMjzDbBmDRXtcEY80Vn-ChdX8p-hW-GTM",
    authDomain: "mentorise-6d83e.firebaseapp.com",
    projectId: "mentorise-6d83e",
    storageBucket: "mentorise-6d83e.firebasestorage.app",
    messagingSenderId: "135907849257",
    appId: "1:135907849257:web:7b8c540ba0d28e4fda9838",
    measurementId: "G-L3H6G4YJ8K"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

async function signupUser(email,password) {
  try{
    const userCredential= await auth.createUserWithEmailAndPassword(email,password);
    const user=userCredential.user;
    console.log("User signed up:", user.email);
    return { success: true, user };
  }catch(error){
    console.error("Signup error:", error.message);
    return { success: false ,  message: error.message };
  }
}

module.exports={signupUser};
