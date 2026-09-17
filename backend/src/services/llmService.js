const OpenAI = require("openai").default || require("openai");

let openaiClient = null;

function getOpenAIClient() {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not configured");
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

/**
 * Builds the system prompt for the financial literacy bot.
 * Instructs the LLM to answer ONLY from the provided Creador content context.
 */
function buildSystemPrompt(contentDocs, lang = "en") {
  const langInstruction =
    lang === "hi"
      ? "Respond in simple Hindi (हिंदी). Use easy vocabulary suitable for rural women."
      : lang === "mr"
      ? "Respond in simple Marathi (मराठी)."
      : lang === "ta"
      ? "Respond in simple Tamil (தமிழ்)."
      : lang === "te"
      ? "Respond in simple Telugu (తెలుగు)."
      : lang === "bn"
      ? "Respond in simple Bengali (বাংলা)."
      : "Respond in clear, simple English. Avoid financial jargon.";

  const contextBlock = contentDocs
    .map(
      (doc, i) =>
        `--- Source ${i + 1}: "${doc.title}" (Category: ${doc.category}) ---\n${doc.body}`
    )
    .join("\n\n");

  return `You are Creador's Financial Literacy Assistant, helping low-income women in India understand personal finance, government schemes, loans, savings, and scam protection.

STRICT RULES:
1. Answer ONLY using the provided Creador content below. Do not invent facts.
2. If the content does not contain enough information to answer, say clearly: "I don't have enough information on this topic in my current knowledge base. Please explore our learning modules or consult a financial counselor."
3. Keep answers concise (3–5 sentences max) and practical.
4. ${langInstruction}
5. If recommending action, always end with a safety reminder (e.g., never share OTP, verify schemes on official portals).

=== CREADOR CONTENT LIBRARY (use only this) ===
${contextBlock}
=== END OF CONTENT ===

Now answer the user's question using only the above content.`;
}

/**
 * Calls OpenAI GPT to generate an answer from content context.
 * Returns the answer string.
 */
async function generateAnswerWithLLM(userQuery, contentDocs, lang = "en") {
  const client = getOpenAIClient();

  const systemPrompt = buildSystemPrompt(contentDocs, lang);

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userQuery },
    ],
    max_tokens: 400,
    temperature: 0.3, // Low temperature for factual, grounded answers
  });

  return completion.choices[0]?.message?.content?.trim() || "";
}

/**
 * Fallback answer when no API key is set or LLM call fails.
 * Returns a smart template-based answer from retrieved content.
 */
function generateFallbackAnswer(userQuery, contentDocs) {
  if (!contentDocs || contentDocs.length === 0) {
    return "I don't have enough information on this topic in my current knowledge base. Please explore our learning modules or consult a Creador financial counselor.";
  }

  const primary = contentDocs[0];
  const otherTitles = contentDocs
    .slice(1)
    .map((d) => `"${d.title}"`)
    .join(", ");

  let answer = `Based on Creador's verified resources on "${primary.title}": ${primary.body.slice(0, 300)}`;
  if (primary.body.length > 300) answer += "...";
  if (otherTitles) {
    answer += `\n\nYou may also find these resources helpful: ${otherTitles}.`;
  }

  return answer;
}

module.exports = { generateAnswerWithLLM, generateFallbackAnswer };
