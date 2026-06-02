import express from "express";
import loginRouter from "./routes/login.js";

const app = express();

app.use(express.json());

app.get("/", (_req, res) => {
  res.send("Hello World");
});

app.use(loginRouter);

export default app;
