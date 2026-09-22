export const RESERVED_SLUGS = [
  "api",
  "admin",
  "login",
  "register",
  "dashboard",
  "settings",
  "new",
  "profile",
  "organizations",
] as const;

export const AUTH_COOKIE_NAME = "team_collab_token";

export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
