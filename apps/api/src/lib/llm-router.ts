import { generateText, streamText, stepCountIs, type LanguageModel } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { openai } from '@ai-sdk/openai'
import { calculateCost } from './token-tracker.js'

export interface LLMResult {
  text: string
  usage: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
    costUsd: number
  }
}

export interface GenerateOptions {
  system?: string
  maxOutputTokens?: number
  temperature?: number
  tools?: Record<string, unknown>
  maxToolSteps?: number
}

export interface StreamChunk {
  type: 'delta' | 'done'
  text?: string
  result?: LLMResult
}

function resolveModel(modelId: string): LanguageModel {
  if (modelId.startsWith('claude-')) return anthropic(modelId)
  if (modelId.startsWith('gpt-') || modelId.startsWith('o1') || modelId.startsWith('o3')) return openai(modelId)
  // default fallback
  return anthropic('claude-sonnet-4-5')
}

export async function generate(
  modelId: string,
  prompt: string,
  options: GenerateOptions = {},
): Promise<LLMResult> {
  const { text, usage } = await generateText({
    model: resolveModel(modelId),
    prompt,
    system: options.system,
    maxOutputTokens: options.maxOutputTokens,
    temperature: options.temperature,
    ...(options.tools && {
      tools: options.tools as never,
      stopWhen: stepCountIs(options.maxToolSteps ?? 5) as never,
    }),
  })

  const inputTokens = usage.inputTokens ?? 0
  const outputTokens = usage.outputTokens ?? 0
  return {
    text,
    usage: {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      costUsd: calculateCost(modelId, inputTokens, outputTokens),
    },
  }
}

export async function* stream(
  modelId: string,
  prompt: string,
  options: GenerateOptions = {},
): AsyncGenerator<StreamChunk> {
  const { textStream, usage } = await streamText({
    model: resolveModel(modelId),
    prompt,
    system: options.system,
    maxOutputTokens: options.maxOutputTokens,
    temperature: options.temperature,
  })

  let fullText = ''
  for await (const delta of textStream) {
    fullText += delta
    yield { type: 'delta', text: delta }
  }

  const { inputTokens = 0, outputTokens = 0 } = await usage
  yield {
    type: 'done',
    result: {
      text: fullText,
      usage: {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        costUsd: calculateCost(modelId, inputTokens, outputTokens),
      },
    },
  }
}
