import type { RequestHandler } from "express";

// Web and Expo clients use explicit bearer tokens, never ambient cookies.
// Apply before authentication so preflights and error responses are readable.
export const allowCrossOrigin: RequestHandler = (req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, PUT, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");

  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
};
