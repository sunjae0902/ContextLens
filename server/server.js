import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import OpenAI from "openai";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.API_KEY, // Groq API 키 확인 필요
  baseURL: "https://api.groq.com/openai/v1",
});

// 사용자 친화적인 한국어 에러 메시지 매핑
const getUserFriendlyError = (
  err,
  defaultMsg = "서버 오류가 발생했습니다."
) => {
  const status = err.status || err.code;

  const errorMessages = {
    400: "요청 형식이 잘못되었습니다. 다시 시도해주세요.",
    401: "API 키가 유효하지 않습니다. 환경변수(API_KEY)를 확인해주세요.",
    403: "API 키 권한이 없습니다. 새 키를 발급받으세요.",
    404: "요청하는 내용을 찾을 수 없습니다. 서버가 실행 중인지 확인해주세요.",
    413: "요청 데이터가 너무 큽니다. 문장을 줄여보세요.",
    422: "요청 매개변수가 잘못되었습니다. 올바른 형식으로 요청하세요.",
    429: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
    500: "서버 내부 오류입니다. 잠시 후 다시 시도해주세요.",
    502: "서버 연결 오류입니다. 네트워크를 확인하세요.",
    503: "서버가 과부하 상태입니다. 잠시 후 다시 시도해주세요.",
  };

  return errorMessages[status] || defaultMsg;
};

app.post("/explain", async (req, res) => {
  const { word, sentence } = req.body;

  // 입력 검증
  if (!word || !sentence) {
    return res.status(400).json({
      error: "word와 sentence가 모두 필요합니다.",
      code: "MISSING_INPUT",
    });
  }

  if (word.trim().length === 0 || sentence.trim().length === 0) {
    return res.status(400).json({
      error: "word와 sentence는 빈 값이 될 수 없습니다.",
      code: "EMPTY_INPUT",
    });
  }

  if (word.length > 50 || sentence.length > 1000) {
    return res.status(400).json({
      error: "word는 50자, sentence는 1000자를 초과할 수 없습니다.",
      code: "INPUT_TOO_LONG",
    });
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
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 100,
      temperature: 0.1,
    });

    const text = response.choices[0].message.content?.trim();

    if (!text || text === "설명을 가져오지 못했습니다.") {
      return res.status(500).json({
        error: "AI 응답을 받지 못했습니다. 다시 시도해주세요.",
        code: "NO_AI_RESPONSE",
      });
    }

    res.json({
      explanation: text,
      success: true,
    });
  } catch (err) {
    console.error("🛑 Groq API 오류:", {
      message: err.message,
      status: err.status,
      code: err.code,
      body: err.response?.data,
    });

    // Groq API 에러 처리
    if (err.status || err.code) {
      const status = err.status || err.code;
      const userError = getUserFriendlyError(err);

      // Rate Limit (429) 특별 처리
      if (status === 429) {
        const retryAfter = err.response?.headers?.["retry-after"] || 60;
        return res.status(429).json({
          error: userError,
          code: "RATE_LIMIT",
          retryAfter: parseInt(retryAfter),
          retryIn: `${retryAfter}초 후 재시도`,
        });
      }

      return res.status(status).json({
        error: userError,
        code: `GROQ_${status}`,
        ...(process.env.NODE_ENV === "development" && {
          detail: err.message,
        }),
      });
    }

    // 네트워크 오류 등 기타 오류
    res.status(500).json({
      error:
        "네트워크 연결 오류입니다. 인터넷 연결을 확인하고 다시 시도해주세요.",
      code: "NETWORK_ERROR",
    });
  }
});

// 헬스체크 엔드포인트 추가
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    apiKeySet: !!process.env.API_KEY,
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ 서버가 포트 ${PORT}에서 실행 중입니다`);
  console.log(`🔑 API_KEY 설정됨: ${!!process.env.API_KEY}`);
});
