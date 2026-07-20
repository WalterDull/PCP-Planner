import { NextResponse } from "next/server";
import { getCurrentUser, getOwnedProduct } from "@/lib/session";
import { db } from "@/lib/db";
import { evaluateDecisionTree, type DecisionTreeAnswers } from "@/lib/ccpDecisionTree";

async function getOwnedHazard(
  planId: string,
  productId: string,
  stepId: string,
  hazardId: string,
  userId: string
) {
  const product = await getOwnedProduct(planId, productId, userId);
  if (!product) return null;
  const step = await db.processStep.findFirst({ where: { id: stepId, productId: product.id } });
  if (!step) return null;
  return db.hazard.findFirst({ where: { id: hazardId, processStepId: step.id } });
}

const EDITABLE_FIELDS = [
  "type",
  "description",
  "isLikelyToOccur",
  "severity",
  "likelihood",
  "justification",
  "requiresPreventiveControl",
  "criticalLimit",
  "monitoringProcedure",
  "monitoringFrequency",
  "correctionAction",
  "verificationProcedure",
  "recordkeepingProcedure",
  "responsibleParty",
] as const;

const CCP_ANSWER_FIELDS = [
  "ccpQ1DoControlMeasuresExist",
  "ccpQ2IsStepSpecificallyToControl",
  "ccpQ3CouldContaminationExceedLimit",
  "ccpQ4WillLaterStepEliminate",
] as const;

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; productId: string; stepId: string; hazardId: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const hazard = await getOwnedHazard(params.id, params.productId, params.stepId, params.hazardId, user.id);
  if (!hazard) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  for (const field of EDITABLE_FIELDS) {
    if (field in body) data[field] = body[field];
  }
  for (const field of CCP_ANSWER_FIELDS) {
    if (field in body) data[field] = body[field];
  }

  // Re-run the decision tree whenever any CCP answer changes, so ccpStatus
  // always reflects the current answers rather than trusting the client.
  if (CCP_ANSWER_FIELDS.some((f) => f in body)) {
    const answers: DecisionTreeAnswers = {
      q1DoControlMeasuresExist: (data.ccpQ1DoControlMeasuresExist ?? hazard.ccpQ1DoControlMeasuresExist) as boolean | null,
      q2IsStepSpecificallyToControl: (data.ccpQ2IsStepSpecificallyToControl ?? hazard.ccpQ2IsStepSpecificallyToControl) as
        | boolean
        | null,
      q3CouldContaminationExceedLimit: (data.ccpQ3CouldContaminationExceedLimit ??
        hazard.ccpQ3CouldContaminationExceedLimit) as boolean | null,
      q4WillLaterStepEliminate: (data.ccpQ4WillLaterStepEliminate ?? hazard.ccpQ4WillLaterStepEliminate) as boolean | null,
    };
    const result = evaluateDecisionTree(answers);
    data.ccpStatus = result.status;
  }

  const updated = await db.hazard.update({ where: { id: hazard.id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; productId: string; stepId: string; hazardId: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const hazard = await getOwnedHazard(params.id, params.productId, params.stepId, params.hazardId, user.id);
  if (!hazard) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.hazard.delete({ where: { id: hazard.id } });
  return NextResponse.json({ ok: true });
}
