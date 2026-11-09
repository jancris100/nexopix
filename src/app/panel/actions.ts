"use server";

import { isDate } from "../../lib/dates";
import { dictionaryFor } from "../../i18n/dictionaries";
import { issueMessage } from "../../i18n/issues";
import { getLocale } from "../../i18n/server";
import * as panel from "../../lib/panel";

export async function weekAgenda(weekStart: string) {
  return panel.loadWeek(weekStart);
}

export async function instagramPosts() {
  return panel.instagramPosts();
}

export async function postInsights(accountId: string, mediaId: string) {
  return panel.instagramPostInsights(accountId, mediaId);
}

export async function toggleItem(id: number) {
  await panel.toggleAgendaItem(id);
  return panel.loadPanel();
}

export async function toggleAgent(id: string) {
  await panel.toggleAgent(id);
  return panel.loadPanel();
}

export async function addAccount(network: string, name: string, brand: string) {
  const refusal = await panel.addAccount(network, name, brand);
  if (!refusal) return { snapshot: await panel.loadPanel() };
  const errors = dictionaryFor(await getLocale()).addNetwork.errors;
  return { error: refusal.code === "duplicate" ? errors.duplicate(refusal.handle) : errors[refusal.code] };
}

export async function removeAccount(id: string) {
  await panel.removeAccount(id);
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
  const refusal = await panel.saveBrandProfile(id, profile);
  return refusal ? { error: dictionaryFor(await getLocale()).profile.websiteInvalid } : { snapshot: await panel.loadPanel() };
}

export async function addPublication(input: { title: string; format: string; accountId: string; network: string; date: string }) {
  const result = await panel.createRequest(
    { account: input.accountId, network: input.network, format: input.format, goal: input.title },
    isDate(input.date) ? input.date : undefined,
  );
  return result.ok ? { snapshot: await panel.loadPanel() } : { error: issueMessage(result.issue, await getLocale()) };
}

export async function saveOwner(values: panel.OwnerProfile) {
  const refusal = await panel.saveOwnerProfile(values);
  return refusal ? { error: dictionaryFor(await getLocale()).account.emailInvalid } : { snapshot: await panel.loadPanel() };
}
