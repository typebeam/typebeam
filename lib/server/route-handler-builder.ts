import {
  type HandlerCallback,
  RouteHandler,
  type ValidationSchema,
} from "./route-handler";
import type { Request } from "./request";
import type { HttpMethod } from "../http/methods";
import type { HttpError } from "../errors";
import type { ResponderInterface } from "./responder/responder.interface";

export class RouteHandlerBuilder<
  P extends string,
  C,
  ZQ,
  ZB,
  AbilityType,
  InjectorType,
  InjectKeys extends keyof InjectorType,
  ConfigType
> {
  private callback: HandlerCallback<
    P,
    C,
    ZQ,
    ZB,
    AbilityType,
    InjectorType,
    InjectKeys,
    ConfigType
  > | null = null;
  private querySchema: ValidationSchema<ZQ> | null = null;
  private bodySchema: ValidationSchema<ZB> | null = null;
  private guardCallback: ((ability: AbilityType) => boolean) | null = null;
  private injectKeys: (keyof InjectorType)[] = [];
  private _httpCode: number;
  private _errorHandler: ((err: HttpError) => ResponderInterface) | null = null;

  constructor(
    private readonly method: HttpMethod,
    private readonly path: string,
    private readonly config: ConfigType
  ) {
    this._httpCode = method === "POST" ? 201 : 200;
  }

  error(errorHandler: (err: HttpError) => ResponderInterface) {
    this._errorHandler = errorHandler;
    return this;
  }

  httpCode(code: number) {
    this._httpCode = code;
    return this;
  }

  handle(
    callback: HandlerCallback<
      P,
      C,
      ZQ,
      ZB,
      AbilityType,
      InjectorType,
      InjectKeys,
      ConfigType
    >
  ) {
    this.callback = callback;
    return this;
  }

  inject<K extends keyof InjectorType>(key: K) {
    this.injectKeys.push(key);
    return this as unknown as RouteHandlerBuilder<
      P,
      C,
      ZQ,
      ZB,
      AbilityType,
      InjectorType,
      InjectKeys | K,
      ConfigType
    >;
  }

  query<ZQ_new>(
    querySchema: ValidationSchema<ZQ_new>
  ): RouteHandlerBuilder<
    P,
    C,
    ZQ_new,
    ZB,
    AbilityType,
    InjectorType,
    InjectKeys,
    ConfigType
  > {
    this.querySchema = querySchema as unknown as ValidationSchema<ZQ>;
    return this as unknown as RouteHandlerBuilder<
      P,
      C,
      ZQ_new,
      ZB,
      AbilityType,
      InjectorType,
      InjectKeys,
      ConfigType
    >;
  }

  body<ZB_new>(
    bodySchema: ValidationSchema<ZB_new>
  ): RouteHandlerBuilder<
    P,
    C,
    ZQ,
    ZB_new,
    AbilityType,
    InjectorType,
    InjectKeys,
    ConfigType
  > {
    this.bodySchema = bodySchema as unknown as ValidationSchema<ZB>;
    return this as unknown as RouteHandlerBuilder<
      P,
      C,
      ZQ,
      ZB_new,
      AbilityType,
      InjectorType,
      InjectKeys,
      ConfigType
    >;
  }

  guard(callback: (ability: AbilityType) => boolean) {
    this.guardCallback = callback;
    return this;
  }

  compile(): RouteHandler<
    P,
    C,
    ZQ,
    ZB,
    AbilityType,
    InjectorType,
    InjectKeys,
    ConfigType
  > {
    if (!this.callback) {
      throw new Error(
        `Route callback not configured for ${this.method} ${this.path}`
      );
    }
    return new RouteHandler<
      P,
      C,
      ZQ,
      ZB,
      AbilityType,
      InjectorType,
      InjectKeys,
      ConfigType
    >({
      callback: this.callback,
      querySchema: this.querySchema,
      bodySchema: this.bodySchema,
      guard: this.guardCallback,
      injector: this.injector.bind(this) as (
        provider: any,
        req: Request,
        ctx: C
      ) => { [key in keyof InjectorType]: Awaited<InjectorType[key]> },
      httpCode: this._httpCode,
      config: this.config,
      errorHandler: this._errorHandler,
    });
  }

  async injector(
    provider: any,
    req: Request,
    ctx: C
  ): Promise<Record<string, any>> {
    const resolved: Record<keyof InjectorType, any> = {} as Record<
      keyof InjectorType,
      any
    >;
    for (const key of this.injectKeys) {
      resolved[key] = await provider[key](req, ctx, this.config);
    }
    return resolved;
  }
}
