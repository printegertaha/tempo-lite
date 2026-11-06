import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest } from "next/server";

const handler = toNextJsHandler(auth);

export async function GET(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const search = request.nextUrl.search;
  const host = request.headers.get("host") || "unknown";
  const origin = request.headers.get("origin") || "none";
  const cookies = request.headers.get("cookie")
    ? request.headers.get("cookie")!.split(";").map((c) => c.split("=")[0].trim()).join(", ")
    : "none";

  console.log(`🌐 [AUTH_GET] ${pathname}${search} | Host: ${host} | Origin: ${origin} | Cookies: [${cookies}]`);

  try {
    const response = await handler.GET(request);
    const setCookies = response.headers.get("set-cookie") ? "YES" : "NO";
    const location = response.headers.get("location") || "none";

    console.log(`📤 [AUTH_GET_RES] ${pathname} => Status: ${response.status} | Set-Cookie: ${setCookies} | Redirect: ${location}`);
    return response;
  } catch (error: any) {
    console.error(`🚨 [AUTH_GET_FATAL] ${pathname}${search}`, {
      message: error?.message,
      stack: error?.stack,
      cause: error?.cause,
    });
    throw error;
  }
}

export async function POST(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const host = request.headers.get("host") || "unknown";
  const origin = request.headers.get("origin") || "none";

  console.log(`🌐 [AUTH_POST] ${pathname} | Host: ${host} | Origin: ${origin}`);

  try {
    const response = await handler.POST(request);
    const setCookies = response.headers.get("set-cookie") ? "YES" : "NO";

    console.log(`📤 [AUTH_POST_RES] ${pathname} => Status: ${response.status} | Set-Cookie: ${setCookies}`);
    return response;
  } catch (error: any) {
    console.error(`🚨 [AUTH_POST_FATAL] ${pathname}`, {
      message: error?.message,
      stack: error?.stack,
      cause: error?.cause,
    });
    throw error;
  }
}




