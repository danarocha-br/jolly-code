// Snippets Actions
export { getSnippets } from './snippets/get-snippets'
export { getSnippetById } from './snippets/get-snippet-by-id'
export { createSnippet, type CreateSnippetInput } from './snippets/create-snippet'
export { updateSnippet, type UpdateSnippetInput } from './snippets/update-snippet'
export { deleteSnippet } from './snippets/delete-snippet'

// Collections Actions
export { getCollections } from './collections/get-collections'
export { getCollectionById } from './collections/get-collection-by-id'
export { createCollection, type CreateCollectionInput } from './collections/create-collection'
export { updateCollection, type UpdateCollectionInput } from './collections/update-collection'
export { deleteCollection } from './collections/delete-collection'

// Animations Actions
export { getAnimations } from './animations/get-animations'
export { getAnimationById } from './animations/get-animation-by-id'
export {
    createAnimation,
    type CreateAnimationInput,
} from './animations/create-animation'
export { updateAnimation, type UpdateAnimationInput } from './animations/update-animation'
export { deleteAnimation } from './animations/delete-animation'
export { getAnimationCollections } from './animations/get-collections'
export { getAnimationCollectionById } from './animations/get-collection-by-id'
export { createAnimationCollection, type CreateAnimationCollectionInput } from './animations/create-collection'
export { updateAnimationCollection, type UpdateAnimationCollectionInput } from './animations/update-collection'
export { deleteAnimationCollection } from './animations/delete-collection'

// Shared Types
export type { ActionResult } from './utils/action-result'
