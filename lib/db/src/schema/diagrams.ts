import { pgTable, text, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";

export type DiagramRelation = "neutral" | "negative" | "positive";

export type DiagramNode = {
  id: string;
  name: string;
  imageUrl: string | null;
  x: number;
  y: number;
};

export const diagramsTable = pgTable("diagrams", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerUserId: text("owner_user_id").notNull(),
  name: text("name").notNull(),
  nodes: jsonb("nodes").$type<DiagramNode[]>().notNull(),
  relations: jsonb("relations").$type<Record<string, DiagramRelation>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Diagram = typeof diagramsTable.$inferSelect;
export type InsertDiagram = typeof diagramsTable.$inferInsert;