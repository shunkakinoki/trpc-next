import { unstable_httpBatchStreamLink, httpBatchLink, httpLink } from '@trpc/client';
import { g as generateCacheTag } from '../../shared-633af855.mjs';
import '@trpc/server/shared';
import 'next/cache';

// ts-prune-ignore-next
function experimental_nextHttpLink(opts) {
    return (runtime)=>{
        return (ctx)=>{
            const { path , input , context  } = ctx.op;
            const cacheTag = generateCacheTag(path, input);
            // Let per-request revalidate override global revalidate
            const requestRevalidate = typeof context.revalidate === 'number' || context.revalidate === false ? context.revalidate : undefined;
            const revalidate = requestRevalidate ?? opts.revalidate ?? false;
            const linkFactory = opts.batch ? opts.unstable_stream ? unstable_httpBatchStreamLink : httpBatchLink : httpLink;
            const link = linkFactory({
                headers: opts.headers,
                url: opts.url,
                fetch: (url, fetchOpts)=>{
                    return fetch(url, {
                        ...fetchOpts,
                        // cache: 'no-cache',
                        next: {
                            revalidate,
                            tags: [
                                cacheTag
                            ]
                        }
                    });
                }
            })(runtime);
            return link(ctx);
        };
    };
}

export { experimental_nextHttpLink };
