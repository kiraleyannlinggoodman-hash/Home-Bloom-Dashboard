import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dashboardRouter from "./dashboard";
import plannerItemsRouter from "./plannerItems";
import studySessionsRouter from "./studySessions";
import quotesRouter from "./quotes";
import subjectsRouter from "./subjects";
import storageRouter from "./storage";
import focusSessionsRouter from "./focusSessions";
import progressRouter from "./progress";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(plannerItemsRouter);
router.use(studySessionsRouter);
router.use(quotesRouter);
router.use(subjectsRouter);
router.use(storageRouter);
router.use(focusSessionsRouter);
router.use(progressRouter);

export default router;
