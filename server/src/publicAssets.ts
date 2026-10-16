import fs from "fs";
import path from "path";
import express, { type Express } from "express";

/** Serve Vite build from dist/public (bundled with the serverless function). */
export function attachPublicAssets(app: Express, dirname: string): void {
  const publicDir = path.join(dirname, "public");
  if (!fs.existsSync(publicDir)) {
    console.warn("public assets missing at", publicDir);
    return;
  }

  app.use(
    express.static(publicDir, {
      index: false,
      maxAge: "1h",
    })
  );

  app.get(/^(?!\/api\/)(?!\/socket\.io).*/, (req, res, next) => {
    const filePath = path.join(publicDir, req.path);
    if (req.path !== "/" && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return res.sendFile(filePath);
    }
    res.sendFile(path.join(publicDir, "index.html"), (err) => {
      if (err) next(err);
    });
  });
}
