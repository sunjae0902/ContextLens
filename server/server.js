import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY }); // ✅ apiKey 명시

app.use(cors());
app.use(express.json());

app.post("/explain", async (req, res) => {
  const { word, sentence } = req.body;

  if (!word || !sentence) {
    return res.status(400).json({ error: "word and sentence are required" });
  }

  const prompt = `
Explain the meaning of the word "${word}" in the sentence below.

Sentence:
${sentence}

Explain briefly in Korean in one sentence.
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: prompt,
    });

    const text = response.text ?? "설명을 가져오지 못했습니다.";
    res.json({ explanation: text });
  } catch (err) {
    console.error("Gemini error:", err.message);
    res.status(500).json({ error: err.message }); // ✅ 에러 메시지 노출
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
