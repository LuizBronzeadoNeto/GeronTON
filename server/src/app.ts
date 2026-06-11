import "dotenv/config";
import express from "express";
import loginRouter from "./routes/login.js";
import carersRouter from "./routes/carers.js"
import professionalRouter from "./routes/professionals.js"

const app = express();

app.use(express.json());

app.get("/", (_req, res) => {
  res.send("Hello World");
});

app.use(loginRouter);
app.use("/cuidadores", carersRouter);
app.use("/profissionais", professionalRouter);
export default app;
