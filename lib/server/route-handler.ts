import type { Request } from "./request";
import { BadRequestError, HttpError } from "../errors";
import type { LoggerInterface } from "./server-builder";
import type { ResponderInterface } from "./responder/responder.interface";

export type ValidationSchema<T> = (x: unknown) => T;

type Split<S extends string, D extends string> = string extends S
  ? string[]
  : S extends ""
  ? []
  : S extends `${infer T}${D}${infer U}`
  ? [T, ...Split<U, D>]
  : [S];

type FilterPathPartsToKeys<T extends readonly any[]> = T extends [
  infer F,
  ...infer R
]
  ? [F] extends [`:${string}`]
    ? [Split<F, ":">[1], ...FilterPathPartsToKeys<R>]
    : FilterPathPartsToKeys<R>
  : [];

export type KeyFromPathString<P extends string> = FilterPathPartsToKeys<
  Split<P, "/">
>;

interface CallbackArgs<
  P extends string,
  C,
  ZQ,
  ZB,
  AbilityType,
  InjectorType,
  InjectKeys extends keyof InjectorType,
  ConfigType
> {
  ctx: C;
  // TODO: path is only applicable if P has wildcard
  params: { [key in KeyFromPathString<P>[number]]: string };
  query: ZQ;
  body: ZB;
  ability: AbilityType;
  logger: LoggerInterface;
  inject: Pick<InjectorType, InjectKeys>;
  request: Request;
  config: ConfigType;
}

export type HandlerCallback<
  P extends string,
  C,
  ZQ,
  ZB,
  AbilityType,
  InjectorType,
  InjectKeys extends keyof InjectorType,
  ConfigType
> = (
  _: CallbackArgs<
    P,
    C,
    ZQ,
    ZB,
    AbilityType,
    InjectorType,
    InjectKeys,
    ConfigType
  >
) => any | Promise<any>;

interface RouterHandlerOptions<
  P extends string,
  C,
  ZQ,
  ZB,
  AbilityType,
  InjectorType,
  InjectKeys extends keyof InjectorType,
  ConfigType
> {
  callback: HandlerCallback<
    P,
    C,
    ZQ,
    ZB,
    AbilityType,
    InjectorType,
    InjectKeys,
    ConfigType
  >;
  querySchema: ValidationSchema<ZQ> | null;
  bodySchema: ValidationSchema<ZB> | null;
  guard: ((ability: AbilityType) => boolean) | null;
  injector: (providers: any, req: Request, ctx: C) => InjectorType;
  httpCode: number;
  config: ConfigType;
  errorHandler: ((err: HttpError) => ResponderInterface) | null;
}

// TODO: added default any to make routerData work without type params
export class RouteHandler<
  P extends string = any,
  C = any,
  ZQ = any,
  ZB = any,
  AbilityType = any,
  InjectorType = any,
  InjectKeys extends keyof InjectorType = any,
  ConfigType = any
> {
  constructor(
    private readonly options: RouterHandlerOptions<
      P,
      C,
      ZQ,
      ZB,
      AbilityType,
      InjectorType,
      InjectKeys,
      ConfigType
    >
  ) {}

  get errorHandler() {
    return this.options.errorHandler;
  }

  get guard() {
    return this.options.guard;
  }

  get httpCode() {
    return this.options.httpCode;
  }

  async exec(
    ctx: C,
    params: any,
    req: Request,
    ability: AbilityType,
    logger: LoggerInterface,
    providers: InjectorType
  ) {
    return this.options.callback({
      ctx,
      query: this.parseQuery(req),
      params: params,
      body: await this.parseBody(req),
      ability,
      logger,
      inject: await this.options.injector(providers, req, ctx),
      request: req,
      config: this.options.config,
    });
  }

  parseQuery(req: Request) {
    if (!this.options.querySchema) {
      return {} as ZQ;
    }
    try {
      return this.options.querySchema(req.query);
    } catch (err) {
      throw new BadRequestError("Invalid Query", err);
    }
  }

  async parseBody(req: Request) {
    if (!this.options.bodySchema) {
      return {} as ZB;
    }
    try {
      return this.options.bodySchema(await req.getBody());
    } catch (err) {
      throw new BadRequestError("Invalid Body", err);
    }
  }
}
