import type { Rule } from '../models';
import { headerRules } from './headers';
import { cspRules } from './csp';
import { cookieRules } from './cookies';
import { corsRules } from './cors';
import { transportRules } from './transport';
import { crossOriginRules } from './cross-origin';
import { disclosureRules } from './disclosure';
import { redirectRules } from './redirects';

/** Every rule Klynto ships, in stable order. */
export const ALL_RULES: readonly Rule[] = [
  ...transportRules,
  ...headerRules,
  ...cspRules,
  ...cookieRules,
  ...corsRules,
  ...crossOriginRules,
  ...disclosureRules,
  ...redirectRules,
];

const RULES_BY_ID = new Map(ALL_RULES.map((rule) => [rule.id, rule]));

export function getRule(ruleId: string): Rule | undefined {
  return RULES_BY_ID.get(ruleId);
}

export function rulesForModule(moduleId: string): Rule[] {
  return ALL_RULES.filter((rule) => rule.moduleId === moduleId);
}

export function ruleCount(): number {
  return ALL_RULES.length;
}
