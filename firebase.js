const firebase = require("firebase/compat/app");
require("firebase/compat/auth");
require("firebase/compat/database");

const firebaseConfig = {
    apiKey: "AIzaSyDMjzDbBmDRXtcEY80Vn-ChdX8p-hW-GTM",
    authDomain: "mentorise-6d83e.firebaseapp.com",
    projectId: "mentorise-6d83e",
    storageBucket: "mentorise-6d83e.firebasestorage.app",
    messagingSenderId: "135907849257",
    appId: "1:135907849257:web:7b8c540ba0d28e4fda9838",
    measurementId: "G-L3H6G4YJ8K",
    databaseURL:"https://mentorise-6d83e-default-rtdb.firebaseio.com/"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

const saveUser = async (userData) => {
  try {
    let node;
    if (userData.userType === "mentee") node = "mentees";
    else if (userData.userType === "mentor") node = "mentor";
    else throw new Error("Invalid user type");

    const dataToSave = { ...userData };
    delete dataToSave.password;

    const newUserRef = database.ref(node).push(); // create a new entry
    await newUserRef.set(dataToSave);
    return { success: true, message: "User saved successfully!" };
  } catch (error) {
    console.error("Error saving user:", error.message);
    return { success: false, message: error.message };
  }
};

async function signupUser(email,password) {
  try{
    const userCredential= await auth.createUserWithEmailAndPassword(email,password);
    const user=userCredential.user;
    console.log("User signed up:", user.email);
    return { success: true, user};
  }catch(error){
    console.error("Signup error:", error.message);
    return { success: false ,  message: error.message };
  }
}

async function loginUser(email,password) {
  try{
    const userCredential= await auth.signInWithEmailAndPassword(email,password)
    const user=userCredential.user;
    console.log("login successful");
    return{success:true,user};
  }catch(e){
    console.error("login falied:",e.message);
    return{success:false,message:e.message};
  }
}

module.exports={signupUser,loginUser,saveUser};
