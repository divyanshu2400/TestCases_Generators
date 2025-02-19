import OpenAI from 'openai';
import { config } from 'dotenv';
import fs from 'fs';

config();

const openai = new OpenAI({
  apiKey: process.env.API_KEY as string,
  baseURL: 'https://integrate.api.nvidia.com/v1',
});

interface TestCase {
  testCaseTitle: string;
  steps: string[];
  expectedOutcome: string;
}

function loadCommandPrompt(): string | null {
  try {
    return fs.readFileSync('prompts.txt', 'utf8');
  } catch (error) {
    console.error("Error reading prompts.txt:", error);
    return null;
  }
}

// Function to extract JSON content from response
function extractJSON(text: string): string {
  const match = text.match(/\[.*\]/s);
  // const match = text.match(/\[([\s\S]*)\]/);
  return match ? match[0] : "[]";
}

async function generateTestCases(userStory: string): Promise<TestCase[]> {
  const commandPrompt: string | null = loadCommandPrompt();

  if (!commandPrompt) {
    console.error("No command prompt found. Please make sure 'prompts.txt' exists.");
    return [];
  }

  const finalPrompt = commandPrompt.replace("${userStory}", userStory);

  try {
    const completion = await openai.chat.completions.create({
      model: "meta/llama-3.2-3b-instruct",
      messages: [{ role: "user", content: finalPrompt }],
      temperature: 0.2,
      top_p: 0.7,
      max_tokens: 2048,
    });

    const rawResponse = completion.choices[0]?.message?.content || "[]";
    const jsonResponse = extractJSON(rawResponse);

    const testCases: TestCase[] = JSON.parse(jsonResponse);

    return testCases.slice(0, 20);
  } catch (error) {
    console.error("Error generating test cases:", error);
    return [];
  }
}

async function test(): Promise<void> {
  const userStory: string = "As a language learner, I want an offline mode in the language learning app, so I can continue learning without an internet connection.";
  const testCases = await generateTestCases(userStory);

  console.log("Generated Test Cases:");
  console.log(JSON.stringify(testCases, null, 2));

  fs.writeFileSync('test_cases.json', JSON.stringify(testCases, null, 2), { flag: 'w' });
}

test();
