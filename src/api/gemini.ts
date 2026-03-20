import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai";

export interface CandidateResult {
  candidate: string;
  score: number;
  strengths: string[];
  gaps: string[];
  recommendation: 'Strong Fit' | 'Moderate Fit' | 'Not Fit';
}

// Define the expected output schema to enforce structured JSON output natively
const responseSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    score: {
      type: SchemaType.NUMBER,
      description: "Match score between 0 and 100",
    },
    strengths: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.STRING,
      },
      description: "2-3 key strengths of the candidate based on the JD",
    },
    gaps: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.STRING,
      },
      description: "2-3 key gaps or missing skills based on the JD",
    },
    recommendation: {
      type: SchemaType.STRING,
      description: "Overall recommendation. Must be one of: 'Strong Fit', 'Moderate Fit', or 'Not Fit'",
    },
  },
  required: ["score", "strengths", "gaps", "recommendation"],
};

export async function analyzeResume(
  apiKey: string,
  jobDescription: string,
  resumeText: string
): Promise<CandidateResult> {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // We use gemini-2.5-flash as it is fast and recommended for general text tasks
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      }
    });

    const prompt = `
You are an expert AI technical recruiter.
Compare the following resume with the job description.

Job Description:
${jobDescription}

Resume:
${resumeText}

Analyze carefully and return a structured assessment.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    const parsed = JSON.parse(text);
    return parsed as CandidateResult;
    
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return {
      candidate: "Error",
      score: 0,
      strengths: [`API Error occurred.`],
      gaps: [error.message || "Unknown Error"],
      recommendation: "Not Fit"
    };
  }
}
