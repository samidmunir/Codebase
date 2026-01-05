export const authenticate = (req, res, next) => {
  const userID = req.headers["x-user-id"];
  if (!userID) {
    return res.status(401).json({ ok: false, message: "Missing x-user-id" });
  }

  req.userID = userID;
  next();
};
