import "dotenv/config";
import cors from "cors";
import express from "express";
import { streamRoutes } from "./routes/stream.routes";

const app = express();
const port = Number(process.env.PORT ?? 8787);

app.use(cors());
app.use(express.json());

app.get("/api/health", (_request, response) => {
  response.json({ ok: true });
});

app.use("/api/stream", streamRoutes);

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[stream-api] listening on :${port}`);
});
