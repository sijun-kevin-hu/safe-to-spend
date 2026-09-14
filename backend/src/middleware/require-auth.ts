import { createUserSupabaseClient, supabase } from "../lib/supabase";

import express = require("express");

export async function requireAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid authorization header." });
    return;
  }

  const token = authorization.slice(7);

  const { data, error } = await supabase.auth.getUser(token);
  if (error || data.user == null) {
    res.status(401).json({ error: "Missing or invalid user" });
    return;
  }

  const userSupabase = createUserSupabaseClient(token);

  res.locals.user = data.user;
  res.locals.accessToken = token;
  res.locals.supabase = userSupabase;

  next();
}
