require("dotenv").config();
const { GoogleGenAI } = require("@google/genai");
const express=require("express");
const path=require("path");
const { signupUser,loginUser,saveUser,database,logoutUser } = require("./firebase");

const app=express();
const port=8080;

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(express.urlencoded({extended:true}));
app.use(express.json());

app.listen(port,()=>{
    console.log("server started");
})

app.use(express.static(path.join(__dirname,"public")))

app.get("/",(req,res)=>{
    res.redirect("/home");
})

app.get("/home",(req,res)=>{
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
})

app.get("/login",(req,res)=>{
    res.sendFile(path.join(__dirname, 'public', 'Login.html'));
})

app.get("/signup",(req,res)=>{
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
})

app.post("/signup",async (req,res)=>{
    console.log(req.body);
    const {email,password}=req.body;
    const result = await signupUser(email, password);

    if(result.success){
        const saveResult = await saveUser(req.body, result.user.uid); 
        res.send("successful signup");
    } else {
        res.status(400).send(result.message);
    }
})

app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    const result = await loginUser(email, password);

    if (!result.success) {
        return res.status(404).send(result.message);
    }

    try {
        const uid = result.user.uid; // Get UID from auth result
        
        // Check in mentors using UID
        let snapshot = await database.ref(`mentors/${uid}`).once("value");
        if (snapshot.exists()) {
            return res.redirect(`/mentor-profile/${uid}`);
        }

        // Check in mentees using UID
        snapshot = await database.ref(`mentees/${uid}`).once("value");
        if (snapshot.exists()) {
            return res.redirect(`/mentee-profile/${uid}`);
        }

        res.status(404).send("User type not found!");
    } catch (error) {
        console.error("Error fetching user type:", error);
        res.status(500).send("Server error");
    }
});

// Add GET routes for mentor profile
app.get("/mentor-profile/:id", async (req, res) => {
    try {
        const mentorId = req.params.id;
        const snapshot = await database.ref(`mentors/${mentorId}`).once("value");
        const userData = snapshot.val();
        
        if (userData) {
            res.render("mentor-profile", { user: userData, userId: mentorId });
        } else {
            res.status(404).send("Mentor not found!");
        }
    } catch (error) {
        console.error("Error fetching mentor:", error);
        res.status(500).send("Server error");
    }
});

// Add GET routes for mentee profile
app.get("/mentee-profile/:id", async (req, res) => {
    try {
        const menteeId = req.params.id;
        const snapshot = await database.ref(`mentees/${menteeId}`).once("value");
        const userData = snapshot.val();
        
        if (userData) {
            res.render("mentee-profile", { user: userData, userId: menteeId });
        } else {
            res.status(404).send("Mentee not found!");
        }
    } catch (error) {
        console.error("Error fetching mentee:", error);
        res.status(500).send("Server error");
    }
});



app.post("/logout",async(req,res)=>{
    const result =await logoutUser();
    if(result.success){
        res.redirect("/login");
    }else{
        res.status(500).send("logout falied"+result.message);
    }
})

//gemini api logic

const ai = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY});

async function generate(userMsg) {
  try{
        const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: userMsg,
        config: {
        systemInstruction: 'You are a Virtual Career Mentor.created by Mentorise.Your sole purpose is to provide guidance, advice, and insights related to career development. If the user asks about anything unrelated to careers (such as personal life, entertainment, politics, relationships, jokes, or general chit-chat), politely refuse and remind them that you only provide career guidance. Keep answers clear, structured, and practical, with actionable steps whenever possible.you can use emojies.Respond only in plain text. Do not use bold (**)',
        temperature:0.5
        },
    });
    console.log(response.candidates[0].content.parts[0].text);
    return response.candidates[0].content.parts[0].text;
  }catch(e){
    console.log(e);
  }
}

app.get("/ai",(req,res)=>{
    res.sendFile(path.join(__dirname,"public","ai-chat.html"));
})

app.post("/ai",async (req,res)=>{
    let {message}=req.body;
    console.log(message);
    const result=await generate(message);
    res.send({
        "result":result        
    })
})

//mentor directory
app.get("/mentor-directory", async (req, res) => {
  try {
    const snapshot = await database.ref("mentors").once("value");
    const mentorsData = snapshot.val();

    // Convert Firebase object → array
    const mentors = mentorsData
      ? Object.keys(mentorsData).map(id => ({ id, ...mentorsData[id] }))
      : [];

    res.render("mentor-directory", { mentors });
  } catch (error) {
    console.error("Error fetching mentors:", error.message);
    res.status(500).send("Error loading mentors");
  }
});
