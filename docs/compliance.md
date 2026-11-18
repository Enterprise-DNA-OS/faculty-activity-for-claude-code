# Privacy and local reporting checks

Sources checked 18 November 2026. These are record-quality prompts for a New Zealand institution, not a legal certification or a complete privacy programme. The owner sets access, collection notices, lawful purposes, security, retention authorities and any Australian or other local requirements before real use. No personal contact details, student data or performance scores are collected by default.

| Check | Implementation | Source and limit |
|---|---|---|
| IPP1-purpose | Flag a blank collection purpose on an academic | [NZ Privacy Commissioner, principle 1](https://www.privacy.org.nz/privacy-principles/1/). A recorded purpose does not establish necessity or lawfulness. |
| IPP8-accuracy | Flag draft activities; require human verification and evidence before submission; edits clear verification | [Principle 8](https://www.privacy.org.nz/privacy-principles/8/). The checker must review the actual source; a reference does not prove accuracy. |
| IPP9-review | Flag missing, overdue or unsupported retention reviews | [Principle 9](https://www.privacy.org.nz/privacy-principles/9/). The review date is institution policy, not a statutory retention period. No automatic disposal. |
| IPP3A-notice | Flag missing notice or exception basis and supporting evidence | [Principle 3A](https://www.privacy.org.nz/privacy-principles/3a/). Indirect collection requires notice unless an exception applies. The institution determines applicability, including whether the record was collected directly. |
| LOCAL-return-due | Flag draft annual returns past cycles.due_on | Local institution deadline, not legislation. |

Use review-privacy to record the reviewed purpose, next review date, retention evidence, notice or exception basis and notice evidence. Submission refuses unresolved faculty-level findings. It also refuses unverified included activities. A zero-activity declaration records a reporting fact, not an employment assessment.

Public institutions may have disposal restrictions under the Public Records Act. Consult the institution’s approved disposal authority and holds before removing records. [Privacy Commissioner guidance](https://www.privacy.org.nz/assets/New-order/Resources-/Publications/Guidance-resources/Privacy-Impact-Assessment-Part-2-FA.pdf) explicitly recognises other legal retention requirements. This base provides no deletion command. Retention review applies to private exports and generated reports too.

Actor labels do not authenticate staff. Database-owner access can bypass row security and alter controls. Configure real identities, roles, encryption, backups and external audit protection before shared hosting. Evidence references are stored as text and are never fetched automatically.
