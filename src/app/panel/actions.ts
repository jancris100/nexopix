"use server";

import * as panel from "../../lib/panel";

const isDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

export async function toggleItem(id: number) {
  await panel.toggleAgendaItem(id);
  return panel.loadPanel();
}

export async function toggleAgent(id: string) {
  await panel.toggleAgent(id);
  return panel.loadPanel();
}

export async function toggleAccount(id: string) {
  await panel.toggleAccount(id);
  return panel.loadPanel();
}

export async function advance(id: number) {
  await panel.advancePiece(id);
  return panel.loadPanel();
}

export async function decide(id: number, approved: boolean) {
  await panel.decideApproval(id, approved);
  return panel.loadPanel();
}

export async function saveProfile(id: string, profile: panel.BrandProfile) {
  const error = await panel.saveBrandProfile(id, profile);
  return error ? { error } : { snapshot: await panel.loadPanel() };
}

export async function addPublication(input: { title: string; format: string; accountId: string; network: string; date: string }) {
  const result = await panel.createRequest(
    { cuenta: input.accountId, red: input.network, formato: input.format, objetivo: input.title },
    isDate(input.date) ? input.date : undefined,
  );
  return result.ok ? { snapshot: await panel.loadPanel() } : { error: result.reason };
}
