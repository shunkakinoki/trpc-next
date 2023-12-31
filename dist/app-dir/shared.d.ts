import { CreateTRPCClientOptions, Resolver, TRPCUntypedClient } from '@trpc/client';
import { AnyProcedure, AnyQueryProcedure, AnyRouter, Filter, inferHandlerInput, ProtectedIntersection, ThenArg } from '@trpc/server';
/**
 * @internal
 */
export type UseProcedureRecord<TRouter extends AnyRouter> = {
    [TKey in keyof Filter<TRouter['_def']['record'], AnyQueryProcedure | AnyRouter>]: TRouter['_def']['record'][TKey] extends AnyRouter ? UseProcedureRecord<TRouter['_def']['record'][TKey]> : Resolver<TRouter['_def']['record'][TKey]>;
};
export declare function createUseProxy<TRouter extends AnyRouter>(client: TRPCUntypedClient<TRouter>): UseProcedureRecord<TRouter>;
type NextAppRouterUse<TRouter extends AnyRouter> = {
    <TData extends Promise<unknown>[]>(cb: (t: UseProcedureRecord<TRouter>) => [...TData]): {
        [TKey in keyof TData]: ThenArg<TData[TKey]>;
    };
    <TData extends Promise<unknown>>(cb: (t: UseProcedureRecord<TRouter>) => TData): ThenArg<TData>;
};
type CreateTRPCNextAppRouterBase<TRouter extends AnyRouter> = {
    use: NextAppRouterUse<TRouter>;
};
export type CreateTRPCNextAppRouter<TRouter extends AnyRouter> = ProtectedIntersection<CreateTRPCNextAppRouterBase<TRouter>, UseProcedureRecord<TRouter>>;
/**
 * @internal
 */
export interface CreateTRPCNextAppRouterOptions<TRouter extends AnyRouter> {
    config: () => CreateTRPCClientOptions<TRouter>;
}
/**
 * @internal
 */
export declare function generateCacheTag(procedurePath: string, input: any): string;
/**
 * @internal
 */
export declare function decomposeCacheTag(cacheTag: string): {
    procedurePath: string;
    input: any;
};
/**
 * @internal
 */
export declare function fuzzyRevalidation(cacheKey: string, seenTags: Set<string>): void;
export declare function isFormData(value: unknown): value is FormData;
/**
 * @internal
 */
export interface ActionHandlerDef {
    input?: any;
    output?: any;
    errorShape: any;
}
/**
 * @internal
 */
export type inferActionDef<TProc extends AnyProcedure> = {
    input: inferHandlerInput<TProc>[0];
    output: TProc['_def']['_output_out'];
    errorShape: TProc['_def']['_config']['$types']['errorShape'];
};
export {};
//# sourceMappingURL=shared.d.ts.map