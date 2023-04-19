import { getParts, tokenizeRoute } from "./utils";
import { RouterData } from "../server/router-data";

/**
 * The router consists of a tree of `RouterNode`s
 * each node contains a map of text strings to RouterNodes
 * or a single RouterNode for the default case when a node matches a param key.
 */
class RouterNode<T> {
  textNodes: Record<string, RouterNode<T>> = {};
  withKey?: RouterNode<T>;
  wildcard?: boolean;
  keyName?: string;
  data?: T;
  keys: string[] = [];
}

/**
 * When parsing a URL and searching for the matching route, a RouteResult is returned.
 * This includes an object with the matching callbacks (keyed by HTTP method)
 * and any parameter values as a Record of key:value pairs.
 */
interface RouteResult<T> {
  data: T | null;
  params: Record<string, string>;
}

export class Router {
  root: RouterNode<RouterData>;
  constructor() {
    this.root = new RouterNode();
  }

  addRoute(route: string): RouterData {
    const keyList: string[] = [];
    let node = this.root;
    for (const { type, value } of tokenizeRoute(route)) {
      if (type === "text") {
        node.textNodes[value] = node.textNodes[value] ?? new RouterNode();
        /* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */
        node = node.textNodes[value]!;
      } else if (type === "wildcard") {
        node.wildcard = true;
      } else {
        node.keyName = value;
        keyList.push(value);
        node.withKey = node.withKey ?? new RouterNode();
        node = node.withKey;
      }
    }
    if (!node.data) {
      node.data = new RouterData();
    }
    node.keys = keyList;
    return node.data;
  }

  parse(path: string): RouteResult<RouterData> {
    let node = this.root;
    const params: string[] = [];
    for (const part of getParts(path)) {
      if (node.wildcard) {
        return { data: node.data ?? null, params: { path } };
      }
      if (node.textNodes[part]) {
        /* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */
        node = node.textNodes[part]!;
      } else if (node.withKey) {
        params.push(part);
        node = node.withKey;
      } else {
        return { data: null, params: {} };
      }
    }
    return { data: node.data ?? null, params: zip(node.keys, params) };
  }
}

function zip(a: string[], b: string[]): Record<string, string> {
  const output: Record<string, string> = {};
  for (let i = 0; i < a.length && i < b.length; i++) {
    /* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */
    const key = a[i]!;
    /* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */
    output[key] = b[i]!;
  }
  return output;
}
