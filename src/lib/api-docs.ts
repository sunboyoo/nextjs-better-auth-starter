import { promises as fs } from "fs";
import path from "path";
import { cache } from "react";

const PROJECT_ROOT = process.cwd();
const APP_ROOT = path.join(PROJECT_ROOT, "src", "app");
const API_ROOT = path.join(APP_ROOT, "api");

const SUPPORTED_HTTP_METHODS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
] as const;

type HttpMethod = (typeof SUPPORTED_HTTP_METHODS)[number];
type AppUsageScope = "dashboard" | "admin";
type RoleScope = "user" | "admin";

export type EndpointRecord = {
  endpoint: string;
  methods: HttpMethod[];
  sourceFiles: string[];
  unresolved: boolean;
};

export type ApiDocsPageData = {
  appScope: AppUsageScope;
  roleScope: RoleScope;
  usedEndpoints: EndpointRecord[];
  roleDesignedEndpoints: EndpointRecord[];
  authClientUsageFiles: string[];
};

type RouteDefinition = {
  endpoint: string;
  methods: HttpMethod[];
  sourceFile: string;
};

type UsageAccumulator = {
  endpoint: string;
  sourceFiles: Set<string>;
};

function toPosix(filePath: string): string {
  return filePath.split(path.sep).join("/");
}

function stripQueryAndTrailingSlash(endpoint: string): string {
  const withoutQuery = endpoint.split("?")[0];
  if (withoutQuery.length > 1 && withoutQuery.endsWith("/")) {
    return withoutQuery.slice(0, -1);
  }
  return withoutQuery;
}

function expressionToParamName(expression: string): string {
  const tokens = expression.match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? [];
  if (tokens.length === 0) return "param";

  let candidate = tokens[tokens.length - 1] ?? "param";
  if (candidate === "toString" && tokens.length > 1) {
    candidate = tokens[tokens.length - 2] ?? "param";
  }
  if (candidate === "id" && tokens.length > 1) {
    const previous = tokens[tokens.length - 2];
    candidate =
      previous && previous !== "params" && previous !== "data"
        ? `${previous}Id`
        : "id";
  }
  return candidate;
}

function normalizeDisplayEndpoint(endpoint: string): string {
  const noQuery = stripQueryAndTrailingSlash(endpoint);
  return noQuery.replace(/\$\{([^}]+)\}/g, (_match, expression: string) => {
    return `[${expressionToParamName(expression)}]`;
  });
}

function endpointKey(endpoint: string): string {
  return stripQueryAndTrailingSlash(endpoint)
    .replace(/\$\{[^}]+\}/g, "[]")
    .replace(/\[[^\]]+\]/g, "[]")
    .replace(/\/+/g, "/");
}

async function listFilesRecursive(dirPath: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const nested = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          return listFilesRecursive(fullPath);
        }
        if (entry.isFile()) {
          return [fullPath];
        }
        return [];
      }),
    );
    return nested.flat();
  } catch {
    return [];
  }
}

function extractHttpMethods(routeSource: string): HttpMethod[] {
  const methods = new Set<HttpMethod>();
  const regex =
    /export\s+(?:(?:async\s+)?function|const)\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS)\b/g;
  let match: RegExpExecArray | null = regex.exec(routeSource);
  while (match) {
    const method = match[1] as HttpMethod;
    methods.add(method);
    match = regex.exec(routeSource);
  }
  return SUPPORTED_HTTP_METHODS.filter((method) => methods.has(method));
}

function routeFileToEndpoint(routeFilePath: string): string | null {
  const relative = toPosix(path.relative(API_ROOT, routeFilePath));
  if (!relative.endsWith("/route.ts")) return null;
  const routePath = relative.replace(/\/route\.ts$/, "");
  return `/api/${routePath}`;
}

function extractApiEndpointLiterals(fileSource: string): string[] {
  const endpoints: string[] = [];
  const literalRegex = /(["'`])((?:\\.|(?!\1)[\s\S])*?)\1/g;
  let literalMatch: RegExpExecArray | null = literalRegex.exec(fileSource);
  while (literalMatch) {
    const content = literalMatch[2];
    if (content.includes("/api/")) {
      const endpointRegex = /\/api\/[A-Za-z0-9\-._~:/?#[\]@!$&'()*+,;=%{}]+/g;
      let endpointMatch: RegExpExecArray | null = endpointRegex.exec(content);
      while (endpointMatch) {
        endpoints.push(endpointMatch[0].replace(/[),.;]+$/g, ""));
        endpointMatch = endpointRegex.exec(content);
      }
    }
    literalMatch = literalRegex.exec(fileSource);
  }
  return endpoints;
}

const getAllRouteDefinitions = cache(async (): Promise<RouteDefinition[]> => {
  const routeFiles = (await listFilesRecursive(API_ROOT)).filter((filePath) =>
    filePath.endsWith("/route.ts"),
  );

  const definitions = await Promise.all(
    routeFiles.map(async (routeFilePath) => {
      const endpoint = routeFileToEndpoint(routeFilePath);
      if (!endpoint) return null;

      const source = await fs.readFile(routeFilePath, "utf8");
      const methods = extractHttpMethods(source);
      return {
        endpoint,
        methods,
        sourceFile: toPosix(path.relative(PROJECT_ROOT, routeFilePath)),
      } satisfies RouteDefinition;
    }),
  );

  return definitions
    .filter((definition): definition is RouteDefinition => definition !== null)
    .sort((a, b) => a.endpoint.localeCompare(b.endpoint));
});

const getRouteDefinitionIndex = cache(async () => {
  const definitions = await getAllRouteDefinitions();
  const index = new Map<string, RouteDefinition>();
  for (const definition of definitions) {
    const key = endpointKey(definition.endpoint);
    if (!index.has(key)) {
      index.set(key, definition);
    }
  }
  return index;
});

async function getRouteDefinitionsForScope(
  roleScope: RoleScope,
): Promise<RouteDefinition[]> {
  const allDefinitions = await getAllRouteDefinitions();
  return allDefinitions.filter((definition) =>
    definition.endpoint.startsWith(`/api/${roleScope}/`),
  );
}

async function getUsedEndpointsByScope(
  appScope: AppUsageScope,
): Promise<{
  records: EndpointRecord[];
  authClientUsageFiles: string[];
}> {
  const scopeDir = path.join(APP_ROOT, appScope);
  const sourceFiles = (await listFilesRecursive(scopeDir)).filter((filePath) =>
    /\.(ts|tsx|js|jsx)$/.test(filePath),
  );

  const usages = new Map<string, UsageAccumulator>();
  const authClientUsageFiles = new Set<string>();
  const routeIndex = await getRouteDefinitionIndex();

  await Promise.all(
    sourceFiles.map(async (filePath) => {
      const source = await fs.readFile(filePath, "utf8");
      const relativeFilePath = toPosix(path.relative(PROJECT_ROOT, filePath));

      if (/\bauthClient\.|\bauth\.api\./.test(source)) {
        authClientUsageFiles.add(relativeFilePath);
      }

      const endpoints = extractApiEndpointLiterals(source);
      for (const endpoint of endpoints) {
        const displayEndpoint = normalizeDisplayEndpoint(endpoint);
        const key = endpointKey(displayEndpoint);
        const existing = usages.get(key);
        if (existing) {
          existing.sourceFiles.add(relativeFilePath);
        } else {
          usages.set(key, {
            endpoint: displayEndpoint,
            sourceFiles: new Set([relativeFilePath]),
          });
        }
      }
    }),
  );

  const records: EndpointRecord[] = Array.from(usages.entries())
    .map(([key, usage]) => {
      const routeDefinition = routeIndex.get(key);
      return {
        endpoint: routeDefinition?.endpoint ?? usage.endpoint,
        methods: routeDefinition?.methods ?? [],
        sourceFiles: Array.from(usage.sourceFiles).sort(),
        unresolved: routeDefinition === undefined,
      } satisfies EndpointRecord;
    })
    .sort((a, b) => a.endpoint.localeCompare(b.endpoint));

  if (authClientUsageFiles.size > 0) {
    const authRouteDefinition = routeIndex.get(endpointKey("/api/auth/[...all]"));
    const authRecord: EndpointRecord = {
      endpoint: authRouteDefinition?.endpoint ?? "/api/auth/[...all]",
      methods: authRouteDefinition?.methods ?? [],
      sourceFiles: Array.from(authClientUsageFiles).sort(),
      unresolved: authRouteDefinition === undefined,
    };

    const existingIndex = records.findIndex(
      (record) => endpointKey(record.endpoint) === endpointKey(authRecord.endpoint),
    );

    if (existingIndex >= 0) {
      const mergedFiles = new Set([
        ...records[existingIndex].sourceFiles,
        ...authRecord.sourceFiles,
      ]);
      records[existingIndex] = {
        ...records[existingIndex],
        sourceFiles: Array.from(mergedFiles).sort(),
      };
    } else {
      records.push(authRecord);
      records.sort((a, b) => a.endpoint.localeCompare(b.endpoint));
    }
  }

  return {
    records,
    authClientUsageFiles: Array.from(authClientUsageFiles).sort(),
  };
}

async function getRoleDesignedEndpoints(
  roleScope: RoleScope,
): Promise<EndpointRecord[]> {
  const definitions = await getRouteDefinitionsForScope(roleScope);
  return definitions.map((definition) => ({
    endpoint: definition.endpoint,
    methods: definition.methods,
    sourceFiles: [definition.sourceFile],
    unresolved: false,
  }));
}

export async function getApiDocsPageData({
  appScope,
  roleScope,
}: {
  appScope: AppUsageScope;
  roleScope: RoleScope;
}): Promise<ApiDocsPageData> {
  const [used, roleDesignedEndpoints] = await Promise.all([
    getUsedEndpointsByScope(appScope),
    getRoleDesignedEndpoints(roleScope),
  ]);

  return {
    appScope,
    roleScope,
    usedEndpoints: used.records,
    roleDesignedEndpoints,
    authClientUsageFiles: used.authClientUsageFiles,
  };
}
