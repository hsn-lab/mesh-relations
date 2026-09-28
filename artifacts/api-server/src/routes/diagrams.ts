import { Router, type IRouter, type Request } from "express";
import { requireAuth } from "@clerk/express";
import { and, desc, eq } from "drizzle-orm";
import { db, diagramsTable, type DiagramNode, type DiagramRelation } from "@workspace/db";

const router: IRouter = Router();

const relations = new Set<DiagramRelation>(["neutral", "negative", "positive"]);

type RequestWithAuth = Request & {
  auth: () => { userId: string | null };
};

function ownerId(req: Request) {
  const userId = (req as RequestWithAuth).auth().userId;
  if (!userId) {
    throw new Error("Authenticated user is required");
  }
  return userId;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseNodes(value: unknown): DiagramNode[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 100) return null;

  const nodes: DiagramNode[] = [];
  for (const node of value) {
    if (!isRecord(node)) return null;
    if (
      typeof node.id !== "string" ||
      node.id.length === 0 ||
      node.id.length > 100 ||
      typeof node.name !== "string" ||
      node.name.length > 200 ||
      typeof node.x !== "number" ||
      !Number.isFinite(node.x) ||
      typeof node.y !== "number" ||
      !Number.isFinite(node.y) ||
      (node.imageUrl !== null && typeof node.imageUrl !== "string")
    ) {
      return null;
    }
    nodes.push({
      id: node.id,
      name: node.name,
      imageUrl: node.imageUrl,
      x: node.x,
      y: node.y,
    });
  }
  return nodes;
}

function parseRelations(value: unknown): Record<string, DiagramRelation> | null {
  if (!isRecord(value)) return null;
  const parsed: Record<string, DiagramRelation> = {};
  for (const [key, relation] of Object.entries(value)) {
    if (!relations.has(relation as DiagramRelation)) return null;
    parsed[key] = relation as DiagramRelation;
  }
  return parsed;
}

function parsePayload(body: unknown) {
  if (!isRecord(body)) return null;
  const name = body.name;
  const nodes = parseNodes(body.nodes);
  const relationMap = parseRelations(body.relations);
  if (
    typeof name !== "string" ||
    name.trim().length === 0 ||
    name.trim().length > 120 ||
    nodes === null ||
    relationMap === null
  ) {
    return null;
  }
  return {
    name: name.trim(),
    nodes,
    relations: relationMap,
  };
}

function serializeDiagram(diagram: typeof diagramsTable.$inferSelect) {
  return {
    id: diagram.id,
    name: diagram.name,
    nodes: diagram.nodes,
    relations: diagram.relations,
    createdAt: diagram.createdAt.toISOString(),
    updatedAt: diagram.updatedAt.toISOString(),
  };
}

router.use(requireAuth());

router.get("/diagrams", async (req, res, next) => {
  try {
    const diagrams = await db
      .select({
        id: diagramsTable.id,
        name: diagramsTable.name,
        createdAt: diagramsTable.createdAt,
        updatedAt: diagramsTable.updatedAt,
      })
      .from(diagramsTable)
      .where(eq(diagramsTable.ownerUserId, ownerId(req)))
      .orderBy(desc(diagramsTable.updatedAt));
    res.json(
      diagrams.map((diagram) => ({
        ...diagram,
        createdAt: diagram.createdAt.toISOString(),
        updatedAt: diagram.updatedAt.toISOString(),
      })),
    );
  } catch (error) {
    next(error);
  }
});

router.get("/diagrams/:id", async (req, res, next) => {
  try {
    const [diagram] = await db
      .select()
      .from(diagramsTable)
      .where(and(eq(diagramsTable.id, req.params.id), eq(diagramsTable.ownerUserId, ownerId(req))))
      .limit(1);
    if (!diagram) {
      res.status(404).json({ message: "Diagram not found" });
      return;
    }
    res.json(serializeDiagram(diagram));
  } catch (error) {
    next(error);
  }
});

router.post("/diagrams", async (req, res, next) => {
  try {
    const payload = parsePayload(req.body);
    if (!payload) {
      res.status(400).json({ message: "A name, at least one node, and valid relations are required" });
      return;
    }
    const [diagram] = await db
      .insert(diagramsTable)
      .values({ ...payload, ownerUserId: ownerId(req) })
      .returning();
    res.status(201).json(serializeDiagram(diagram));
  } catch (error) {
    next(error);
  }
});

router.patch("/diagrams/:id", async (req, res, next) => {
  try {
    const payload = parsePayload(req.body);
    if (!payload) {
      res.status(400).json({ message: "A name, at least one node, and valid relations are required" });
      return;
    }
    const [diagram] = await db
      .update(diagramsTable)
      .set({ ...payload, updatedAt: new Date() })
      .where(and(eq(diagramsTable.id, req.params.id), eq(diagramsTable.ownerUserId, ownerId(req))))
      .returning();
    if (!diagram) {
      res.status(404).json({ message: "Diagram not found" });
      return;
    }
    res.json(serializeDiagram(diagram));
  } catch (error) {
    next(error);
  }
});

router.delete("/diagrams/:id", async (req, res, next) => {
  try {
    const [diagram] = await db
      .delete(diagramsTable)
      .where(and(eq(diagramsTable.id, req.params.id), eq(diagramsTable.ownerUserId, ownerId(req))))
      .returning({ id: diagramsTable.id });
    if (!diagram) {
      res.status(404).json({ message: "Diagram not found" });
      return;
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;