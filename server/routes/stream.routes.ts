import { Router } from "express";
import {
  createUserToken,
  sendZoneSystemMessage,
  upsertStreamUser,
  upsertZoneChannel,
} from "../services/stream.service";

const router = Router();

router.post("/token", async (request, response) => {
  const { id, name, role } = request.body ?? {};
  if (!id || !name || !role) {
    response.status(400).json({ error: "id, name, and role are required." });
    return;
  }

  await upsertStreamUser({ id, name, role });
  const token = createUserToken(id);
  response.json({ token });
});

router.post("/channels/zone", async (request, response) => {
  const { zoneId, zoneName, memberIds, createdBy } = request.body ?? {};
  if (!zoneId || !zoneName || !Array.isArray(memberIds) || !createdBy?.id) {
    response.status(400).json({ error: "zoneId, zoneName, memberIds, createdBy are required." });
    return;
  }

  await upsertZoneChannel({
    zoneId,
    zoneName,
    memberIds,
    createdBy,
  });

  response.json({ ok: true });
});

router.post("/channels/:zoneId/system-message", async (request, response) => {
  const zoneId = request.params.zoneId;
  const { text, createdBy, attachments } = request.body ?? {};
  if (!zoneId || !text || !createdBy?.id) {
    response.status(400).json({ error: "zoneId, text, createdBy are required." });
    return;
  }

  await sendZoneSystemMessage({
    zoneId,
    text,
    createdBy,
    attachments,
  });

  response.json({ ok: true });
});

router.post("/channels/:zoneId/inventory-event", async (request, response) => {
  const zoneId = request.params.zoneId;
  const { createdBy, itemId, itemName, quantity, unit } = request.body ?? {};
  if (!zoneId || !createdBy?.id || !itemId || !itemName) {
    response.status(400).json({ error: "zoneId, createdBy, itemId, itemName are required." });
    return;
  }

  await sendZoneSystemMessage({
    zoneId,
    text: `${quantity} ${unit} linked to ${itemName}.`,
    createdBy,
    attachments: [
      {
        type: "inventory_item",
        itemId,
        name: itemName,
        quantity,
        unit,
      },
    ],
  });

  response.json({ ok: true });
});

export { router as streamRoutes };
