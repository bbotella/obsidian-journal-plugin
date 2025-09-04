export interface JournalPluginSettings {
  sourceFolder: string;
  dateFormat: string;
  destinationFolder: string;
  journalFileNameFormat: string;
  aiProvider: 'gemini' | 'openai' | 'ollama';
  aiConfig: {
    apiKey?: string;
    endpoint?: string;
    model: string;
  };
  outputLanguage: string;
  checkFrequency: number; // in minutes
  customPrompt: string;
}

export const DEFAULT_SETTINGS: JournalPluginSettings = {
  sourceFolder: 'Daily Notes',
  dateFormat: 'YYYY-MM-DD',
  destinationFolder: 'Journal',
  journalFileNameFormat: 'Journal-YYYY-MM-DD.md',
  aiProvider: 'openai',
  aiConfig: {
    apiKey: '',
    endpoint: '',
    model: 'gpt-3.5-turbo'
  },
  outputLanguage: 'auto',
  checkFrequency: 60,
  customPrompt: `Transform these raw daily log entries into a well-written, engaging journal entry.

Guidelines:
- Write in a candid, personal style with storytelling elements
- Maintain chronological flow of the day's events
- Include emotional context and personal reflections
- Preserve the original language and tone
- Create engaging prose that captures the day's essence
- Keep the same perspective (first person)
- Make it feel authentic and re-readable in the future

SENTIMENT ANALYSIS:
- Analyze the overall emotional tone of the day based on the entries
- Consider the context, activities, and expressed emotions
- Determine the dominant sentiment from: Very Happy, Happy, Neutral, Sad, Very Sad

IMPORTANT OUTPUT REQUIREMENTS:
- Return ONLY the journal entry content followed by the sentiment analysis
- Format the sentiment as: SENTIMENT: [one of: Very Happy, Happy, Neutral, Sad, Very Sad]
- Place the SENTIMENT line at the very end, after the journal content
- Do NOT include any introductions, explanations, or meta-commentary
- Do NOT start with phrases like "Here's today's journal" or "Aquí va el diario"
- Do NOT add closing remarks or signatures beyond the sentiment line
- Start directly with the journal content

Raw entries:
{content}

Create the journal entry now (content only, no introductions):`
};

export interface Coordinate {
  lat: number;
  lng: number;
  raw?: string;
}

export interface DailyNoteEntry {
  content: string;
  coordinates?: Coordinate;
}

export interface DailyNote {
  file: string;
  date: string;
  entries: DailyNoteEntry[];
  coordinates: Coordinate[];
}

export interface JournalEntry {
  title: string;
  content: string;
  date: string;
  coordinates: Coordinate[];
  sourceFile: string;
  sentiment?: Sentiment;
}

export type AIProvider = 'gemini' | 'openai' | 'ollama';

export type Sentiment = 'Very Happy' | 'Happy' | 'Neutral' | 'Sad' | 'Very Sad';