import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dashboardRouter from "./dashboard";
import tasksRouter from "./tasks";
import examsRouter from "./exams";
import scheduleRouter from "./schedule";
import studySessionsRouter from "./studySessions";
import quotesRouter from "./quotes";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(tasksRouter);
router.use(examsRouter);
router.use(scheduleRouter);
router.use(studySessionsRouter);
router.use(quotesRouter);

export default router;
