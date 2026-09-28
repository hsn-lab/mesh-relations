import { Router, type IRouter } from "express";
import healthRouter from "./health";
import diagramsRouter from "./diagrams";

const router: IRouter = Router();

router.use(healthRouter);
router.use(diagramsRouter);

export default router;
