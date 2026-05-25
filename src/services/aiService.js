import { GoogleGenerativeAI } from "@google/generative-ai";

const getGeminiKey = () => {
  return process.env.REACT_APP_GEMINI_KEY || "";
};

/**
 * Request a short, encouraging hint from Google Gemini API based on problem & code text.
 */
export const getGhostHint = async (problemTitle, codeText, errorMsg = "", requestMore = false) => {
  const apiKey = getGeminiKey();
  
  if (!apiKey) {
    console.warn("REACT_APP_GEMINI_KEY not found in environment. Providing smart offline fallback hint.");
    const offlineHints = [
      "Stuck? Try writing out the transition relation first, then ensure your variables decrement toward a base case.",
      "Consider using a frequency map or a fast-pointer slow-pointer combination to optimize execution bounds.",
      "Double check if your loop index goes out of bounds at high or low limits. Verify the boundary condition comparisons.",
      "Are you repeating subproblem calculations? Adding a cache map or 1D array might optimize your runtime to linear time!"
    ];
    return offlineHints[Math.floor(Math.random() * offlineHints.length)];
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    let prompt = `You are a helpful coding mentor. The student is solving the problem "${problemTitle}". 
Their current code is:
\`\`\`
${codeText}
\`\`\`
${errorMsg ? `They encountered the following compile/runtime error: "${errorMsg}"` : ''}

They seem stuck. Give ONE short hint (max 2 sentences) that nudges them in the right direction without revealing the solution. Be encouraging.`;

    if (requestMore) {
      prompt += " Since they explicitly requested an advanced hint, make this one slightly more specific about potential helper functions or state variables, but DO NOT provide full code solutions.";
    }

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return text.trim();
  } catch (error) {
    console.error("Error generating hint from Gemini API:", error);
    return "Consider dividing the problem into smaller sub-problems. Verify if your pointers are incrementing correctly on every loop branch!";
  }
};

/**
 * Executes a raw prompt against Gemini.
 */
export const generateGeminiContent = async (prompt) => {
  const apiKey = getGeminiKey();
  if (!apiKey) return null;
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (err) {
    console.error("Gemini general content generation error:", err);
    return null;
  }
};

/**
 * Executes a prompt with base64 image data against Gemini Vision.
 */
export const generateGeminiVisionContent = async (prompt, base64Image) => {
  const apiKey = getGeminiKey();
  if (!apiKey) {
    console.warn("REACT_APP_GEMINI_KEY not found in environment for Vision. Providing smart offline fallback.");
    return null;
  }
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // strip standard data url prefix if present
    const base64Data = base64Image.includes(",") ? base64Image.split(",")[1] : base64Image;

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: "image/png"
      }
    };

    const result = await model.generateContent([prompt, imagePart]);
    return result.response.text().trim();
  } catch (err) {
    console.error("Gemini Vision content generation error:", err);
    return null;
  }
};
