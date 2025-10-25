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
//mentor directory
app.get("/mentor-directory", async (req, res) => {
  try {
    const menteeId = req.query.menteeId || ''; // Get from query (?menteeId=xxx)
    const snapshot = await database.ref("mentors").once("value");
    const mentorsData = snapshot.val();

    const mentors = mentorsData
      ? Object.keys(mentorsData).map(id => ({ id, ...mentorsData[id] }))
      : [];

    res.render("mentor-directory", { mentors, menteeId }); // Pass menteeId to template
  } catch (error) {
    console.error("Error fetching mentors:", error.message);
    res.status(500).send("Error loading mentors");
  }
});

//booking
// Add these routes to your server.js file (after your existing routes)

// ============= SESSION BOOKING ROUTES =============

// 1. Book a session - mentee sends request to mentor
app.post("/book-session", async (req, res) => {
    try {
        const { mentorId, menteeId, date, time, message } = req.body;
        
        // Fetch mentor details using UID
        const mentorSnapshot = await database.ref(`mentors/${mentorId}`).once("value");
        const mentorData = mentorSnapshot.val();
        
        // Fetch mentee details using UID
        const menteeSnapshot = await database.ref(`mentees/${menteeId}`).once("value");
        const menteeData = menteeSnapshot.val();

        if (!mentorData || !menteeData) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const sessionData = {
            mentorId,
            menteeId,
            mentorName: `${mentorData.firstName} ${mentorData.lastName}`,
            menteeName: `${menteeData.firstName} ${menteeData.lastName}`,
            date,
            time,
            message: message || "",
            status: "pending", // pending, accepted, rejected
            meetLink: "",
            createdAt: new Date().toISOString()
        };

        // Save to Firebase with auto-generated ID
        const sessionRef = database.ref("sessions").push();
        await sessionRef.set(sessionData);

        res.json({ 
            success: true, 
            message: "Session request sent successfully!", 
            sessionId: sessionRef.key 
        });
    } catch (error) {
        console.error("Error booking session:", error);
        res.status(500).json({ success: false, message: "Failed to book session" });
    }
});

// 2. Get sessions for a mentor (to see incoming requests)
app.get("/mentor-sessions/:mentorId", async (req, res) => {
    try {
        const mentorId = req.params.mentorId;
        const snapshot = await database.ref("sessions")
            .orderByChild("mentorId")
            .equalTo(mentorId)
            .once("value");
        
        const sessions = [];
        snapshot.forEach((child) => {
            sessions.push({ id: child.key, ...child.val() });
        });

        res.json({ success: true, sessions });
    } catch (error) {
        console.error("Error fetching mentor sessions:", error);
        res.status(500).json({ success: false, message: "Failed to fetch sessions" });
    }
});

// 3. Get sessions for a mentee (to see their requests)
app.get("/mentee-sessions/:menteeId", async (req, res) => {
    try {
        const menteeId = req.params.menteeId;
        const snapshot = await database.ref("sessions")
            .orderByChild("menteeId")
            .equalTo(menteeId)
            .once("value");
        
        const sessions = [];
        snapshot.forEach((child) => {
            sessions.push({ id: child.key, ...child.val() });
        });

        res.json({ success: true, sessions });
    } catch (error) {
        console.error("Error fetching mentee sessions:", error);
        res.status(500).json({ success: false, message: "Failed to fetch sessions" });
    }
});

// 4. Accept or Reject session (mentor action)
app.post("/update-session", async (req, res) => {
    try {
        const { sessionId, status, meetLink } = req.body;

        const updateData = { status };
        
        if (status === "accepted" && meetLink) {
            updateData.meetLink = meetLink;
            updateData.acceptedAt = new Date().toISOString();
        } else if (status === "rejected") {
            updateData.rejectedAt = new Date().toISOString();
        }

        await database.ref(`sessions/${sessionId}`).update(updateData);

        res.json({ success: true, message: `Session ${status} successfully!` });
    } catch (error) {
        console.error("Error updating session:", error);
        res.status(500).json({ success: false, message: "Failed to update session" });
    }
});

// My Bookings page for mentee
app.get("/my-bookings/:menteeId", async (req, res) => {
    try {
        const menteeId = req.params.menteeId;
        const snapshot = await database.ref(`mentees/${menteeId}`).once("value");
        const userData = snapshot.val();
        
        if (userData) {
            res.render("my-bookings", { menteeId });
        } else {
            res.status(404).send("Mentee not found!");
        }
    } catch (error) {
        console.error("Error:", error);
        res.status(500).send("Server error");
    }
});