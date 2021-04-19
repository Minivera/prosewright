export const tokens = {
  // Root tokens
  act: /act/i,
  scene: /scene/i,
  definitions: /definitions/i,
  main: /main/i,
  // Scope tokens
  scopeAct: /for +the +act/i,
  scopeScene: /for +the +scene/i,
  // play token
  play: /play/i,
  from: /from/i,
  // Variable interaction tokens
  remember: /remember/i,
  forget: /forget/i,
  recall: /recall/i,
  ask: /ask/i,
  answer: /answer/i,
  // Condition tokens
  if: /if/i,
  else: /(else|otherwise)/i,
  then: /then/,
  is: /(is|has|are)/i,
  not: /not/i,
  bigger: /(more|higher|bigger) +than/i,
  smaller: /(less|lower|smaller) +than/i,
  valid: /valid/i,
  and: /(and|but)/i,
  // Object tokens
  possession: /(possess(?:es)?|owns?|contains?|has)/i,
  access: /(who|which)/i,
  decrease: /decreased by/i,
  increase: /increased by/i,
  // Value tokens
  true: /true/i,
  false: /false/i,
  // General tokens
  listItem: /[*-]/i,
  subjectIdentified: /:/i,
  comma: /,/i,
  doubleQuotes: /"/i,
  endStatement: /[\n.]/i,
} as const;
