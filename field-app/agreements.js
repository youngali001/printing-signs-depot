/* ============================================================================
 * agreements.js — Structured content for all customer agreements.
 *
 * Each agreement is data (not HTML), so the same source drives BOTH the
 * on-screen rendering and the generated PDF packet.
 *
 * Block types:
 *   {h: "..."}         section heading
 *   {p: "..."}         paragraph
 *   {li: ["...", ...]} bullet / numbered list
 *   {initial: "id", label: "..."}   an initials box the customer must tap-sign
 *   {sign: "role", label: "..."}    a signature box (role: "customer" | "company")
 *
 * Placeholders like [COMPANY LEGAL NAME] are filled from Settings at render time.
 * {{customerName}}, {{address}}, {{jobNumber}}, {{date}} come from the job.
 * ========================================================================== */

const LEGAL_DISCLAIMER =
  'Template — not legal advice. Have a licensed attorney in your state review ' +
  'before use.';

const AGREEMENTS = [
  /* ---------------------------------------------------------------- 01 MSA */
  {
    id: 'msa',
    code: '01',
    title: 'Master Service Agreement',
    when: 'Every job',
    defaultOn: true,
    blocks: [
      { p: 'This Master Service Agreement ("Agreement") is between [COMPANY LEGAL NAME], d/b/a [DBA / TRADE NAME], [STATE] license #[STATE LICENSE #] ("Company," "we," "us"), and the customer identified below ("Customer," "you"). By signing below, scheduling work, or allowing the Company to begin work, you agree to all terms in this Agreement and the documents it incorporates.' },
      { h: '1. Scope of Work' },
      { p: 'The Company will perform only the specific work described in the written estimate, work authorization, or change order(s) for this job (the "Work"). Anything not expressly listed is excluded. General handyman services are repair and maintenance services; they are not a guarantee of any particular result, appearance, code compliance of pre-existing conditions, or future performance of aging systems.' },
      { h: '2. Estimates vs. Final Price' },
      { p: 'Estimates are good-faith approximations based on visible conditions and information you provide. The final price may differ due to concealed conditions, added work you request, changes in material costs, or additional access/labor required. Material changes are handled by Change Order.' },
      { h: '3. Customer Responsibilities & Warranties' },
      { p: 'You represent, warrant, and agree that:' },
      { li: [
        'You own the property or are legally authorized to approve the Work, and have any required HOA, landlord, or co-owner consent.',
        'You have disclosed all known hazards and concealed conditions (wiring, plumbing, gas lines, asbestos, lead, mold, structural issues, pets, etc.).',
        'You will provide safe, clear, and timely access to the work area, plus working utilities as needed.',
        'You will remove or secure all valuables, fragile items, irreplaceable or sentimental property, cash, jewelry, electronics, and important data from the work area before Work begins.',
        'You will keep children, pets, and other occupants away from active work areas.',
      ] },
      { h: '4. Limitation of Liability' },
      { p: 'TO THE MAXIMUM EXTENT PERMITTED BY LAW: (a) The Company\'s total cumulative liability for any and all claims arising out of or relating to the Work — whether based in contract, negligence, warranty, or otherwise — shall not exceed [LIABILITY CAP]. (b) The Company shall NOT be liable for any indirect, incidental, special, consequential, or punitive damages — including loss of use, loss of property value, water/mold/fire damage arising after a repair, lost income, lost data, or alternative lodging — even if advised of the possibility. (c) The Company is not responsible for damage to or loss of items of extraordinary, unique, or sentimental value unless their presence and value were disclosed in writing in advance and separately agreed to. (d) These limitations reflect the agreed allocation of risk and the price charged, and survive completion or termination of the Work.' },
      { initial: 'msa_liability', label: 'I have read and agree to the Limitation of Liability (§4).' },
      { h: '5. Disclaimers & Exclusions' },
      { p: 'The Company is not responsible for: (1) Pre-existing conditions; (2) Concealed/latent conditions (in-wall wiring/plumbing, rot, mold, asbestos, lead, termite/pest damage, structural issues); (3) Hazardous materials — the Company does not test for, remediate, or disturb asbestos, lead, mold, or other hazmat; if encountered, Work stops and a qualified specialist is required at Customer\'s expense; (4) Cosmetic variation — exact matching of paint, stain, grout, caulk, tile, or finishes is not guaranteed; (5) Aging systems — repairs may not restore them to like-new condition or prevent future failure elsewhere; (6) Customer-supplied materials; (7) Bringing pre-existing, non-conforming work up to current code unless expressly authorized; (8) Work requiring a specialty license beyond the Company\'s license scope.' },
      { initial: 'msa_disclaimers', label: 'I have read and agree to the Disclaimers & Exclusions (§5).' },
      { h: '6. Limited Warranty' },
      { p: 'The Company\'s only warranty is the written Limited Warranty. ALL OTHER WARRANTIES, EXPRESS OR IMPLIED — INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE — ARE DISCLAIMED TO THE EXTENT PERMITTED BY LAW. Manufactured products carry only the manufacturer\'s warranty, passed through to you.' },
      { h: '7. Claims — Notice & Time Limit' },
      { p: 'Any claim of damage, defect, or dissatisfaction must be made in writing within [CLAIM WINDOW] days of the date the relevant Work was performed (or, for damage discovered later, within [CLAIM WINDOW] days of completion). You must give the Company a reasonable opportunity to inspect and, at its option, to repair or re-perform before engaging anyone else or incurring costs. Failure to give timely written notice waives the claim. Repair/re-performance by the Company is your exclusive remedy.' },
      { initial: 'msa_claims', label: 'I understand the written-claim deadline (§7).' },
      { h: '8. Payment, Late Fees & Liens' },
      { p: 'Payment is due as stated in the estimate/invoice. Past-due amounts accrue a late charge to the maximum allowed by law. You may not withhold payment over a disputed item unrelated to amounts properly owed. To the extent permitted by [STATE] law, the Company reserves all lien and collection rights, and you agree to pay reasonable collection and attorneys\' fees.' },
      { h: '9. Cancellation & Scheduling' },
      { p: 'Deposits and cancellation/reschedule fees are as stated in the estimate. The Company may reschedule for weather, safety, illness, or supply delays without liability.' },
      { h: '10. Schedule / No Time-of-the-Essence' },
      { p: 'Completion dates are estimates only. Time is not of the essence. The Company is not liable for delays caused by weather, concealed conditions, change orders, supply/vendor delays, permits, third parties, or other causes beyond its reasonable control (force majeure), including storms, hurricanes, floods, fire, utility outages, labor shortages, and governmental action.' },
      { h: '11. Insurance' },
      { p: 'The Company maintains general liability insurance and (where applicable) workers\' compensation. Customer is responsible for insuring Customer\'s own property; nothing here makes the Company an insurer of the property.' },
      { h: '12. Indemnification' },
      { p: 'You agree to indemnify and hold the Company harmless from claims, damages, and expenses (including attorneys\' fees) arising from your breach of this Agreement; your failure to disclose hazards/conditions; your lack of authority to approve the Work; conditions you directed; or materials you supplied.' },
      { h: '13. Dispute Resolution & Governing Law' },
      { p: 'This Agreement is governed by the laws of the State of [STATE]. The parties will first attempt to resolve disputes through good-faith negotiation. Exclusive venue for any court proceeding is the state or federal courts located in [COUNTY], [STATE]. (Optional binding-arbitration/jury-waiver language to be confirmed by your attorney.)' },
      { initial: 'msa_dispute', label: 'I have read the Dispute Resolution & Governing Law terms (§13).' },
      { h: '14. Entire Agreement / Severability / Amendments' },
      { p: 'This Agreement, with the documents it incorporates, is the entire agreement and supersedes prior discussions or verbal promises. If any provision is unenforceable, the rest remains in effect. Changes must be in writing and signed or confirmed by both parties.' },
      { p: 'By signing, Customer acknowledges they have read, understood, and agree to this Agreement, including the Limitation of Liability (§4), Disclaimers (§5), and Claim deadline (§7).' },
      { sign: 'customer', label: 'Customer signature' },
      { sign: 'company', label: 'Company representative' },
    ],
  },

  /* -------------------------------------------------------- 02 WAIVER */
  {
    id: 'waiver',
    code: '02',
    title: 'Liability Waiver, Release & Assumption of Risk',
    when: 'Every job / higher-risk work',
    defaultOn: true,
    blocks: [
      { p: 'This Waiver supplements the Master Service Agreement between [COMPANY LEGAL NAME] d/b/a [DBA / TRADE NAME] ("Company") and the Customer.' },
      { h: '1. Assumption of Risk' },
      { p: 'Customer understands that handyman, repair, and maintenance work involves inherent risks, including dust, noise, debris, temporary loss of water/power, tools and sharp/heavy materials on site, wet surfaces, open access points, and the possibility that concealed or pre-existing conditions are disturbed or revealed. Customer knowingly and voluntarily assumes these risks.' },
      { h: '2. Release of Claims' },
      { p: 'To the maximum extent permitted by law, Customer, on behalf of themselves and their household, guests, heirs, and assigns, releases and discharges the Company and its owners, employees, and subcontractors from any and all claims, demands, and liabilities for property damage or loss arising out of or relating to the Work, except for damage caused by the Company\'s gross negligence or willful misconduct, and except as otherwise required by law.' },
      { initial: 'waiver_release', label: 'I have read and agree to the Release of Claims (§2).' },
      { h: '3. Property in the Work Area' },
      { p: 'Customer agrees to remove or secure all personal property, valuables, fragile, irreplaceable, and sentimental items from the work area before Work begins. The Company is not responsible for items left in the work area, and is not responsible for items of extraordinary value unless disclosed in writing and separately agreed in advance.' },
      { initial: 'waiver_property', label: 'I understand I am responsible for securing valuables (§3).' },
      { h: '4. Occupants, Children & Pets' },
      { p: 'Customer is solely responsible for keeping children, pets, and other occupants safely away from active work areas, tools, materials, and access points, and for controlling and securing pets during each visit.' },
      { h: '5. Moving / Relocating Items' },
      { p: 'If Company moves or relocates any of Customer\'s items to access the work area, it does so at Customer\'s request and risk; the limitations and exclusions in the MSA apply to any resulting damage.' },
      { h: '6. Pre-Existing & Concealed Conditions' },
      { p: 'Customer acknowledges the Company is not responsible for pre-existing or concealed conditions, including any condition that worsens or becomes apparent as a result of normal, reasonable performance of the Work.' },
      { h: '7. No Waiver Beyond What Law Allows' },
      { p: 'Nothing in this document attempts to waive any liability that cannot lawfully be waived. This Waiver is read together with, and limited by, the Limitation of Liability in MSA §4.' },
      { sign: 'customer', label: 'Customer signature' },
      { sign: 'company', label: 'Company representative' },
    ],
  },

  /* -------------------------------------------- 03 PRE-EXISTING CONDITIONS */
  {
    id: 'preexisting',
    code: '03',
    title: 'Pre-Existing Conditions Disclosure',
    when: 'Before work starts',
    defaultOn: true,
    hasConditionChecklist: true, // triggers the photo + condition UI
    blocks: [
      { p: 'Purpose: to record the condition of the property and work area BEFORE Work begins, so both parties have a shared, honest record. The Company is not responsible for any condition, damage, defect, or code issue that existed before the Work, whether or not listed here.' },
      { h: 'Concealed-condition acknowledgment' },
      { p: 'Customer understands that conditions hidden inside walls, floors, ceilings, or behind fixtures (wiring, plumbing, gas, rot, mold, asbestos, lead, pest/structural damage) cannot be fully assessed in advance, and that discovering them may require a Change Order, additional cost, or stopping Work. The Company is not responsible for the existence of such conditions or for damage that results from their pre-existing failure.' },
      { h: 'Hazardous materials' },
      { p: 'Customer understands the Company does NOT disturb or remediate asbestos, lead paint, or mold, and a qualified specialist may be required at Customer\'s expense.' },
      { initial: 'pec_ack', label: 'I confirm the recorded conditions and understand the Company is not liable for pre-existing or concealed conditions.' },
      { sign: 'customer', label: 'Customer signature' },
      { sign: 'company', label: 'Inspected by (Company)' },
    ],
  },

  /* ------------------------------------------- 04 WORK AUTH / CHANGE ORDER */
  {
    id: 'workauth',
    code: '04',
    title: 'Work Authorization & Change Order',
    when: 'Start of job + any change',
    defaultOn: true,
    fields: [
      { key: 'scope', label: 'Authorized scope (only what is listed will be done)', type: 'textarea' },
      { key: 'exclusions', label: 'Explicitly NOT included / out of scope', type: 'textarea' },
      { key: 'pricing', label: 'Pricing basis (flat $ / hourly rate + est. hours)', type: 'text' },
      { key: 'materials', label: 'Materials (Company-supplied / Customer-supplied)', type: 'text' },
      { key: 'permits', label: 'Permits required? Responsible party', type: 'text' },
    ],
    blocks: [
      { p: 'By signing, Customer authorizes the Company to perform the scope above under the Master Service Agreement, and confirms the Pre-Existing Conditions record was completed. Anything discovered mid-job that changes scope, cost, safety, or timeline requires a signed Change Order before that work proceeds; the Company is not responsible for the existence of concealed/pre-existing conditions.' },
      { sign: 'customer', label: 'Customer signature' },
      { sign: 'company', label: 'Company representative' },
    ],
  },

  /* ------------------------------------------------------- 05 WARRANTY */
  {
    id: 'warranty',
    code: '05',
    title: 'Limited Workmanship Warranty',
    when: 'Given after completion',
    defaultOn: false,
    blocks: [
      { h: '1. What is covered' },
      { p: 'The Company warrants that the labor/workmanship for the specific Work performed will be free from defects in workmanship under normal use for a period of [WARRANTY PERIOD] days from the completion date.' },
      { h: '2. Your exclusive remedy' },
      { p: 'If a covered workmanship defect appears within the warranty period and you give written notice within [CLAIM WINDOW] days of discovery, the Company will, at its sole option, repair or re-perform the affected Work at no labor charge. Repair or re-performance is your sole and exclusive remedy. The Company is not liable for refunds beyond, or damages exceeding, the limits in MSA §4.' },
      { h: '3. What is NOT covered' },
      { p: 'This warranty does not cover: materials/products (manufacturer warranty only; customer-supplied materials excluded entirely); pre-existing and concealed conditions; aging/deteriorated systems; cosmetic variation; normal wear, settling, shrinkage, and seasonal movement; misuse, neglect, alteration, or repair by others; damage from weather, water intrusion, pests, power surges, accidents, abuse, or acts of God; work the Company recommended against or that the Customer directed contrary to the Company\'s advice.' },
      { initial: 'warranty_excl', label: 'I understand what the warranty does not cover (§3).' },
      { h: '4. Conditions' },
      { p: 'This warranty applies only if the job was paid in full and is non-transferable (original Customer at the original address only). It is void if others alter or work on the same item/area.' },
      { h: '5. Disclaimer of other warranties' },
      { p: 'EXCEPT FOR THIS LIMITED WARRANTY, AND TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE COMPANY DISCLAIMS ALL OTHER WARRANTIES, EXPRESS OR IMPLIED, INCLUDING THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE. Some states do not allow certain disclaimers, so parts may not apply to you.' },
      { initial: 'warranty_disc', label: 'I have read the disclaimer of other warranties (§5).' },
      { sign: 'customer', label: 'Acknowledged — Customer' },
      { sign: 'company', label: 'Company representative' },
    ],
  },

  /* ------------------------------------------- 06 CUSTOMER-SUPPLIED MATERIALS */
  {
    id: 'materials',
    code: '06',
    title: 'Customer-Supplied Materials Acknowledgment',
    when: 'When customer supplies materials',
    defaultOn: false,
    fields: [
      { key: 'supplied_items', label: 'Materials provided by Customer', type: 'textarea' },
    ],
    blocks: [
      { p: 'Customer understands and agrees:' },
      { li: [
        'No responsibility for the materials themselves — the Company did not select, supply, or warrant these materials and is not responsible for their quality, suitability, condition, fit, code-compliance, defects, or failure.',
        'No warranty — customer-supplied materials are excluded from the Company\'s Limited Warranty. Any warranty is solely the manufacturer\'s or seller\'s.',
        'Suitability is Customer\'s call — if the Company advises a supplied material is unsuitable, undersized, defective, incompatible, or not to code and Customer directs installation anyway, Customer assumes all risk and releases and indemnifies the Company.',
        'Consequential damage — the Company is not liable for any damage, leak, failure, or loss arising from a defect in or failure of Customer-supplied materials.',
        'Shortages/wrong items/delays may incur additional charges via Change Order and are not the Company\'s fault.',
        'Handling, returning, or disposing of Customer-supplied materials is Customer\'s responsibility unless separately agreed.',
      ] },
      { initial: 'materials_ack', label: 'I acknowledge the Company is not responsible for materials I supply.' },
      { p: 'Where Customer supplies materials, the Company\'s work is installation labor only; any workmanship warranty covers only the installation labor, not the supplied item.' },
      { sign: 'customer', label: 'Customer signature' },
      { sign: 'company', label: 'Company representative' },
    ],
  },

  /* ------------------------------------------------ 07 COMPLETION SIGN-OFF */
  {
    id: 'completion',
    code: '07',
    title: 'Completion & Satisfaction Sign-Off',
    when: 'At job completion',
    defaultOn: false,
    fields: [
      { key: 'punch_list', label: 'Punch list — remaining items (if any)', type: 'textarea' },
      { key: 'damage_noted', label: 'Damage noted at walkthrough (if any)', type: 'textarea' },
      { key: 'balance', label: 'Final payment / balance', type: 'text' },
    ],
    blocks: [
      { p: 'Customer and the Company representative walked through the completed Work together. By signing, Customer confirms:' },
      { li: [
        'The Work was completed as authorized, or any remaining items are listed in the punch list above — and nothing else is outstanding.',
        'The Work is acceptable and performed in a workmanlike manner.',
        'No new property damage was observed during the walkthrough other than any item noted above.',
        'Customer received the Limited Warranty and understands its limits and the written-claim deadline.',
        'Any defect or damage discovered later must be reported in writing within [CLAIM WINDOW] days of discovery, and the Company must be allowed to inspect and repair/re-perform first.',
      ] },
      { initial: 'completion_ack', label: 'I confirm the work is complete and acceptable as described.' },
      { sign: 'customer', label: 'Customer signature' },
      { sign: 'company', label: 'Company representative' },
    ],
  },
];

/* Areas for the Pre-Existing Conditions photo checklist */
const CONDITION_AREAS = [
  'Floors',
  'Walls / ceilings',
  'Trim / doors / windows',
  'Plumbing / fixtures',
  'Electrical / outlets / panel',
  'Cabinets / counters',
  'Exterior / driveway / landscaping',
  'Appliances / HVAC',
  'Other',
];

if (typeof window !== 'undefined') {
  window.AGREEMENTS = AGREEMENTS;
  window.CONDITION_AREAS = CONDITION_AREAS;
  window.LEGAL_DISCLAIMER = LEGAL_DISCLAIMER;
}
