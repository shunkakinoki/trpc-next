import { AnyProcedure, AnyQueryProcedure, AnyRootConfig, AnyRouter, inferRouterContext, MaybePromise, Simplify } from '@trpc/server';
import { TRPCResponse } from '@trpc/server/rpc';
import { ActionHandlerDef, CreateTRPCNextAppRouterOptions, inferActionDef } from './shared';
import { DecorateProcedureServer, NextAppDirDecoratedProcedureRecord } from './types';
export declare function experimental_createTRPCNextAppDirServer<TRouter extends AnyRouter>(opts: CreateTRPCNextAppRouterOptions<TRouter>): NextAppDirDecoratedProcedureRecord<TRouter>;
/**
 * @internal
 */
export type TRPCActionHandler<TDef extends ActionHandlerDef> = (input: FormData | TDef['input']) => Promise<TRPCResponse<TDef['output'], TDef['errorShape']>>;
type AnyTInstance = {
    _config: AnyRootConfig;
};
type BaseCreateActionHandlerOptions = {
    /**
     * Transform form data to a `Record` before passing it to the procedure
     * @default true
     */
    normalizeFormData?: boolean;
};
type CreateActionHandlerOptions<TInstance extends AnyTInstance, TRouter extends AnyRouter> = BaseCreateActionHandlerOptions & ({
    rootConfig: TInstance;
    router?: never;
    createContext: () => MaybePromise<TInstance['_config']['$types']['ctx']>;
} | {
    rootConfig?: never;
    router: TRouter;
    createContext: () => MaybePromise<inferRouterContext<TRouter>>;
});
export declare function experimental_createServerActionHandler<TInstance extends AnyTInstance, TRouter extends AnyRouter>(opts: CreateActionHandlerOptions<TInstance, TRouter>): <TProcedure extends AnyProcedure>(proc: AnyRouter extends TRouter ? TProcedure : TProcedure | DecorateProcedureServer<TProcedure>, actionOptions?: {
    revalidates?: (DecorateProcedureServer<AnyQueryProcedure> | string)[];
}) => TRPCActionHandler<{
    input: import("@trpc/server").ProcedureArgs<import("@trpc/server").inferProcedureParams<TProcedure>>[0];
    output: TProcedure["_def"]["_output_out"];
    errorShape: TProcedure["_def"]["_config"]["$types"]["errorShape"];
}>;
export declare function experimental_revalidateEndpoint(req: Request): Promise<Response>;
export {};
//# sourceMappingURL=server.d.ts.map