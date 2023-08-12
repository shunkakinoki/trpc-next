import { createRootHooks, createReactQueryUtilsProxy, createReactProxyDecoration } from '@trpc/react-query/shared';
import { createFlatProxy } from '@trpc/server/shared';
import { useMemo } from 'react';
import { g as generateCacheTag } from '../shared-633af855.mjs';
import 'next/cache';

function experimental_createTRPCNextReactQuery(opts) {
    const hooks = createRootHooks(opts);
    return createFlatProxy((key)=>{
        if (key === 'useContext') {
            return ()=>{
                const context = hooks.useContext();
                // create a stable reference of the utils context
                return useMemo(()=>{
                    return createReactQueryUtilsProxy(context, {
                        invalidate: async (args)=>{
                            const cacheTag = generateCacheTag(args.path.join('.'), args.input);
                            await fetch('/api/trpc/revalidate', {
                                method: 'POST',
                                cache: 'no-store',
                                body: JSON.stringify({
                                    cacheTag
                                })
                            });
                        }
                    });
                }, [
                    context
                ]);
            };
        }
        if (hooks.hasOwnProperty(key)) {
            return hooks[key];
        }
        if (key === 'useQueries') {
            return hooks.useQueries;
        }
        return createReactProxyDecoration(key, hooks);
    });
}

export { experimental_createTRPCNextReactQuery };
