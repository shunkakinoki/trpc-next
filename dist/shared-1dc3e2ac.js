'use strict';

require('@trpc/server/shared');
var cache = require('next/cache');

/**
 * @internal
 */ function generateCacheTag(procedurePath, input) {
    return input ? `${procedurePath}?input=${JSON.stringify(input)}` : procedurePath;
}
/**
 * @internal
 */ function decomposeCacheTag(cacheTag) {
    const [procedurePath, input] = cacheTag.split('?input=');
    return {
        procedurePath,
        input: input ? JSON.parse(input) : undefined
    };
}
/**
 * @internal
 */ function fuzzyRevalidation(cacheKey, seenTags) {
    const { input , procedurePath  } = decomposeCacheTag(cacheKey);
    // console.log('fuzzyRevalidation', cacheKey, seenTags);
    if (!procedurePath) {
        // no procedure path, revalidate all
        for (const key of seenTags){
            // console.log('revalidating', key);
            cache.revalidateTag(key);
        }
        return;
    }
    if (input) {
        // if there is input, no need to fuzzy match, just revalidate the exact key
        // console.log('revalidating', cacheKey);
        cache.revalidateTag(cacheKey);
        return;
    }
    for (const key1 of seenTags){
        if (key1.startsWith(procedurePath)) {
            // console.log('revalidating', key);
            cache.revalidateTag(key1);
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

exports.fuzzyRevalidation = fuzzyRevalidation;
exports.generateCacheTag = generateCacheTag;
exports.isFormData = isFormData;
