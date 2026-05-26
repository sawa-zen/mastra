import { Mastra } from "@mastra/core";
import { LibSQLStore } from "@mastra/libsql";
import { zensuke } from "./agents/zensuke";

const databaseUrl = process.env.DATABASE_URL ?? "file:./db.sqlite";

export const mastra = new Mastra({
  agents: { zensuke },
  storage: new LibSQLStore({ id: "zensuke-storage", url: databaseUrl }),
});
