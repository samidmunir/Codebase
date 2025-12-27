import ENV from "../config/env.js";

export const health = async (req, res) => {
  return res.status(200).json({
    ok: true,
    source: "<api.auth.controller>: health()",
    message: `/api/auth is live on http://localhost:${ENV.PORT}`,
  });
};

export const signup = async (req, res) => {
  try {
    //
  } catch (e) {
    //
  }
};
