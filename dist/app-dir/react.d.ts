import { CreateClient, CreateReactUtilsProxy, CreateTRPCReactOptions, DecoratedProcedureRecord, TRPCProvider, TRPCUseQueries } from '@trpc/react-query/shared';
import { AnyRouter, ProtectedIntersection } from '@trpc/server';
export interface CreateTRPCNextReactOptions<TRouter extends AnyRouter> extends CreateTRPCReactOptions<TRouter> {
}
export interface CreateTRPCNextBase<TRouter extends AnyRouter> {
    useContext(): CreateReactUtilsProxy<TRouter, unknown>;
    useQueries: TRPCUseQueries<TRouter>;
    Provider: TRPCProvider<TRouter, null>;
    createClient: CreateClient<TRouter>;
}
/**
 * @internal
 */
export type CreateTRPCNext<TRouter extends AnyRouter> = ProtectedIntersection<CreateTRPCNextBase<TRouter>, DecoratedProcedureRecord<TRouter['_def']['record'], null>>;
export declare function experimental_createTRPCNextReactQuery<TRouter extends AnyRouter>(opts?: CreateTRPCNextReactOptions<TRouter>): CreateTRPCNext<TRouter>;
//# sourceMappingURL=react.d.ts.map