export const authenticate = (req, res, next) => {
  const userID = req.headers["x-user-id"];
  if (!userID) {
    return res.status(401).json({
      source: "api.payments.middleware[auth]: authenticate()",
      message: "Missing x-user-id header",
      success: false,
    });
  }

  req.userID = userID;
  next();
};
