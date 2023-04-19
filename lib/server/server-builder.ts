import { type DefineAbilityOptions, Server } from "./server";
import { Router } from "../router";
import { RouteHandlerBuilder } from "./route-handler-builder";
import type { HttpMethod } from "../http/methods";
import type { Request } from "./request";
import type { ValidationSchema } from "./route-handler";
import type { ResponderInterface } from "./responder/responder.interface";

type LogFunction = (msg: string, ...args: any[]) => void;

export interface LoggerInterface {
  debug: LogFunction;
  info: LogFunction;
  warn: LogFunction;
  error: LogFunction;
}

type RouteDef = [HttpMethod, string];

type Injector<InjectorType> = {
  [key in keyof InjectorType]: () => Promise<InjectorType[key]>;
};

export type MiddlewareCallback<ConfigType, ContextType, InjectorType> = (
  _: {
    request: Request;
    ctx: ContextType;
    config: ConfigType;
    injector: InjectorType;
  },
  next: (req: Request) => ResponderInterface
) => ResponderInterface;

export class ServerBuilder<
  ConfigType,
  ContextType,
  AbilityType,
  InjectorType extends {}
> {
  routes: Map<
    RouteDef,
    RouteHandlerBuilder<
      string,
      ContextType,
      ValidationSchema<unknown>,
      ValidationSchema<unknown>,
      AbilityType,
      InjectorType,
      never,
      ConfigType
    >
  > = new Map();
  _context: { [key: string]: any } = {};
  providers: { [key: string]: any } = {};
  _logger: LoggerInterface = console;
  _defineAbility: (
    options: DefineAbilityOptions<ContextType, ConfigType, InjectorType>
  ) => Promise<AbilityType> = () => Promise.resolve(null as AbilityType);
  stack: MiddlewareCallback<ConfigType, ContextType, InjectorType>[] = [];
  _fallback?: RouteHandlerBuilder<
    string,
    ContextType,
    ValidationSchema<unknown>,
    ValidationSchema<unknown>,
    AbilityType,
    InjectorType,
    never,
    ConfigType
  >;

  constructor(private readonly config?: ConfigType) {}

  // @ts-ignore
  use(callback: MiddlewareCallback) {
    this.stack.push(callback);
    return this;
  }

  logger(logger: LoggerInterface) {
    this._logger = logger;
    return this;
  }

  defineAbility<A>(
    callback: (
      options: DefineAbilityOptions<ContextType, ConfigType, InjectorType>
    ) => Promise<A> | A
  ) {
    this._defineAbility = callback as unknown as (
      options: DefineAbilityOptions<ContextType, ConfigType, InjectorType>
    ) => Promise<AbilityType>;
    return this as unknown as ServerBuilder<
      ConfigType,
      ContextType,
      A,
      InjectorType
    >;
  }

  provide<K extends string, T>(
    key: K,
    callback: (args: {
      ctx: ContextType;
      injector: Injector<InjectorType>;
      request: Request;
      config: ConfigType;
    }) => Promise<T> | T
  ): ServerBuilder<
    ConfigType,
    ContextType,
    AbilityType,
    InjectorType & { [key in K]: T }
  > {
    this.providers[key] = (
      request: Request,
      context: ContextType,
      config: ConfigType
    ) =>
      callback({
        ctx: context as ContextType,
        request,
        injector: this.providers as Injector<InjectorType>,
        config,
      });
    return this as unknown as ServerBuilder<
      ConfigType,
      ContextType,
      AbilityType,
      InjectorType & { [key in K]: T }
    >;
  }

  fallback() {
    const handler = new RouteHandlerBuilder<
      "",
      ContextType,
      ValidationSchema<unknown>,
      ValidationSchema<unknown>,
      AbilityType,
      InjectorType,
      never,
      ConfigType
    >("GET", "", this.config ?? ({} as ConfigType));
    this._fallback = handler;
    return handler;
  }

  get<P extends string>(path: P) {
    return this.request("GET", path);
  }

  post<P extends string>(path: P) {
    return this.request("POST", path);
  }

  delete<P extends string>(path: P) {
    return this.request("DELETE", path);
  }

  head<P extends string>(path: P) {
    return this.request("HEAD", path);
  }

  put<P extends string>(path: P) {
    return this.request("PUT", path);
  }

  patch<P extends string>(path: P) {
    return this.request("PATCH", path);
  }

  request<P extends string>(method: HttpMethod, path: P) {
    const handler = new RouteHandlerBuilder<
      P,
      ContextType,
      ValidationSchema<unknown>,
      ValidationSchema<unknown>,
      AbilityType,
      InjectorType,
      never,
      ConfigType
    >(method, path, this.config ?? ({} as ConfigType));
    this.routes.set([method, path], handler);
    return handler;
  }

  async build(): Promise<
    Server<ConfigType, ContextType, AbilityType, InjectorType>
  > {
    // TODO: config type optional, perhaps with a static factory and default never?
    // then won't need a default with cast
    const config = this.config ?? ({} as ConfigType);
    const router = new Router();
    for (const [[method, path], handler] of this.routes) {
      router.addRoute(path).set(method, handler.compile());
      this._logger.info(`Mapped route ${method} ${path}`);
    }
    return new Server({
      config,
      context: (await this.resolveContext(config)) as ContextType,
      router,
      defineAbility: this._defineAbility,
      logger: this._logger,
      providers: this.providers as InjectorType,
      stack: this.stack,
      fallback: this._fallback?.compile(),
    });
  }

  async resolveContext(config: ConfigType): Promise<ContextType> {
    const ctx: Record<string, any> = {};
    for (const [key, callback] of Object.entries(this._context)) {
      // TODO: is it just luck that the context is resolved in same order it was defined
      // maybe should actually use an array for temp storage so can guarantee order matches types
      ctx[key] = await callback({ config, ctx });
    }
    return ctx as ContextType;
  }

  context<K extends string, T>(
    key: K,
    callback: (args: { ctx: ContextType; config: ConfigType }) => Promise<T> | T
  ): ServerBuilder<
    ConfigType,
    ContextType & { [key in K]: T },
    AbilityType,
    InjectorType
  > {
    this._context[key] = callback;
    return this as unknown as ServerBuilder<
      ConfigType,
      ContextType & { [key in K]: T },
      AbilityType,
      InjectorType
    >;
  }
}
