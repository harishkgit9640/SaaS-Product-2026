import express, { Router } from "express";
import { WebhookController } from "../controllers/webhookController";

export const webhookRouter = Router();

// Razorpay signature verification requires exact raw body bytes.
webhookRouter.post("/razorpay", express.raw({ type: "application/json" }), WebhookController.razorpay);
