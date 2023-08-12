import '@trpc/server/shared';
import { revalidateTag } from 'next/cache';

/**
 * @internal
 */
function generateCacheTag(procedurePath, input) {
    return input
        ? `${procedurePath}?input=${JSON.stringify(input)}`
        : procedurePath;
}
/**
 * @internal
 */
function decomposeCacheTag(cacheTag) {
    const [procedurePath, input] = cacheTag.split('?input=');
    return {
        procedurePath,
        input: input ? JSON.parse(input) : undefined,
    };
}
/**
 * @internal
 */
function fuzzyRevalidation(cacheKey, seenTags) {
    const { input, procedurePath } = decomposeCacheTag(cacheKey);
    // console.log('fuzzyRevalidation', cacheKey, seenTags);
    if (!procedurePath) {
        // no procedure path, revalidate all
        for (const key of seenTags) {
            // console.log('revalidating', key);
            revalidateTag(key);
        }
        return;
    }
    if (input) {
        // if there is input, no need to fuzzy match, just revalidate the exact key
        // console.log('revalidating', cacheKey);
        revalidateTag(cacheKey);
        return;
    }
    for (const key of seenTags) {
        if (key.startsWith(procedurePath)) {
            // console.log('revalidating', key);
            revalidateTag(key);
        }
    }
}
function isFormData(value) {
    if (typeof FormData === 'undefined') {
        // FormData is not supported
        return false;
    }
    return value instanceof FormData;
}

export { fuzzyRevalidation as f, generateCacheTag as g, isFormData as i };
