'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var client = require('@trpc/client');
var server = require('@trpc/server');
var observable = require('@trpc/server/observable');
var cache = require('next/cache');
var shared = require('../../shared-1dc3e2ac.js');
require('@trpc/server/shared');

// import "server-only";
// ts-prune-ignore-next
function experimental_nextCacheLink(opts) {
    return (runtime)=>({ op  })=>observable.observable((observer)=>{
                const { path , input , type , context  } = op;
                const cacheTag = shared.generateCacheTag(path, input);
                // Let per-request revalidate override global revalidate
                const requestRevalidate = typeof context.revalidate === 'number' || context.revalidate === false ? context.revalidate : undefined;
                const revalidate = requestRevalidate ?? opts.revalidate ?? false;
                const promise = opts.createContext().then(async (ctx)=>{
                    const callProc = async (_cachebuster)=>{
                        //   // _cachebuster is not used by us but to make sure
                        //   // that calls with different tags are properly separated
                        //   // @link https://github.com/trpc/trpc/issues/4622
                        const procedureResult = await server.callProcedure({
                            procedures: opts.router._def.procedures,
                            path,
                            rawInput: input,
                            ctx: ctx,
                            type
                        });
                        // We need to serialize cause the cache only accepts JSON
                        return runtime.transformer.serialize(procedureResult);
                    };
                    if (type === 'query') {
                        return cache.unstable_cache(callProc, path.split('.'), {
                            revalidate,
                            tags: [
                                cacheTag
                            ]
                        })(cacheTag);
                    }
                    return callProc();
                }).catch((cause)=>{
                    observer.error(client.TRPCClientError.from(cause));
                });
                promise.then((data)=>{
                    const transformedResult = runtime.transformer.deserialize(data);
                    observer.next({
                        result: {
                            data: transformedResult
                        }
                    });
                    observer.complete();
                }).catch((cause)=>{
                    observer.error(client.TRPCClientError.from(cause));
                });
            });
}

exports.experimental_nextCacheLink = experimental_nextCacheLink;
