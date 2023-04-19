import type { IncomingMessage, ServerResponse } from "node:http";
import { createServer } from "http";
import type { Router } from "../router";
import { Request } from "./request";
import { HttpError, NotFoundError, UnauthorizedError } from "../errors";
import { DefaultJsonResponder } from "./responder/json-responder";
import { handleError } from "../errors/error-handler";
import type { LoggerInterface, MiddlewareCallback } from "./server-builder";
import type { ResponderInterface } from "./responder/responder.interface";
import { isResponder } from "./responder/responder.interface";
import { RouteHandler } from "./route-handler";

const DEFAULT_PORT = 3000;
const DEFAULT_HOST = "127.0.0.1";

type ResolvedInjector<InjectorType> = {
  [k in keyof InjectorType]: () => Promise<InjectorType[k]>;
};

export interface DefineAbilityOptions<ContextType, ConfigType, InjectorType> {
  request: Request;
  ctx: ContextType;
  config: ConfigType;
  injector: ResolvedInjector<InjectorType>;
}

interface ServerOptions<ConfigType, ContextType, AbilityType, InjectorType> {
  config: ConfigType;
  context: ContextType;
  router: Router;
  defineAbility: (
    options: DefineAbilityOptions<ContextType, ConfigType, InjectorType>
  ) => Promise<AbilityType>;
  logger: LoggerInterface;
  providers: InjectorType;
  stack: MiddlewareCallback<ConfigType, ContextType, InjectorType>[];
  fallback?: RouteHandler | undefined;
}

export class Server<ConfigType, ContextType, AbilityType, InjectorType> {
  server = createServer(this.responder.bind(this));

  get config() {
    return this.options.config;
  }

  get context() {
    return this.options.context;
  }

  get logger() {
    return this.options.logger;
  }

  get providers() {
    return this.options.providers;
  }

  constructor(
    private readonly options: ServerOptions<
      ConfigType,
      ContextType,
      AbilityType,
      InjectorType
    >
  ) {}

  async listen(port = DEFAULT_PORT, host = DEFAULT_HOST) {
    this.server.listen(port, host, () => {
      const scheme = "http";
      this.logger.info(`Server listening on ${scheme}://${host}:${port}`);
    });
  }

  close(): Promise<void> {
    return new Promise((resolve) => {
      this.server.close(() => {
        this.logger.info("Server closed.");
        resolve(undefined);
      });
    });
  }

  private async responder(req: IncomingMessage, res: ServerResponse) {
    try {
      const request = Request.fromIncomingMessage(req);
      const responder = await this.handle(request);
      await responder.respond(res);
    } catch (err) {
      handleError(err, res, this.logger);
    }
  }

  // private async wrapHandle(request: Request): Promise<ResponderInterface> {
  //   class Stack {
  //     constructor(
  //       public parent: Server<any, any, any, any>,
  //       public i: number = 0
  //     ) {}
  //     handle(): any {
  //       if (!this.parent.options.stack[this.i]) {
  //         return this.parent.handle(request);
  //       }
  //       const current = this.parent.options.stack[this.i]!;
  //       this.i++;
  //       return current(
  //         {
  //           request,
  //           ctx: this.parent.context,
  //           config: this.parent.config,
  //           // TODO: don't calculate this multiple times
  //           injector: this.parent.getInjector(request),
  //         },
  //         this.handle.bind(this)
  //       );
  //     }
  //   }
  //
  //   // const responder = await this.handle(request);
  //   return new Stack(this).handle();
  // }

  private async handle(request: Request): Promise<ResponderInterface> {
    this.logger.info(
      `Processing request ${request.method} ${request.pathname}`
    );
    const routeData = this.options.router.parse(request.pathname);
    if (!routeData.data && !this.options.fallback) {
      throw new NotFoundError();
    }
    const handler = routeData.data
      ? routeData.data.get(request.method)
      : this.options.fallback!;

    const ability = await this.options.defineAbility({
      request,
      ctx: this.context,
      config: this.config,
      injector: this.getInjector(request),
    });
    if (handler.guard && !handler.guard(ability)) {
      throw new UnauthorizedError();
    }
    try {
      const data = await handler.exec(
        this.options.context,
        routeData.params,
        request,
        ability,
        this.logger,
        this.providers
      );
      if (isResponder(data)) {
        return data;
      }
      return new DefaultJsonResponder(data, handler.httpCode);
    } catch (err) {
      if (err instanceof HttpError && handler.errorHandler) {
        return handler.errorHandler(err);
      }
      throw err;
    }
  }

  private getInjector(request: Request): ResolvedInjector<InjectorType> {
    const injector: any = {};
    // TODO: providers has wrong type (fix and remove as any)
    for (const [key, callback] of Object.entries(this.providers as any)) {
      injector[key] = () =>
        (callback as any)(request, this.context, this.config);
    }
    return injector;
  }
}

// import { createServer, IncomingMessage, ServerResponse } from "node:http";
// import { MethodNotAllowedError, NotFoundError } from "../errors";
// import { Router } from "../router";
// import { handleError } from "../errors/error-handler";
// import { DefaultJsonResponder } from "./responder/json-responder";
// import { Request } from "./request";
// import { StaticFileResponder } from "./responder/static-file-responder";
// import type { HttpMethod } from "../http/methods";
// import { decode } from "querystring";
// import { z } from "zod";
// import { RouteHandler } from "./route-handler";
//
// const DEFAULT_PORT = 3000;
// const DEFAULT_HOST = "127.0.0.1";
//
// interface ServerOptions<ConfigType, ContextType> {
//   configSchema: { parse: (_: any) => ConfigType };
//   init: (config: ConfigType) => Promise<ContextType>;
// }
//
// export class Server<ConfigType, ContextType> {
//   server = createServer(this.responder.bind(this));
//   config: ConfigType;
//   ctx?: ContextType;
//   router = new Router<
//     Partial<{ [key in HttpMethod]: RouteHandler<string, any, z.ZodTypeAny> }>
//   >();
//
//   // used for optional static file hosting
//   staticPath: string | null = null;
//   isSpa: boolean = false;
//
//   constructor(
//     private readonly options: ServerOptions<ConfigType, ContextType>
//   ) {
//     this.config = this.options.configSchema.parse(process.env);
//   }
//
//   async listen(port = DEFAULT_PORT, host = DEFAULT_HOST) {
//     this.ctx = await this.options.init(this.config);
//     this.server.listen(port, host, () => {
//       const scheme = "http";
//       console.log(`Server listening on ${scheme}://${host}:${port}`);
//     });
//   }
//
//   private async responder(req: IncomingMessage, res: ServerResponse) {
//     try {
//       const request = Request.fromIncomingMessage(req);
//       const data = await this.handle(request);
//       const responder = new DefaultJsonResponder(data);
//       responder.respond(res);
//     } catch (err) {
//       handleError(err, res);
//     }
//   }
//
//   private async handle(req: Request) {
//     const { data: routeData, params } = this.router.parse(req.pathname);
//     if (!routeData) {
//       return this.tryStatic(req);
//     }
//     if (!routeData[req.method]) {
//       throw new MethodNotAllowedError();
//     }
//     const handler = routeData[req.method]!;
//
//     // TODO: check auth/roles
//
//     const query = handler.parseQuery(req);
//     // const body = handler.parseBody(req);
//
//     // TODO: make a nice action that wraps all this up into an object
//     return handler.callback({
//       params,
//       query,
//       // body,
//       // files,
//       // ctx,
//       // config,
//       // headers
//     });
//   }
//
//   private async tryStatic(req: Request) {
//     if (!this.staticPath) {
//       throw new NotFoundError();
//     }
//     const responder = StaticFileResponder.fromRequest(this.staticPath, req);
//     if (responder) {
//       return responder;
//     }
//     if (this.isSpa) {
//       return StaticFileResponder.fromDefaultPath(
//         `${this.staticPath}/index.html`
//       );
//     }
//     throw new NotFoundError();
//   }
// }
