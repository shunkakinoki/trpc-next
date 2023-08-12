'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var shared = require('@trpc/react-query/shared');
var shared$1 = require('@trpc/server/shared');
var React = require('react');
var shared$2 = require('../shared-1dc3e2ac.js');
require('next/cache');

function experimental_createTRPCNextReactQuery(opts) {
    const hooks = shared.createRootHooks(opts);
    return shared$1.createFlatProxy((key)=>{
        if (key === 'useContext') {
            return ()=>{
                const context = hooks.useContext();
                // create a stable reference of the utils context
                return React.useMemo(()=>{
                    return shared.createReactQueryUtilsProxy(context, {
                        invalidate: async (args)=>{
                            const cacheTag = shared$2.generateCacheTag(args.path.join('.'), args.input);
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
        return shared.createReactProxyDecoration(key, hooks);
    });
}

exports.experimental_createTRPCNextReactQuery = experimental_createTRPCNextReactQuery;
