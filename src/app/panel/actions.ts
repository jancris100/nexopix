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

export async function decide(id: number, approved: boolean, decision?: panel.Decision) {
  await panel.decideApproval(id, approved, decision);
  return panel.loadPanel();
}

export async function pieceDetail(pieceId: number) {
  return Number.isInteger(pieceId) ? panel.pieceDetail(pieceId) : null;
}

/** Saves a new version of the content; the error comes in the language of the screen. */
export async function savePieceContent(pieceId: number, values: { idea: string; caption: string; hashtags: string; media: string[] }, note?: string) {
  const problem = await panel.savePieceContent(pieceId, values, note);
  if (problem) return { error: dictionaryFor(await getLocale()).piece.issues[problem] };
  return { detail: await panel.pieceDetail(pieceId), snapshot: await panel.loadPanel() };
}

/** "Publish now": the scheduler publishes the piece without waiting for its moment. */
export async function publishNow(pieceId: number) {
  const result = await panel.publishPiece(pieceId, "manual");
  const t = dictionaryFor(await getLocale()).piece;
  return {
    ok: result.ok,
    message: result.ok ? t.published : t.publishFailed(result.message || t.issues[result.code as keyof typeof t.issues] || result.code),
    detail: await panel.pieceDetail(pieceId),
    snapshot: await panel.loadPanel(),
  };
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

export async function pieceTrace(pieceId: number) {
  return Number.isInteger(pieceId) ? panel.pieceTrace(pieceId) : [];
}
