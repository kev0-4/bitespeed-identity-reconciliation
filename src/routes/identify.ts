import { Router, Request, Response } from "express";

export const identifyRouter = Router();

identifyRouter.post("/", (req: Request, res: Response) => {
  res.status(200).json({ message: "hello world" });
});
