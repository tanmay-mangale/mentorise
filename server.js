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
        const result = await saveUser(req.body);
        res.send("successful signup");
    } else {
        res.status(400).send(result.message);
    }
})

app.post("/login",async(req,res)=>{
    //console.log(req.body);
    const {email,password}=req.body;
    const result=await loginUser(email,password);

    if (!result.success) {
        return res.status(404).send(result.message);
    }

    try {
        let userTypeFound = null;
        let userData = null;

        // Check in mentors
        const mentorsSnapshot = await database.ref("mentors").once("value");
        mentorsSnapshot.forEach((child) => {
            if (child.val().email === email) {
                userTypeFound = "mentor";
                userData = child.val();
            }
        });

        // Check in mentees if not found in mentors
        if (!userTypeFound) {
        const menteesSnapshot = await database.ref("mentees").once("value");
        menteesSnapshot.forEach((child) => {
            if (child.val().email === email) {
            userTypeFound = "mentee";
            userData = child.val();
            }
        });
        }

        if (userTypeFound === "mentor") {
            res.render("mentor-profile", { user: userData });
        } else if (userTypeFound === "mentee") {
            res.render("mentee-profile", { user: userData });
        } else {
            res.status(404).send("User type not found!");
        }
    } catch (error) {
        console.error("Error fetching user type:", error);
        res.status(500).send("Server error");
    }
})

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
