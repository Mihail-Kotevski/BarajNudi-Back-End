import express from "express";
import "dotenv/config";
import mongoose from "mongoose";
import router from "./routes/postService.js";
import HandleUser from "./routes/handleUser.js";

const app = express();
const PORT = process.env.PORT;
const DB_URI = process.env.DB_CONNECT;

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "http://localhost:5173");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

//Middleware
app.use(express.json());

//Routers
app.use("/", router);
app.use("/user", HandleUser);

//MongoDB Connection
mongoose.connect(DB_URI, {});


//MongoDB Connection
const DBConnect = async () => {
  try {
    await mongoose.connect(DB_URI);
    console.log("Mongo DB is connected!");
  } catch (error) {
    console.log("Connection Error!", error.message);
    process.exit(1);
  }
};
DBConnect();

//Server Listening
app.listen(PORT, () => console.log("Server is running! on PORT:", PORT));
