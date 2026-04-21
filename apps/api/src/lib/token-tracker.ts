// Pricing per 1M tokens (input / output) in USD — update as providers change
const PRICING: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-5':       { input: 3.0,  output: 15.0  },
  'claude-sonnet-4-6':       { input: 3.0,  output: 15.0  },
  'claude-opus-4-7':         { input: 15.0, output: 75.0  },
  'claude-haiku-4-5':        { input: 0.8,  output: 4.0   },
  'gpt-4o':                  { input: 2.5,  output: 10.0  },
  'gpt-4o-mini':             { input: 0.15, output: 0.6   },
  'llama3-70b-8192':         { input: 0.59, output: 0.79  }, // Groq
}

const DEFAULT_PRICING = { input: 3.0, output: 15.0 }

export function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = PRICING[model] ?? DEFAULT_PRICING
  const cost = (inputTokens / 1_000_000) * pricing.input +
               (outputTokens / 1_000_000) * pricing.output
  return Math.round(cost * 1_000_000) / 1_000_000 // round to 6 decimal places
}
