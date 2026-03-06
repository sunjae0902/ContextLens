import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import OpenAI from "openai";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

app.post("/explain", async (req, res) => {
  const { word, sentence } = req.body;

  if (!word || !sentence) {
    return res.status(400).json({ error: "word and sentence are required" });
  }

const prompt = `Given a sentence and a target word, explain the meaning of the word as it is used in that sentence.

Rules:
- Explain in Korean in one sentence, ending with "~니다"
- Korean only, no English, no Chinese characters, no special characters, no bullet points
- Use context from the sentence to determine the correct meaning
- If the context is unclear or insufficient, provide the most common/universal meaning
- Do NOT mention the word "${word}" in the output
- Do NOT use phrases like "이 단어는", "그 단어는", "해당 단어는"
- Start directly with the meaning explanation

Sentence: ${sentence}
Target word: ${word}

Output:`;

  try {
    const response = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile", // 모델명
      messages: [{ role: "user", content: prompt }],
      max_tokens: 100,
      temperature: 0.1,
    });

    const text =
      response.choices[0].message.content?.trim() ??
      "설명을 가져오지 못했습니다.";
    res.json({ explanation: text });
  } catch (err) {
    console.error("API server error:", err.message);

    if (err.status === 429) {
      return res.status(429).json({
        error: "요청 제한 초과. 잠시 후 다시 시도해주세요.",
        retryAfter: 60,
      });
    }

    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => {
  console.log("✅ OpenRouter Server running on port 3000");
});
