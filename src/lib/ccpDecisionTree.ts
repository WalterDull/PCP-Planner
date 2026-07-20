/**
 * CCP / Preventive Control decision-tree engine.
 *
 * Implements the classic four-question Codex Alimentarius CCP decision tree,
 * consistent with CFIA's guidance for Preventive Control Plans under the
 * Safe Food for Canadians Regulations (SFCR), where a "CCP" maps to a point
 * requiring a process preventive control with a critical limit, and hazards
 * controlled by broader prerequisite programs (GMPs, sanitation, allergen,
 * supply-chain preventive controls) are handled outside this per-step tree.
 *
 * This is decision-support, not a substitute for review/sign-off by the
 * individual(s) responsible for food safety at your facility.
 */

export type YesNo = boolean;

export interface DecisionTreeAnswers {
  /** Q1: Do control measures exist for this hazard at this or a later step? */
  q1DoControlMeasuresExist: YesNo | null;
  /** Q2: Is this step specifically designed to eliminate/reduce the hazard to an acceptable level? */
  q2IsStepSpecificallyToControl: YesNo | null;
  /** Q3: Could contamination occur at, or increase to, an unacceptable level at this step? */
  q3CouldContaminationExceedLimit: YesNo | null;
  /** Q4: Will a later step eliminate the hazard or reduce it to an acceptable level? */
  q4WillLaterStepEliminate: YesNo | null;
}

export type DecisionResult =
  | { status: "NOT_A_CCP"; reasonKey: string; reason: string; nextQuestion: null }
  | { status: "CCP"; reasonKey: string; reason: string; nextQuestion: null }
  | { status: "PRW"; reasonKey: string; reason: string; nextQuestion: null }
  | { status: "NOT_EVALUATED"; reasonKey: null; reason: null; nextQuestion: keyof DecisionTreeAnswers };

export const QUESTION_TEXT: Record<keyof DecisionTreeAnswers, { short: string; help: string }> = {
  q1DoControlMeasuresExist: {
    short: "Do control measures exist for this hazard at this step or any later step?",
    help:
      "Think about whether anything in your process — at this step or downstream — is capable of preventing, eliminating, or reducing this hazard to an acceptable level. If no control measure exists anywhere, you may need to change the process, product, or method rather than proceed.",
  },
  q2IsStepSpecificallyToControl: {
    short: "Is this step specifically designed to eliminate the hazard or reduce it to an acceptable level?",
    help:
      "Example: a cook step designed to achieve a specific internal temperature is specifically intended to control a biological hazard. A generic mixing step usually is not.",
  },
  q3CouldContaminationExceedLimit: {
    short:
      "Could contamination with this hazard occur at, or increase to, an unacceptable level at this step?",
    help:
      "Consider the realistic likelihood the hazard is introduced or grows past a safe level here — based on your facility's history, the nature of the ingredient/process, and industry knowledge.",
  },
  q4WillLaterStepEliminate: {
    short: "Will a later step in the process eliminate the hazard or reduce it to an acceptable level?",
    help:
      "If a downstream step (e.g., a kill step, or a validated allergen cleanout) will control this hazard, this step itself may not need to be the control point.",
  },
};

/**
 * Runs the answers so far through the decision tree and returns either the
 * final classification or the next question that still needs an answer.
 */
export function evaluateDecisionTree(answers: DecisionTreeAnswers): DecisionResult {
  const { q1DoControlMeasuresExist, q2IsStepSpecificallyToControl, q3CouldContaminationExceedLimit, q4WillLaterStepEliminate } =
    answers;

  if (q1DoControlMeasuresExist === null) {
    return { status: "NOT_EVALUATED", reasonKey: null, reason: null, nextQuestion: "q1DoControlMeasuresExist" };
  }

  if (q1DoControlMeasuresExist === false) {
    return {
      status: "NOT_A_CCP",
      reasonKey: "no-control-measure",
      reason:
        "No control measure exists for this hazard at this or any later step. This is not a CCP as-is — consider whether the process, product formulation, or intended use needs to change to control the hazard elsewhere in the plan.",
      nextQuestion: null,
    };
  }

  if (q2IsStepSpecificallyToControl === null) {
    return { status: "NOT_EVALUATED", reasonKey: null, reason: null, nextQuestion: "q2IsStepSpecificallyToControl" };
  }

  if (q2IsStepSpecificallyToControl === true) {
    return {
      status: "CCP",
      reasonKey: "step-designed-to-control",
      reason:
        "This step is specifically designed to eliminate the hazard or reduce it to an acceptable level, so it is a Critical Control Point (CCP) / process preventive control point. Define a critical limit and monitoring procedure for it.",
      nextQuestion: null,
    };
  }

  if (q3CouldContaminationExceedLimit === null) {
    return { status: "NOT_EVALUATED", reasonKey: null, reason: null, nextQuestion: "q3CouldContaminationExceedLimit" };
  }

  if (q3CouldContaminationExceedLimit === false) {
    return {
      status: "NOT_A_CCP",
      reasonKey: "no-realistic-contamination-risk",
      reason:
        "Contamination with this hazard is not reasonably likely to occur or increase to an unacceptable level at this step, so it is not a CCP at this step.",
      nextQuestion: null,
    };
  }

  if (q4WillLaterStepEliminate === null) {
    return { status: "NOT_EVALUATED", reasonKey: null, reason: null, nextQuestion: "q4WillLaterStepEliminate" };
  }

  if (q4WillLaterStepEliminate === true) {
    return {
      status: "NOT_A_CCP",
      reasonKey: "later-step-controls",
      reason:
        "A later step in the process will eliminate this hazard or reduce it to an acceptable level, so this step is not the CCP — the later step should be evaluated instead.",
      nextQuestion: null,
    };
  }

  return {
    status: "CCP",
    reasonKey: "no-later-control-required-now",
    reason:
      "Contamination could reach an unacceptable level here and no later step will control it, so this step is a Critical Control Point (CCP). Define a critical limit and monitoring procedure for it.",
    nextQuestion: null,
  };
}

/** Convenience: returns the list of questions in tree order, for rendering progress. */
export const QUESTION_ORDER: (keyof DecisionTreeAnswers)[] = [
  "q1DoControlMeasuresExist",
  "q2IsStepSpecificallyToControl",
  "q3CouldContaminationExceedLimit",
  "q4WillLaterStepEliminate",
];
