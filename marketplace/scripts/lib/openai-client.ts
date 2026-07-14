export type ChatMessage = { role: 'system' | 'user'; content: string };

export type OpenAIClient = {
  complete(messages: ChatMessage[]): Promise<string>;
};

export function createOpenAIClient(apiKey: string, model: string): OpenAIClient {
  return {
    async complete(messages: ChatMessage[]): Promise<string> {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0,
        }),
      });
      if (!response.ok) {
        throw new Error(`OpenAI request failed: ${response.status} ${await response.text()}`);
      }
      const json = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      return json.choices?.[0]?.message?.content ?? '';
    },
  };
}
