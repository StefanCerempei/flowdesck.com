export const DEMO_ROLE = "DEMO_GUEST";
export const DEMO_EMAIL = "jury-guest@flowdesck.test";
export const DEMO_NAME = "Timiș Rent Demo";
export const DEMO_USER_ID = "a6fd48bc-533d-45f8-96cc-284928097f67";
export const demoEnabled = () =>
  process.env.PUBLIC_DEMO_ENABLED === "true" &&
  /^[0-9a-f-]{36}$/i.test(process.env.PUBLIC_DEMO_COMPANY_ID || "");
export function validGuest(user) {
  return (
    user?.id === DEMO_USER_ID &&
    user.email === DEMO_EMAIL &&
    user.role === DEMO_ROLE &&
    user.companyId === process.env.PUBLIC_DEMO_COMPANY_ID &&
    user.company?.name === DEMO_NAME
  );
}
export const offlineDemoProvider = async () => {
  throw new Error("Public demo uses manual/rule-based analysis");
};

// Shared per-process ceilings also bound proxy/NAT traffic and fresh sessions.
export function limiter(limit, windowMs) {
  let count = 0,
    until = 0;
  return (req, res, next) => {
    if (Date.now() >= until) {
      count = 0;
      until = Date.now() + windowMs;
    }
    if (++count > limit) {
      res.set("Retry-After", String(Math.ceil((until - Date.now()) / 1000)));
      return res
        .status(429)
        .json({
          error: {
            code: "DEMO_RATE_LIMIT",
            message: "Demo is busy. Please try again shortly.",
          },
        });
    }
    next();
  };
}
