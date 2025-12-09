import { z, ZodError } from 'zod'

import { languages } from '@/lib/language-options'

const MAX_TITLE_LENGTH = 200
const MAX_CODE_BYTES = 100 * 1024 // 100KB
const scriptTagPattern = /<script\b[^>]*>[\s\S]*?<\/script>/gi

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

const stripDangerousContent = (value: string) => value.replace(scriptTagPattern, match => escapeHtml(match))

export const sanitizeTextInput = (value: string) =>
  stripDangerousContent(value)
    .replace(/<[^>]*>/g, '')
    .replace(/\0/g, '')
    .trim()

export const sanitizeCodeInput = (value: string) =>
  stripDangerousContent(value)
    .replace(/\0/g, '')

export const languageSchema = z
  .string()
  .min(1, 'Language is required')
  .refine(lang => Object.keys(languages).includes(lang), { message: 'Unsupported language' })

const codeSizeValidator = (code: string) => Buffer.byteLength(code, 'utf8') <= MAX_CODE_BYTES

export const codeSchema = z
  .string()
  .min(1, 'Code is required')
  .refine(codeSizeValidator, 'Code exceeds 100KB limit')
  .transform(sanitizeCodeInput)

const baseTitleSchema = z.string().max(MAX_TITLE_LENGTH, `Title must be ${MAX_TITLE_LENGTH} characters or less`)

export const titleSchema = baseTitleSchema
  .min(1, 'Title is required')
  .transform(sanitizeTextInput)

export const optionalTitleSchema = baseTitleSchema
  .transform(sanitizeTextInput)
  .optional()

export const optionalTitleToStringSchema = optionalTitleSchema.transform(value => value ?? 'Untitled')

export const idSchema = z.string().trim().min(1, 'ID is required')

export const urlSchema = z
  .string()
  .trim()
  .max(2048, 'URL is too long')
  .transform(value => value.replace(/\0/g, '')) // Only strip null bytes
  .optional()

export const animationSettingsSchema = z.object({
  fps: z.union([z.literal(24), z.literal(30), z.literal(60)]),
  resolution: z.enum(['720p', '1080p']),
  transitionType: z.enum(['fade', 'diff']),
  exportFormat: z.enum(['mp4', 'webm', 'gif']),
  quality: z.enum(['fast', 'balanced', 'high'])
})

export const animationSlideSchema = z.object({
  id: idSchema,
  code: codeSchema,
  title: optionalTitleToStringSchema,
  language: languageSchema,
  autoDetectLanguage: z.boolean().optional(),
  duration: z.number().positive('Duration must be positive')
})

export const createSnippetInputSchema = z.object({
  id: idSchema,
  title: optionalTitleSchema,
  code: codeSchema,
  language: languageSchema,
  url: urlSchema
})

export const updateSnippetInputSchema = z.object({
  id: idSchema,
  title: optionalTitleSchema,
  code: codeSchema.optional(),
  language: languageSchema.optional(),
  url: urlSchema
})

export const createAnimationInputSchema = z.object({
  id: idSchema,
  title: optionalTitleToStringSchema,
  slides: z.array(animationSlideSchema).min(2, 'At least one slide is required'),
  settings: animationSettingsSchema,
  url: urlSchema.nullish()
})

export const updateAnimationInputSchema = z.object({
  id: idSchema,
  title: optionalTitleSchema,
  slides: z.array(animationSlideSchema).optional(),
  settings: animationSettingsSchema.optional(),
  url: urlSchema.nullish()
})

export const formatZodError = (err: unknown) => {
  if (err instanceof ZodError) {
    return err.issues[0]?.message || 'Invalid input'
  }
  return null
}
