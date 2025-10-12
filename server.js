const express=require("express");
const path=require("path");
const { signupUser,loginUser,saveUser } = require("./firebase");

const app=express();
const port=8080;

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
    if(result.success){
        res.send("sucessfully logged in");
    }else{
        res.status(404).send(result.message);
    }
})
