'use server'

import { revalidatePath } from 'next/cache'

import { success, error, type ActionResult } from '@/actions/utils/action-result'
import { updateAnimation as updateAnimationDb } from '@/lib/services/database/animations'
import type { Animation } from '@/features/animations/dtos'
import type { AnimationSettings, AnimationSlide } from '@/types/animation'
import { checkSlideLimit } from '@/lib/services/usage-limits'
import type { PlanId } from '@/lib/config/plans'
import { formatZodError, updateAnimationInputSchema } from '@/actions/utils/validation'
import { withAuthAction } from '@/actions/utils/with-auth'

export type UpdateAnimationInput = {
	id: string
	title?: string
	slides?: AnimationSlide[]
	settings?: AnimationSettings
	url?: string | null
}

export async function updateAnimation(
	input: UpdateAnimationInput
): Promise<ActionResult<Animation>> {
	try {
		const parsedInput = updateAnimationInputSchema.safeParse(input)

		if (!parsedInput.success) {
			return error(formatZodError(parsedInput.error) ?? 'Invalid animation data')
		}

		const payload = parsedInput.data

		return withAuthAction(payload, async ({ id, title, slides, settings, url }, { user, supabase }) => {
			const { data: profile } = await supabase
				.from('profiles')
				.select('plan')
				.eq('id', user.id)
				.single()

			const plan = (profile?.plan as PlanId | null) ?? 'free'

			if (slides && slides.length > 0) {
				const slideLimit = checkSlideLimit(slides.length, plan)
				if (!slideLimit.canSave) {
					return error(`Your plan allows up to ${slideLimit.max} slides per animation. Upgrade to Pro for unlimited slides!`)
				}
			}

			const data = await updateAnimationDb({
				id,
				user_id: user.id,
				title,
				slides,
				settings,
				url,
				supabase
			})

			if (!data || data.length === 0) {
				return error('Failed to update animation')
			}

			revalidatePath('/animate')
			revalidatePath('/animations')

			return success(data[0] as Animation)
		})
	} catch (err) {
		console.error('Error updating animation:', err)

		return error('Failed to update animation. Please try again later.')
	}
}
