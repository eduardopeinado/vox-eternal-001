import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { serialize } from "cookie";

export async function POST(req: NextRequest) {
  try {
    const { access_token, refresh_token } = await req.json();

    if (!access_token || !refresh_token) {
      return NextResponse.json({ error: "Faltan tokens" }, { status: 400 });
    }

    // Set cookies for SSR session propagation
    const accessTokenCookie = serialize("sb-access-token", access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 días
    });
    const refreshTokenCookie = serialize("sb-refresh-token", refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 días
    });

    const response = NextResponse.json({ ok: true });
    response.headers.append("Set-Cookie", accessTokenCookie);
    response.headers.append("Set-Cookie", refreshTokenCookie);

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Error interno" }, { status: 500 });
  }
}
