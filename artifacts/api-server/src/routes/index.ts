import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import dashboardRouter from "./dashboard";
import hydrationRouter from "./hydration";
import sleepRouter from "./sleep";
import habitsRouter from "./habits";
import nutritionRouter from "./nutrition";
import streaksRouter from "./streaks";
import memoriesRouter from "./memories";
import reportsRouter from "./reports";
import openaiRouter from "./openai";
import notificationsRouter from "./notifications";
import vitalsRouter from "./vitals";
import researchRouter from "./research";
import chatRouter from "./chat";
import aiRouter from "./ai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(usersRouter);
router.use(dashboardRouter);
router.use(hydrationRouter);
router.use(sleepRouter);
router.use(habitsRouter);
router.use(nutritionRouter);
router.use(streaksRouter);
router.use(memoriesRouter);
router.use(reportsRouter);
router.use(openaiRouter);
router.use(notificationsRouter);
router.use(vitalsRouter);
router.use(researchRouter);
router.use(chatRouter);
router.use(aiRouter);

export default router;
