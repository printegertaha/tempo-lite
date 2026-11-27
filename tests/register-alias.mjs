import { register } from "node:module";
import { pathToFileURL } from "node:url";

const rootUrl = pathToFileURL(process.cwd() + "/").href;

const hookCode = `
export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const mapped = new URL(specifier.slice(2), ${JSON.stringify(rootUrl)}).href;
    for (const candidate of [mapped, mapped + ".ts", mapped + ".tsx", mapped + ".js", mapped + "/index.ts"]) {
      try {
        return await nextResolve(candidate, context);
      } catch {}
    }
  }
  if ((specifier.startsWith("./") || specifier.startsWith("../")) && !specifier.endsWith(".ts") && !specifier.endsWith(".js")) {
    for (const ext of [".ts", ".tsx", ".js", "/index.ts"]) {
      try {
        return await nextResolve(specifier + ext, context);
      } catch {}
    }
  }
  return nextResolve(specifier, context);
}
`;

register("data:text/javascript," + encodeURIComponent(hookCode));
