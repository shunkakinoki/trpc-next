'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var client = require('@trpc/client');
var server = require('@trpc/server');
var shared = require('@trpc/server/shared');
var cache = require('next/cache');
var React = require('react');
var shared$1 = require('../shared-1dc3e2ac.js');

/* eslint-disable @typescript-eslint/no-non-null-assertion */ function set(obj, path, value) {
    if (typeof path === 'string') {
        path = path.split(/[\.\[\]]/).filter(Boolean);
    }
    if (path.length > 1) {
        const p = path.shift();
        const isArrayIndex = /^\d+$/.test(path[0]);
        obj[p] = obj[p] || (isArrayIndex ? [] : {});
        set(obj[p], path, value);
        return;
    }
    const p1 = path[0];
    if (obj[p1] === undefined) {
        obj[p1] = value;
    } else if (Array.isArray(obj[p1])) {
        obj[p1].push(value);
    } else {
        obj[p1] = [
            obj[p1],
            value
        ];
    }
}
function formDataToObject(formData) {
    const obj = {};
    for (const [key, value] of formData.entries()){
        set(obj, key, value);
    }
    return obj;
}

/// <reference types="next" />
// ts-prune-ignore-next
function experimental_createTRPCNextAppDirServer(opts) {
    const getClient = React.cache(()=>{
        const config = opts.config();
        return client.createTRPCUntypedClient(config);
    });
    const seenTags = new Set();
    return shared.createFlatProxy((key)=>{
        // lazily initialize client
        const client$1 = getClient();
        if (key === 'revalidate') {
            // revalidate them all
            return ()=>{
                shared$1.fuzzyRevalidation('', seenTags);
            };
        }
        return shared.createRecursiveProxy((callOpts)=>{
            const pathCopy = [
                key,
                ...callOpts.path
            ];
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const action = pathCopy.pop();
            const procedurePath = pathCopy.join('.');
            const procedureType = client.clientCallTypeToProcedureType(action);
            const cacheTag = shared$1.generateCacheTag(procedurePath, callOpts.args[0]);
            if (action === '_def') {
                // internal attribute used to get the procedure path
                // used in server actions to find the procedure from the client proxy
                return {
                    path: procedurePath
                };
            }
            if (action === 'revalidate') {
                shared$1.fuzzyRevalidation(cacheTag, seenTags);
                return;
            }
            if (action === 'query') {
                // append the cacheKey to our internal set of known cache keys
                // this allows us to fuzzy match cache keys when revalidating
                // e.g.
                // 1. user calls `trpc.post.list.query()` => 'post.list' is added to the set
                // 2. user calls `trpc.post.listXYZ.query()` => 'post.listXYZ' is added to the set
                // 3. user calls `trpc.post.revalidate()` => fuzzy matching on 'post' revalidates 'post.list' and 'post.listXYZ'.
                seenTags.add(cacheTag);
            // console.log('seenTags', seenTags);
            }
            return client$1[procedureType](procedurePath, ...callOpts.args);
        });
    });
}
function experimental_createServerActionHandler(opts) {
    const config = opts.rootConfig ? opts.rootConfig._config : opts.router?._def._config;
    if (!config) {
        throw new server.TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `'experimental_createServerActionHandler' was called with invalid arguments. Expected a either a router or a root instance to be present, but none was found.`
        });
    }
    const { normalizeFormData =true , createContext  } = opts;
    const transformer = config.transformer;
    return function createServerAction(proc, actionOptions) {
        const procedure = (()=>{
            if (typeof proc === 'function' && typeof proc._def !== 'function') {
                // proc is a Procedure, proceed
                return proc;
            }
            // proc is a DecoratedProcedure, extract the procedure from the router
            if (!opts.router) {
                throw new server.TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: `'createServerAction' was called with invalid arguments. Expected a router to be present, but none was found.`
                });
            }
            const record = opts.router._def.record;
            const path = proc._def().path;
            const procedure = path.split('.').reduce((o, p)=>o?.[p], record);
            if (!procedure) {
                throw new server.TRPCError({
                    code: 'NOT_FOUND',
                    message: `No procedure matching path "${path}"`
                });
            }
            return procedure;
        })();
        return async function actionHandler(rawInput) {
            const ctx = undefined;
            try {
                const ctx1 = await createContext();
                if (normalizeFormData && shared$1.isFormData(rawInput)) {
                    // Normalizes formdata so we can use `z.object({})` etc on the server
                    try {
                        rawInput = formDataToObject(rawInput);
                    } catch  {
                        throw new server.TRPCError({
                            code: 'INTERNAL_SERVER_ERROR',
                            message: 'Failed to convert FormData to an object'
                        });
                    }
                } else if (rawInput && !shared$1.isFormData(rawInput)) {
                    rawInput = transformer.input.deserialize(rawInput);
                }
                const data = await procedure({
                    input: undefined,
                    ctx: ctx1,
                    path: 'serverAction',
                    rawInput,
                    type: procedure._type
                });
                for (const keyOrProc of actionOptions?.revalidates ?? []){
                    if (typeof keyOrProc === 'string') {
                        cache.revalidateTag(keyOrProc);
                    }
                    const path = keyOrProc._def().path;
                    // TODO: What about input? They are part of the cacheKey
                    // @see https://github.com/trpc/trpc/pull/4375 for that
                    const cacheKey = path;
                    cache.revalidateTag(cacheKey);
                }
                const transformedJSON = shared.transformTRPCResponse(config, {
                    result: {
                        data
                    }
                });
                return transformedJSON;
            } catch (cause) {
                const error = server.getTRPCErrorFromUnknown(cause);
                const shape = shared.getErrorShape({
                    config,
                    ctx,
                    error,
                    input: rawInput,
                    path: 'serverAction',
                    type: procedure._type
                });
                // TODO: send the right HTTP header?!
                return shared.transformTRPCResponse(config, {
                    error: shape
                });
            }
        };
    };
}
// ts-prune-ignore-next
async function experimental_revalidateEndpoint(req) {
    const { cacheTag  } = await req.json();
    if (typeof cacheTag !== 'string') {
        return new Response(JSON.stringify({
            revalidated: false,
            error: 'cacheTag must be a string'
        }), {
            status: 400
        });
    }
    cache.revalidateTag(cacheTag);
    return new Response(JSON.stringify({
        revalidated: true,
        now: Date.now()
    }), {
        status: 200
    });
}

exports.experimental_createServerActionHandler = experimental_createServerActionHandler;
exports.experimental_createTRPCNextAppDirServer = experimental_createTRPCNextAppDirServer;
exports.experimental_revalidateEndpoint = experimental_revalidateEndpoint;
