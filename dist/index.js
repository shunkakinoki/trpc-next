'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var reactQuery = require('@tanstack/react-query');
var client = require('@trpc/client');
var shared = require('@trpc/react-query/shared');
var React = require('react');
var ssrPrepass = require('react-ssr-prepass');
var shared$1 = require('@trpc/server/shared');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var React__default = /*#__PURE__*/_interopDefaultLegacy(React);
var ssrPrepass__default = /*#__PURE__*/_interopDefaultLegacy(ssrPrepass);

function transformQueryOrMutationCacheErrors(result) {
    const error = result.state.error;
    if (error instanceof Error && error.name === 'TRPCClientError') {
        const newError = {
            message: error.message,
            data: error.data,
            shape: error.shape
        };
        return {
            ...result,
            state: {
                ...result.state,
                error: newError
            }
        };
    }
    return result;
}
function withTRPC(opts) {
    const { config: getClientConfig  } = opts;
    return (AppOrPage)=>{
        const trpc = shared.createRootHooks(opts);
        const WithTRPC = (props)=>{
            const [prepassProps] = React.useState(()=>{
                if (props.trpc) {
                    return props.trpc;
                }
                const config = getClientConfig({});
                const queryClient = shared.getQueryClient(config);
                const trpcClient = trpc.createClient(config);
                return {
                    abortOnUnmount: config.abortOnUnmount,
                    queryClient,
                    trpcClient,
                    ssrState: opts.ssr ? 'mounting' : false,
                    ssrContext: null
                };
            });
            const { queryClient , trpcClient , ssrState , ssrContext  } = prepassProps;
            // allow normal components to be wrapped, not just app/pages
            const hydratedState = trpc.useDehydratedState(trpcClient, props.pageProps?.trpcState);
            return /*#__PURE__*/ React__default["default"].createElement(trpc.Provider, {
                abortOnUnmount: prepassProps.abortOnUnmount ?? false,
                client: trpcClient,
                queryClient: queryClient,
                ssrState: ssrState,
                ssrContext: ssrContext
            }, /*#__PURE__*/ React__default["default"].createElement(reactQuery.QueryClientProvider, {
                client: queryClient
            }, /*#__PURE__*/ React__default["default"].createElement(reactQuery.HydrationBoundary, {
                state: hydratedState
            }, /*#__PURE__*/ React__default["default"].createElement(AppOrPage, Object.assign({}, props)))));
        };
        if (AppOrPage.getInitialProps ?? opts.ssr) {
            WithTRPC.getInitialProps = async (appOrPageCtx)=>{
                const AppTree = appOrPageCtx.AppTree;
                // Determine if we are wrapping an App component or a Page component.
                const isApp = !!appOrPageCtx.Component;
                const ctx = isApp ? appOrPageCtx.ctx : appOrPageCtx;
                // Run the wrapped component's getInitialProps function.
                let pageProps = {};
                if (AppOrPage.getInitialProps) {
                    const originalProps = await AppOrPage.getInitialProps(appOrPageCtx);
                    const originalPageProps = isApp ? originalProps.pageProps ?? {} : originalProps;
                    pageProps = {
                        ...originalPageProps,
                        ...pageProps
                    };
                }
                const getAppTreeProps = (props)=>isApp ? {
                        pageProps: props
                    } : props;
                if (typeof window !== 'undefined' || !opts.ssr) {
                    return getAppTreeProps(pageProps);
                }
                const config = getClientConfig({
                    ctx
                });
                const trpcClient = client.createTRPCUntypedClient(config);
                const queryClient = shared.getQueryClient(config);
                const trpcProp = {
                    config,
                    trpcClient,
                    queryClient,
                    ssrState: 'prepass',
                    ssrContext: ctx
                };
                const prepassProps = {
                    pageProps,
                    trpc: trpcProp
                };
                // Run the prepass step on AppTree. This will run all trpc queries on the server.
                // multiple prepass ensures that we can do batching on the server
                while(true){
                    // render full tree
                    await ssrPrepass__default["default"](/*#__PURE__*/ React.createElement(AppTree, prepassProps));
                    if (!queryClient.isFetching()) {
                        break;
                    }
                    // wait until the query cache has settled it's promises
                    await new Promise((resolve)=>{
                        const unsub = queryClient.getQueryCache().subscribe((event)=>{
                            if (event?.query.getObserversCount() === 0) {
                                resolve();
                                unsub();
                            }
                        });
                    });
                }
                const dehydratedCache = reactQuery.dehydrate(queryClient, {
                    shouldDehydrateQuery () {
                        // makes sure errors are also dehydrated
                        return true;
                    }
                });
                // since error instances can't be serialized, let's make them into `TRPCClientErrorLike`-objects
                const dehydratedCacheWithErrors = {
                    ...dehydratedCache,
                    queries: dehydratedCache.queries.map(transformQueryOrMutationCacheErrors),
                    mutations: dehydratedCache.mutations.map(transformQueryOrMutationCacheErrors)
                };
                // dehydrate query client's state and add it to the props
                pageProps.trpcState = trpcClient.runtime.combinedTransformer.output.serialize(dehydratedCacheWithErrors);
                const appTreeProps = getAppTreeProps(pageProps);
                const meta = opts.responseMeta?.({
                    ctx,
                    clientErrors: [
                        ...dehydratedCache.queries,
                        ...dehydratedCache.mutations
                    ].map((v)=>v.state.error).flatMap((err)=>err instanceof Error && err.name === 'TRPCClientError' ? [
                            err
                        ] : [])
                }) ?? {};
                for (const [key, value] of Object.entries(meta.headers ?? {})){
                    if (typeof value === 'string') {
                        ctx.res?.setHeader(key, value);
                    }
                }
                if (meta.status && ctx.res) {
                    ctx.res.statusCode = meta.status;
                }
                return appTreeProps;
            };
        }
        const displayName = AppOrPage.displayName ?? AppOrPage.name ?? 'Component';
        WithTRPC.displayName = `withTRPC(${displayName})`;
        return WithTRPC;
    };
}

/* istanbul ignore file -- @preserve */ // We're testing this through E2E-testing
function createTRPCNext(opts) {
    const hooks = shared.createRootHooks(opts);
    // TODO: maybe set TSSRContext to `never` when using `WithTRPCNoSSROptions`
    const _withTRPC = withTRPC(opts);
    return shared$1.createFlatProxy((key)=>{
        if (key === 'useContext') {
            return ()=>{
                const context = hooks.useContext();
                // create a stable reference of the utils context
                return React.useMemo(()=>{
                    return shared.createReactQueryUtilsProxy(context);
                }, [
                    context
                ]);
            };
        }
        if (key === 'useQueries') {
            return hooks.useQueries;
        }
        if (key === 'withTRPC') {
            return _withTRPC;
        }
        return shared.createReactProxyDecoration(key, hooks);
    });
}

exports.createTRPCNext = createTRPCNext;
exports.withTRPC = withTRPC;
