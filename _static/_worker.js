// functions/date.ts
var onRequest = () => new Response(new Date().toISOString());

// node_modules/88b/index.js
async function onRequest2({ request, next }) {
  const response = await next();
  if (response.status !== 200) {
    console.log(`${request.url} returned (${response.status}), skipping`);
    return response;
  }
  const contentType = response.headers.get("content-type");
  if (!contentType.includes("text/html") || contentType === null) {
    return response;
  }
  const links = [];
  class ElementHandler {
    element(element) {
      const url = element.getAttribute("href");
      const rel = element.getAttribute("rel");
      const as = element.getAttribute("as");
      if (url && !url.startsWith("data:") && !url.startsWith("http")) {
        links.push({ url, rel, as });
      }
    }
  }
  const addwithRewriter = new HTMLRewriter().on("link[rel=preconnect],link[rel=preload]", new ElementHandler()).transform(response);
  const body = await addwithRewriter.text();
  const headers = new Headers(addwithRewriter.headers);
  links.forEach(({ url, rel, as }) => {
    let link = `<${url}>; rel="${rel}"`;
    if (as) {
      link += `; as=${as}`;
    }
    headers.append("Link", link);
  });
  return new Response(body, { ...response, headers });
}
var routes2 = [
  {
    routePath: "/",
    mountPath: "/",
    method: "",
    middlewares: [onRequest2],
    modules: []
  }
];
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (code >= 48 && code <= 57 || code >= 65 && code <= 90 || code >= 97 && code <= 122 || code === 95) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a;
  var defaultPattern = "[^".concat(escapeString(options.delimiter || "/#?"), "]+?");
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  };
  var mustConsume = function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  };
  var consumeText = function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  };
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || defaultPattern,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? defaultPattern : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    };
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            route += "((?:".concat(token.pattern, ")").concat(token.modifier, ")");
          } else {
            route += "(".concat(token.pattern, ")").concat(token.modifier);
          }
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request, relativePathname) {
  for (const route of [...routes2].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(relativePathname);
    const mountMatchResult = mountMatcher(relativePathname);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes2) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(relativePathname);
    const mountMatchResult = mountMatcher(relativePathname);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
function pages_template_plugin_default(pluginArgs) {
  const onRequest22 = async (workerContext) => {
    let { request } = workerContext;
    const { env, next, data } = workerContext;
    const url = new URL(request.url);
    const relativePathname = `/${url.pathname.split(workerContext.functionPath)[1] || ""}`.replace(/^\/\//, "/");
    const handlerIterator = executeRequest(request, relativePathname);
    const pluginNext = async (input, init) => {
      if (input !== void 0) {
        request = new Request(input, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request,
          functionPath: workerContext.functionPath + path,
          next: pluginNext,
          params,
          data,
          pluginArgs,
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext)
        };
        const response = await handler(context);
        return new Response(
          [101, 204, 205, 304].includes(response.status) ? null : response.body,
          { ...response, headers: new Headers(response.headers) }
        );
      } else {
        return next();
      }
    };
    return pluginNext();
  };
  return onRequest22;
}

// functions/e.ts
var onRequest3 = [
  async (context) => {
    console.log("req");
    const response = await pages_template_plugin_default()(context);
    console.log(response.headers.get("link"));
    return response;
  }
];

// node_modules/2ll/index.js
async function onRequest4({ request, next }) {
  const response = await next();
  if (response.status !== 200) {
    console.log(`${request.url} returned (${response.status}), skipping`);
    return response;
  }
  const contentType = response.headers.get("content-type");
  if (!contentType.includes("text/html") || contentType === null) {
    return response;
  }
  const links = [];
  class ElementHandler {
    element(element) {
      const url = element.getAttribute("href");
      const rel = element.getAttribute("rel");
      const as = element.getAttribute("as");
      if (url && !url.startsWith("data:") && !url.startsWith("http")) {
        links.push({ url, rel, as });
      }
    }
  }
  const addwithRewriter = new HTMLRewriter().on("link[rel=preconnect],link[rel=preload]", new ElementHandler()).transform(response);
  const body = await addwithRewriter.text();
  const headers = new Headers(addwithRewriter.headers);
  links.forEach(({ url, rel, as }) => {
    let link = `<${url}>; rel="${rel}"`;
    if (as) {
      link += `; as=${as}`;
    }
    headers.append("Link", link);
  });
  return new Response(body, { ...response, headers });
}
var routes3 = [
  {
    routePath: "/",
    mountPath: "/",
    method: "",
    middlewares: [onRequest4],
    modules: []
  }
];
function lexer2(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (code >= 48 && code <= 57 || code >= 65 && code <= 90 || code >= 97 && code <= 122 || code === 95) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
function parse2(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer2(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a;
  var defaultPattern = "[^".concat(escapeString2(options.delimiter || "/#?"), "]+?");
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  };
  var mustConsume = function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  };
  var consumeText = function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  };
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || defaultPattern,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? defaultPattern : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
function match2(str, options) {
  var keys = [];
  var re = pathToRegexp2(str, keys, options);
  return regexpToFunction2(re, keys, options);
}
function regexpToFunction2(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    };
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
function escapeString2(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
function flags2(options) {
  return options && options.sensitive ? "" : "i";
}
function regexpToRegexp2(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
function arrayToRegexp2(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp2(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags2(options));
}
function stringToRegexp2(path, keys, options) {
  return tokensToRegexp2(parse2(path, options), keys, options);
}
function tokensToRegexp2(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString2(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString2(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString2(encode(token));
    } else {
      var prefix = escapeString2(encode(token.prefix));
      var suffix = escapeString2(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            route += "((?:".concat(token.pattern, ")").concat(token.modifier, ")");
          } else {
            route += "(".concat(token.pattern, ")").concat(token.modifier);
          }
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags2(options));
}
function pathToRegexp2(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp2(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp2(path, keys, options);
  return stringToRegexp2(path, keys, options);
}
var escapeRegex2 = /[.+?^${}()|[\]\\]/g;
function* executeRequest2(request, relativePathname) {
  for (const route of [...routes3].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match2(route.routePath.replace(escapeRegex2, "\\$&"), {
      end: false
    });
    const mountMatcher = match2(route.mountPath.replace(escapeRegex2, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(relativePathname);
    const mountMatchResult = mountMatcher(relativePathname);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes3) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match2(route.routePath.replace(escapeRegex2, "\\$&"), {
      end: true
    });
    const mountMatcher = match2(route.mountPath.replace(escapeRegex2, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(relativePathname);
    const mountMatchResult = mountMatcher(relativePathname);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
function pages_template_plugin_default2(pluginArgs) {
  const onRequest22 = async (workerContext) => {
    let { request } = workerContext;
    const { env, next, data } = workerContext;
    const url = new URL(request.url);
    const relativePathname = `/${url.pathname.split(workerContext.functionPath)[1] || ""}`.replace(/^\/\//, "/");
    const handlerIterator = executeRequest2(request, relativePathname);
    const pluginNext = async (input, init) => {
      if (input !== void 0) {
        request = new Request(input, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request,
          functionPath: workerContext.functionPath + path,
          next: pluginNext,
          params,
          data,
          pluginArgs,
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext)
        };
        const response = await handler(context);
        return new Response(
          [101, 204, 205, 304].includes(response.status) ? null : response.body,
          { ...response, headers: new Headers(response.headers) }
        );
      } else {
        return next();
      }
    };
    return pluginNext();
  };
  return onRequest22;
}

// functions/early-hints.ts
var onRequest5 = [
  async (context) => {
    console.log("req");
    const response = await pages_template_plugin_default2()(context);
    console.log(response.headers.get("link"));
    return response;
  }
];

// functions/throw.ts
var onRequest6 = () => {
  throw new Error("Waaa");
};

// node_modules/@cloudflare/pages-plugin-static-forms/index.js
var onRequestPost = async ({
  request,
  next,
  pluginArgs
}) => {
  let formData, name;
  try {
    formData = await request.formData();
    name = formData.get("static-form-name").toString();
  } catch {
  }
  if (name) {
    formData.delete("static-form-name");
    return pluginArgs.respondWith({ formData, name });
  }
  return next();
};
var onRequestGet = async ({ next }) => {
  const response = await next();
  return new HTMLRewriter().on("form", {
    element(form) {
      const formName = form.getAttribute("data-static-form-name");
      form.setAttribute("method", "POST");
      form.removeAttribute("action");
      form.append(`<input type="hidden" name="static-form-name" value="${formName}" />`, { html: true });
    }
  }).transform(response);
};
var routes4 = [
  {
    routePath: "/",
    mountPath: "/",
    method: "GET",
    middlewares: [onRequestGet],
    modules: []
  },
  {
    routePath: "/",
    mountPath: "/",
    method: "POST",
    middlewares: [onRequestPost],
    modules: []
  }
];
function lexer3(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (code >= 48 && code <= 57 || code >= 65 && code <= 90 || code >= 97 && code <= 122 || code === 95) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at " + i);
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at ' + j);
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at " + j);
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at " + i);
      if (!pattern)
        throw new TypeError("Missing pattern at " + i);
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
function parse3(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer3(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a;
  var defaultPattern = "[^" + escapeString3(options.delimiter || "/#?") + "]+?";
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  };
  var mustConsume = function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected " + nextType + " at " + index + ", expected " + type);
  };
  var consumeText = function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  };
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || defaultPattern,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? defaultPattern : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
function match3(str, options) {
  var keys = [];
  var re = pathToRegexp3(str, keys, options);
  return regexpToFunction3(re, keys, options);
}
function regexpToFunction3(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    };
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
function escapeString3(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
function flags3(options) {
  return options && options.sensitive ? "" : "i";
}
function regexpToRegexp3(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
function arrayToRegexp3(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp3(path, keys, options).source;
  });
  return new RegExp("(?:" + parts.join("|") + ")", flags3(options));
}
function stringToRegexp3(path, keys, options) {
  return tokensToRegexp3(parse3(path, options), keys, options);
}
function tokensToRegexp3(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d;
  var endsWith = "[" + escapeString3(options.endsWith || "") + "]|$";
  var delimiter = "[" + escapeString3(options.delimiter || "/#?") + "]";
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString3(encode(token));
    } else {
      var prefix = escapeString3(encode(token.prefix));
      var suffix = escapeString3(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:" + prefix + "((?:" + token.pattern + ")(?:" + suffix + prefix + "(?:" + token.pattern + "))*)" + suffix + ")" + mod;
          } else {
            route += "(?:" + prefix + "(" + token.pattern + ")" + suffix + ")" + token.modifier;
          }
        } else {
          route += "(" + token.pattern + ")" + token.modifier;
        }
      } else {
        route += "(?:" + prefix + suffix + ")" + token.modifier;
      }
    }
  }
  if (end) {
    if (!strict)
      route += delimiter + "?";
    route += !options.endsWith ? "$" : "(?=" + endsWith + ")";
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiter.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:" + delimiter + "(?=" + endsWith + "))?";
    }
    if (!isEndDelimited) {
      route += "(?=" + delimiter + "|" + endsWith + ")";
    }
  }
  return new RegExp(route, flags3(options));
}
function pathToRegexp3(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp3(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp3(path, keys, options);
  return stringToRegexp3(path, keys, options);
}
function* executeRequest3(request, relativePathname) {
  for (const route of [...routes4].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match3(route.routePath, { end: false });
    const mountMatcher = match3(route.mountPath, { end: false });
    const matchResult = routeMatcher(relativePathname);
    const mountMatchResult = mountMatcher(relativePathname);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes4) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match3(route.routePath, { end: true });
    const mountMatcher = match3(route.mountPath, { end: false });
    const matchResult = routeMatcher(relativePathname);
    const mountMatchResult = mountMatcher(relativePathname);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
function template_plugin_default(pluginArgs) {
  const onRequest8 = async (workerContext) => {
    let { request } = workerContext;
    const { env, next, data } = workerContext;
    const url = new URL(request.url);
    const relativePathname = `/${url.pathname.split(workerContext.functionPath)[1] || ""}`.replace(/^\/\//, "/");
    const handlerIterator = executeRequest3(request, relativePathname);
    const pluginNext = async (input, init) => {
      if (input !== void 0) {
        request = new Request(input, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request,
          functionPath: workerContext.functionPath + path,
          next: pluginNext,
          params,
          data,
          pluginArgs,
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext)
        };
        const response = await handler(context);
        return new Response([101, 204, 205, 304].includes(response.status) ? null : response.body, { ...response, headers: new Headers(response.headers) });
      } else {
        return next();
      }
    };
    return pluginNext();
  };
  return onRequest8;
}

// functions/_middleware.ts
var onRequest7 = [
  ({ next }) => {
    try {
      return next();
    } catch (thrown) {
      return new Response(`${thrown}`, { status: 500 });
    }
  },
  pages_template_plugin_default2({}),
  template_plugin_default({
    respondWith: ({ formData, name }) => {
      const email = formData.get("email");
      return new Response(`Hello, ${email}! Thank you for submitting the ${name} form.`);
    }
  })
];

// C:/Users/User/AppData/Local/Temp/functionsRoutes-0.5518491969201054.mjs
var routes = [
  {
    routePath: "/date",
    mountPath: "/",
    method: "",
    middlewares: [],
    modules: [onRequest]
  },
  {
    routePath: "/e",
    mountPath: "/",
    method: "",
    middlewares: [],
    modules: [onRequest3]
  },
  {
    routePath: "/early-hints",
    mountPath: "/",
    method: "",
    middlewares: [],
    modules: [onRequest5]
  },
  {
    routePath: "/throw",
    mountPath: "/",
    method: "",
    middlewares: [],
    modules: [onRequest6]
  },
  {
    routePath: "/",
    mountPath: "/",
    method: "",
    middlewares: [onRequest7],
    modules: []
  }
];

// C:/Users/User/AppData/Roaming/npm/node_modules/wrangler/node_modules/path-to-regexp/dist.es2015/index.js
function lexer4(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (code >= 48 && code <= 57 || code >= 65 && code <= 90 || code >= 97 && code <= 122 || code === 95) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
function parse4(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer4(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a;
  var defaultPattern = "[^".concat(escapeString4(options.delimiter || "/#?"), "]+?");
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  };
  var mustConsume = function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  };
  var consumeText = function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  };
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || defaultPattern,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? defaultPattern : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
function match4(str, options) {
  var keys = [];
  var re = pathToRegexp4(str, keys, options);
  return regexpToFunction4(re, keys, options);
}
function regexpToFunction4(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    };
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
function escapeString4(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
function flags4(options) {
  return options && options.sensitive ? "" : "i";
}
function regexpToRegexp4(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
function arrayToRegexp4(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp4(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags4(options));
}
function stringToRegexp4(path, keys, options) {
  return tokensToRegexp4(parse4(path, options), keys, options);
}
function tokensToRegexp4(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString4(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString4(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString4(encode(token));
    } else {
      var prefix = escapeString4(encode(token.prefix));
      var suffix = escapeString4(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            route += "((?:".concat(token.pattern, ")").concat(token.modifier, ")");
          } else {
            route += "(".concat(token.pattern, ")").concat(token.modifier);
          }
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags4(options));
}
function pathToRegexp4(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp4(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp4(path, keys, options);
  return stringToRegexp4(path, keys, options);
}

// C:/Users/User/AppData/Roaming/npm/node_modules/wrangler/templates/pages-template-worker.ts
var escapeRegex3 = /[.+?^${}()|[\]\\]/g;
function* executeRequest4(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match4(route.routePath.replace(escapeRegex3, "\\$&"), {
      end: false
    });
    const mountMatcher = match4(route.mountPath.replace(escapeRegex3, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match4(route.routePath.replace(escapeRegex3, "\\$&"), {
      end: true
    });
    const mountMatcher = match4(route.mountPath.replace(escapeRegex3, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
var pages_template_worker_default = {
  async fetch(request, env, workerContext) {
    const handlerIterator = executeRequest4(request);
    const data = {};
    const next = async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          data,
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext)
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    };
    try {
      return next();
    } catch (err) {
      return new Response("Internal Error", { status: 500 });
    }
  }
};
var cloneResponse = (response) => new Response(
  [101, 204, 205, 304].includes(response.status) ? null : response.body,
  response
);
export {
  pages_template_worker_default as default
};
