import express from "express";
import dotenv from "dotenv";
import router from "./routes/routes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json()); // Enable JSON body parsing
app.use("/api", router); // Attach routes with `/api` prefix

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
