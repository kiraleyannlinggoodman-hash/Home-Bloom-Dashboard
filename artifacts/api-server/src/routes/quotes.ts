import { Router, type IRouter } from "express";
import { GetDailyQuoteResponse } from "@workspace/api-zod";
import { quoteForDate } from "../lib/quotes";
import { todayDateString } from "../lib/dates";

const router: IRouter = Router();

router.get("/quotes/daily", (_req, res): void => {
  const quote = quoteForDate(todayDateString());
  res.json(GetDailyQuoteResponse.parse(quote));
});

export default router;
