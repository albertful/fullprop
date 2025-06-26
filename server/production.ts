import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import "./invoiceService"; // Initialize invoice service with cron jobs

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const reqPath = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (reqPath.startsWith("/api")) {
      let logLine = `${req.method} ${reqPath} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }
      console.log(logLine);
    }
  });

  next();
});

// Serve static files - using simple approach without path resolution
try {
  app.use(express.static("dist/client"));
} catch (error) {
  console.warn("Static files not found, API-only mode");
}

// API routes
const server = app.listen(process.env.PORT || 5000, "0.0.0.0", () => {
  console.log(`Server running on port ${process.env.PORT || 5000}`);
});

registerRoutes(app);

// Serve React app for all non-API routes
app.get("*", (req, res) => {
  try {
    res.sendFile("index.html", { root: "dist/client" });
  } catch (error) {
    res.status(404).json({ message: "Frontend not found" });
  }
});

// Error handling
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  console.error(`Error ${status}: ${message}`);
  res.status(status).json({ message });
});

export default app;