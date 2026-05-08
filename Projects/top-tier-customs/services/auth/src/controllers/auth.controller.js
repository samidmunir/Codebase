import ENV from "../config/env.js";

export const health = async (_req, res) => {
  return res.status(200).json({
    ok: true,
    source: "<api.auth>: health()",
    message: `/api/auth is live on http://localhost:${ENV.PORT}`,
  });
};
