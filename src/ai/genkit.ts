import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

const apiKey = process.env.GOOGLE_GENAI_API_KEY ?? process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY;

export const ai = genkit({
  plugins: [googleAI({ apiKey })],
  model: 'googleai/gemini-2.0-flash',
});
