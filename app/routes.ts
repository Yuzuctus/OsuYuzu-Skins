import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  // Public routes
  index("routes/home.tsx"),
  route("api/image/:id", "routes/api.image.tsx"),
  route("api/download/:id", "routes/api.download.tsx"),
  route("api/download-all", "routes/api.download-all.tsx"),

  // Admin routes under /osu-direct
  layout("routes/osu-direct.tsx", [
    route("osu-direct", "routes/osu-direct._index.tsx"),
    route("osu-direct/skins", "routes/osu-direct.skins.tsx"),
    route("osu-direct/skins/new", "routes/osu-direct.skins.new.tsx"),
    route("osu-direct/skins/:id", "routes/osu-direct.skins.$id.tsx"),
    route("osu-direct/tags", "routes/osu-direct.tags.tsx"),
    route("osu-direct/logout", "routes/osu-direct.logout.tsx"),
  ]),

  // Auth routes (no layout wrapper)
  route("osu-direct/login", "routes/osu-direct.login.tsx"),
  route("osu-direct/setup", "routes/osu-direct.setup.tsx"),
] satisfies RouteConfig;
