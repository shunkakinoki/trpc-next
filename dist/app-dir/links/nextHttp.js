'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var client = require('@trpc/client');
var shared = require('../../shared-1dc3e2ac.js');
require('@trpc/server/shared');
require('next/cache');

// ts-prune-ignore-next
function experimental_nextHttpLink(opts) {
    return (runtime)=>{
        return (ctx)=>{
            const { path , input , context  } = ctx.op;
            const cacheTag = shared.generateCacheTag(path, input);
            // Let per-request revalidate override global revalidate
            const requestRevalidate = typeof context.revalidate === 'number' || context.revalidate === false ? context.revalidate : undefined;
            const revalidate = requestRevalidate ?? opts.revalidate ?? false;
            const linkFactory = opts.batch ? opts.unstable_stream ? client.unstable_httpBatchStreamLink : client.httpBatchLink : client.httpLink;
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

exports.experimental_nextHttpLink = experimental_nextHttpLink;
