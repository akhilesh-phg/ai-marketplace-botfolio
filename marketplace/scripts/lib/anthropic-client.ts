export type AnthropicMessage = { role: 'user'; content: string };

export type AnthropicClient = {
  complete(messages: AnthropicMessage[]): Promise<string>;
};

export function createAnthropicClient(apiKey: string, model: string): AnthropicClient {
  return {
    async complete(messages: AnthropicMessage[]): Promise<string> {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: 4096,
          messages,
        }),
      });
      if (!response.ok) {
        throw new Error(`Anthropic request failed: ${response.status} ${await response.text()}`);
      }
      const json = (await response.json()) as {
        content?: Array<{ type?: string; text?: string }>;
      };
      const textBlock = json.content?.find((block) => block.type === 'text');
      return textBlock?.text ?? '';
    },
  };
}
