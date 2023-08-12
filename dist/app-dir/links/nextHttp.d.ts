import { HTTPBatchLinkOptions, HTTPLinkOptions, TRPCLink } from '@trpc/client';
import { AnyRouter } from '@trpc/server';
type NextFetchLinkOptions<TBatch extends boolean> = (TBatch extends true ? HTTPBatchLinkOptions & {
    unstable_stream?: boolean;
} : HTTPLinkOptions & {
    unstable_stream?: never;
}) & {
    batch?: TBatch;
    revalidate?: number | false;
};
export declare function experimental_nextHttpLink<TRouter extends AnyRouter, TBatch extends boolean>(opts: NextFetchLinkOptions<TBatch>): TRPCLink<TRouter>;
export {};
//# sourceMappingURL=nextHttp.d.ts.map