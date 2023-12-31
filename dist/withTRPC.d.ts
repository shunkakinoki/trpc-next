import { CreateTRPCClientOptions } from '@trpc/client';
import { TRPCClientError } from '@trpc/react-query';
import { CreateTRPCReactOptions, CreateTRPCReactQueryClientConfig } from '@trpc/react-query/shared';
import type { AnyRouter } from '@trpc/server';
import type { ResponseMeta } from '@trpc/server/http';
import { NextComponentType, NextPageContext } from 'next/dist/shared/lib/utils';
export type WithTRPCConfig<TRouter extends AnyRouter> = CreateTRPCClientOptions<TRouter> & CreateTRPCReactQueryClientConfig & {
    abortOnUnmount?: boolean;
};
interface WithTRPCOptions<TRouter extends AnyRouter> extends CreateTRPCReactOptions<TRouter> {
    config: (info: {
        ctx?: NextPageContext;
    }) => WithTRPCConfig<TRouter>;
}
export interface WithTRPCSSROptions<TRouter extends AnyRouter> extends WithTRPCOptions<TRouter> {
    ssr: true;
    responseMeta?: (opts: {
        ctx: NextPageContext;
        clientErrors: TRPCClientError<TRouter>[];
    }) => ResponseMeta;
}
export interface WithTRPCNoSSROptions<TRouter extends AnyRouter> extends WithTRPCOptions<TRouter> {
    ssr?: false;
}
export declare function withTRPC<TRouter extends AnyRouter, TSSRContext extends NextPageContext = NextPageContext>(opts: WithTRPCNoSSROptions<TRouter> | WithTRPCSSROptions<TRouter>): (AppOrPage: NextComponentType<any, any, any>) => NextComponentType;
export {};
//# sourceMappingURL=withTRPC.d.ts.map