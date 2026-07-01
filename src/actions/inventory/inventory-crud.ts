'use server';

import { firestore } from '@/firebase/server';
import { revalidatePath } from 'next/cache';
import { sendEmailWithRetry } from '@/lib/server/sendEmailWithRetry';
import { ADMIN_NOTIFICATION_EMAIL } from '@/lib/notification-email';
import {
  InventoryItem,
  InventoryItemInput,
  Warehouse,
  isLowStock,
} from '@/lib/inventory-types';

const col = () => firestore!.collection('inventoryItems');

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tequierofeliz.com';

const WAREHOUSE_LABEL: Record<Warehouse, string> = { cancun: 'Cancún', cdmx: 'CDMX' };

export async function getInventoryItems(): Promise<InventoryItem[]> {
  if (!firestore) return [];
  const snap = await col().orderBy('name').get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<InventoryItem, 'id'>) }));
}

/**
 * Fire a low-stock alert email for a single item. Best-effort: failures are
 * logged by sendEmailWithRetry and never block the write.
 */
async function sendLowStockEmail(item: {
  name: string; warehouse: Warehouse; quantity: number; minQuantity: number;
}): Promise<void> {
  const wh = WAREHOUSE_LABEL[item.warehouse];
  await sendEmailWithRetry({
    to: [ADMIN_NOTIFICATION_EMAIL],
    subject: `Inventario · stock bajo: ${item.name} (${wh})`,
    logType: 'inventory-low-stock',
    projectId: 'inventory',
    projectName: `Inventario ${wh}`,
    sentBy: 'system',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#1a0f0a;">
        <div style="background:#6b1a2a;padding:22px 28px;border-radius:12px 12px 0 0;">
          <h1 style="margin:0;color:#fff;font-size:19px;font-weight:400;letter-spacing:0.05em;">Te Quiero Feliz</h1>
          <p style="margin:4px 0 0;color:rgba(255,255,255,0.7);font-size:11px;letter-spacing:0.18em;text-transform:uppercase;">Inventario · Stock bajo</p>
        </div>
        <div style="background:#fff;padding:26px 28px;border:1px solid #e5d9d0;border-top:none;border-radius:0 0 12px 12px;">
          <p style="margin:0 0 16px;font-size:14px;color:#555;">Un artículo alcanzó su umbral mínimo y conviene reponerlo:</p>
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <tr style="border-bottom:1px solid #e5d9d0;"><td style="padding:9px 0;color:#555;">Artículo</td><td style="padding:9px 0;text-align:right;font-weight:600;">${item.name}</td></tr>
            <tr style="border-bottom:1px solid #e5d9d0;"><td style="padding:9px 0;color:#555;">Almacén</td><td style="padding:9px 0;text-align:right;">${wh}</td></tr>
            <tr style="border-bottom:1px solid #e5d9d0;"><td style="padding:9px 0;color:#555;">En stock</td><td style="padding:9px 0;text-align:right;font-weight:600;color:#991b1b;">${item.quantity}</td></tr>
            <tr><td style="padding:9px 0;color:#555;">Umbral mínimo</td><td style="padding:9px 0;text-align:right;">${item.minQuantity}</td></tr>
          </table>
          <a href="${SITE}/planner/inventario" style="display:inline-block;margin-top:20px;background:#6b1a2a;color:#fff;padding:10px 22px;border-radius:8px;text-decoration:none;font-size:13px;">Abrir Inventario</a>
        </div>
      </div>`,
  });
}

export async function saveInventoryItem(
  input: InventoryItemInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!firestore) return { success: false, error: 'Database non disponibile.' };
  try {
    const now = new Date().toISOString();
    const { id, ...data } = input;
    const nowLow = isLowStock(data);

    if (id) {
      // Recompute the notified flag against the previous state so we only email
      // on the transition into low-stock, and re-arm when restocked.
      const prevSnap = await col().doc(id).get();
      const prev = prevSnap.data() as InventoryItem | undefined;
      const wasNotified = prev?.lowStockNotified ?? false;

      let lowStockNotified = wasNotified;
      let shouldEmail = false;
      if (nowLow && !wasNotified) { shouldEmail = true; lowStockNotified = true; }
      if (!nowLow) { lowStockNotified = false; }

      await col().doc(id).update({ ...data, lowStockNotified, updatedAt: now });
      if (shouldEmail) await sendLowStockEmail(data);

      revalidatePath('/planner/inventario');
      return { success: true, id };
    }

    // New item — email immediately if it is already below threshold.
    const lowStockNotified = nowLow;
    const ref = await col().add({ ...data, lowStockNotified, createdAt: now, updatedAt: now });
    if (nowLow) await sendLowStockEmail(data);

    revalidatePath('/planner/inventario');
    return { success: true, id: ref.id };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Error.' };
  }
}

/**
 * Fast quantity change (the +/- controls). Handles the low-stock transition the
 * same way as a full save.
 */
export async function adjustInventoryQuantity(
  id: string,
  newQuantity: number
): Promise<{ success: boolean; error?: string }> {
  if (!firestore) return { success: false, error: 'Database non disponibile.' };
  if (newQuantity < 0) return { success: false, error: 'Cantidad inválida.' };
  try {
    const snap = await col().doc(id).get();
    const prev = snap.data() as InventoryItem | undefined;
    if (!prev) return { success: false, error: 'No encontrado.' };

    const nowLow = isLowStock({ quantity: newQuantity, minQuantity: prev.minQuantity });
    const wasNotified = prev.lowStockNotified ?? false;
    let lowStockNotified = wasNotified;
    let shouldEmail = false;
    if (nowLow && !wasNotified) { shouldEmail = true; lowStockNotified = true; }
    if (!nowLow) { lowStockNotified = false; }

    await col().doc(id).update({
      quantity: newQuantity,
      lowStockNotified,
      updatedAt: new Date().toISOString(),
    });
    if (shouldEmail) {
      await sendLowStockEmail({
        name: prev.name, warehouse: prev.warehouse,
        quantity: newQuantity, minQuantity: prev.minQuantity,
      });
    }
    revalidatePath('/planner/inventario');
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Error.' };
  }
}

export async function deleteInventoryItem(id: string): Promise<{ success: boolean; error?: string }> {
  if (!firestore) return { success: false, error: 'Database non disponibile.' };
  try {
    await col().doc(id).delete();
    revalidatePath('/planner/inventario');
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Error.' };
  }
}
