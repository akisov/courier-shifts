import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const { email, name, password } = await request.json()

  if (!email || !password) {
    return NextResponse.json({ error: "Email и пароль обязательны" }, { status: 400 })
  }

  const authHeader = request.headers.get("authorization")
  if (!authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const token = authHeader.replace("Bearer ", "")

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Verify caller is admin
  const { data: { user }, error: authError } = await adminSupabase.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: callerProfile } = await adminSupabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!callerProfile || callerProfile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Create the courier account
  const { data: created, error: createError } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (createError || !created.user) {
    return NextResponse.json(
      { error: createError?.message || "Не удалось создать пользователя" },
      { status: 400 }
    )
  }

  // Upsert profile (handles both trigger-created and missing profiles)
  await adminSupabase.from("profiles").upsert({
    id: created.user.id,
    email,
    name: name?.trim() || null,
    role: "courier",
  })

  return NextResponse.json({
    id: created.user.id,
    email,
    name: name?.trim() || null,
    role: "courier",
  })
}
