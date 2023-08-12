/// <reference types="next" />
import {
  clientCallTypeToProcedureType,
  createTRPCUntypedClient,
} from '@trpc/client';
import {
  AnyProcedure,
  AnyQueryProcedure,
  AnyRootConfig,
  AnyRouter,
  CombinedDataTransformer,
  getTRPCErrorFromUnknown,
  inferProcedureInput,
  inferRouterContext,
  MaybePromise,
  Simplify,
  TRPCError,
} from '@trpc/server';
import { TRPCResponse } from '@trpc/server/rpc';
import {
  createFlatProxy,
  createRecursiveProxy,
  getErrorShape,
  transformTRPCResponse,
} from '@trpc/server/shared';
import { revalidateTag } from 'next/cache';
import { cache } from 'react';
import { formDataToObject } from './formDataToObject';
import {
  ActionHandlerDef,
  CreateTRPCNextAppRouterOptions,
  fuzzyRevalidation,
  generateCacheTag,
  inferActionDef,
  isFormData,
} from './shared';
import {
  DecorateProcedureServer,
  NextAppDirDecoratedProcedureRecord,
} from './types';

// ts-prune-ignore-next
export function experimental_createTRPCNextAppDirServer<
  TRouter extends AnyRouter,
>(opts: CreateTRPCNextAppRouterOptions<TRouter>) {
  const getClient = cache(() => {
    const config = opts.config();
    return createTRPCUntypedClient(config);
  });

  const seenTags = new Set<string>();

  return createFlatProxy<NextAppDirDecoratedProcedureRecord<TRouter>>((key) => {
    // lazily initialize client
    const client = getClient();

    if (key === 'revalidate') {
      // revalidate them all
      return () => {
        fuzzyRevalidation('', seenTags);
      };
    }

    return createRecursiveProxy((callOpts) => {
      const pathCopy = [key, ...callOpts.path];
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const action = pathCopy.pop()!;
      const procedurePath = pathCopy.join('.');
      const procedureType = clientCallTypeToProcedureType(action);
      const cacheTag = generateCacheTag(procedurePath, callOpts.args[0]);

      if (action === '_def') {
        // internal attribute used to get the procedure path
        // used in server actions to find the procedure from the client proxy
        return {
          path: procedurePath,
        };
      }

      if (action === 'revalidate') {
        fuzzyRevalidation(cacheTag, seenTags);
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

      return (client[procedureType] as any)(procedurePath, ...callOpts.args);
    });
  });
}

/**
 * @internal
 */
export type TRPCActionHandler<TDef extends ActionHandlerDef> = (
  input: FormData | TDef['input'],
) => Promise<TRPCResponse<TDef['output'], TDef['errorShape']>>;

type AnyTInstance = { _config: AnyRootConfig };

type BaseCreateActionHandlerOptions = {
  /**
   * Transform form data to a `Record` before passing it to the procedure
   * @default true
   */
  normalizeFormData?: boolean;
};

type CreateActionHandlerOptions<
  TInstance extends AnyTInstance,
  TRouter extends AnyRouter,
> = BaseCreateActionHandlerOptions &
  (
    | {
        rootConfig: TInstance;
        router?: never;
        createContext: () => MaybePromise<
          TInstance['_config']['$types']['ctx']
        >;
      }
    | {
        rootConfig?: never;
        router: TRouter;
        createContext: () => MaybePromise<inferRouterContext<TRouter>>;
      }
  );

export function experimental_createServerActionHandler<
  TInstance extends AnyTInstance,
  TRouter extends AnyRouter,
>(opts: CreateActionHandlerOptions<TInstance, TRouter>) {
  const config = opts.rootConfig
    ? opts.rootConfig._config
    : opts.router?._def._config;
  if (!config) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: `'experimental_createServerActionHandler' was called with invalid arguments. Expected a either a router or a root instance to be present, but none was found.`,
    });
  }

  const { normalizeFormData = true, createContext } = opts;
  const transformer = config.transformer as CombinedDataTransformer;

  return function createServerAction<TProcedure extends AnyProcedure>(
    proc: AnyRouter extends TRouter
      ? TProcedure
      : DecorateProcedureServer<TProcedure> | TProcedure,
    actionOptions?: {
      revalidates?: (DecorateProcedureServer<AnyQueryProcedure> | string)[];
    },
  ): TRPCActionHandler<Simplify<inferActionDef<TProcedure>>> {
    const procedure: TProcedure = (() => {
      if (typeof proc === 'function' && typeof proc._def !== 'function') {
        // proc is a Procedure, proceed
        return proc;
      }

      // proc is a DecoratedProcedure, extract the procedure from the router
      if (!opts.router) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `'createServerAction' was called with invalid arguments. Expected a router to be present, but none was found.`,
        });
      }

      const record = opts.router._def.record;
      const path = (proc as any)._def().path;
      const procedure = path
        .split('.')
        .reduce(
          (o: { [x: string]: any }, p: string | number) => o?.[p],
          record,
        );

      if (!procedure) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `No procedure matching path "${path}"`,
        });
      }

      return procedure;
    })();

    return async function actionHandler(
      rawInput: FormData | inferProcedureInput<TProcedure>,
    ) {
      const ctx: unknown = undefined;
      try {
        const ctx = await createContext();
        if (normalizeFormData && isFormData(rawInput)) {
          // Normalizes formdata so we can use `z.object({})` etc on the server
          try {
            rawInput = formDataToObject(rawInput);
          } catch {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Failed to convert FormData to an object',
            });
          }
        } else if (rawInput && !isFormData(rawInput)) {
          rawInput = transformer.input.deserialize(rawInput);
        }

        const data = await procedure({
          input: undefined,
          ctx,
          path: 'serverAction',
          rawInput,
          type: procedure._type,
        });

        for (const keyOrProc of actionOptions?.revalidates ?? []) {
          if (typeof keyOrProc === 'string') {
            revalidateTag(keyOrProc);
          }

          const path = (keyOrProc as any)._def().path;
          // TODO: What about input? They are part of the cacheKey
          // @see https://github.com/trpc/trpc/pull/4375 for that
          const cacheKey = path;
          revalidateTag(cacheKey);
        }

        const transformedJSON = transformTRPCResponse(config, {
          result: {
            data,
          },
        });
        return transformedJSON;
      } catch (cause) {
        const error = getTRPCErrorFromUnknown(cause);
        const shape = getErrorShape({
          config,
          ctx,
          error,
          input: rawInput,
          path: 'serverAction',
          type: procedure._type,
        });

        // TODO: send the right HTTP header?!

        return transformTRPCResponse(config, {
          error: shape,
        });
      }
    } as TRPCActionHandler<inferActionDef<TProcedure>>;
  };
}

// ts-prune-ignore-next
export async function experimental_revalidateEndpoint(req: Request) {
  const { cacheTag } = await req.json();

  if (typeof cacheTag !== 'string') {
    return new Response(
      JSON.stringify({
        revalidated: false,
        error: 'cacheTag must be a string',
      }),
      { status: 400 },
    );
  }

  revalidateTag(cacheTag);
  return new Response(JSON.stringify({ revalidated: true, now: Date.now() }), {
    status: 200,
  });
}
