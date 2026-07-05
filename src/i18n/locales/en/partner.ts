import type { PartnerNS } from '../types';

/**
 * Partner namespace — translations for the partner (security-company) module.
 * Ported from the agent app's partner.json during the enterprise migration;
 * structure is locked to PartnerNS so EN and FR stay in shape-parity.
 *
 * Plural keys use i18next's _one/_other convention.
 */
const partner: PartnerNS = {
  "dashboard": {
    "title": "Dashboard",
    "loading": "Loading…",
    "greeting": {
      "morning": "Good morning",
      "afternoon": "Good afternoon",
      "evening": "Good evening",
      "fallback": "Partner"
    },
    "sections": {
      "team": "My team",
      "missions": "Missions",
      "finances": "Finances",
      "quickAccess": "Quick access"
    },
    "kpi": {
      "agents": "Agents",
      "validated": "Verified",
      "active": "Active",
      "completed": "Completed",
      "scheduledPayouts": "Scheduled payouts",
      "totalPaid": "Total paid"
    },
    "actions": {
      "team": "My team",
      "teamSub": "Manage and track agents",
      "finances": "Finances & payroll",
      "financesSub": "Summary and per-agent breakdown",
      "billing": "Team billing",
      "billingSub": "Generate PDF summary",
      "compliance": "Company compliance",
      "complianceSub": "Kbis, CNAPS, URSSAF, tax, liability",
      "documents": "Company documents",
      "documentsSub": "All submitted legal documents",
      "editCompany": "My company",
      "editCompanySub": "Edit legal information",
      "createMission": "Post a mission",
      "createMissionSub": "Publish a new assignment",
      "myMissions": "My missions",
      "myMissionsSub": "Track and manage posted missions"
    }
  },
  "team": {
    "title": "My team",
    "subtitle_one": "{{count}} agent",
    "subtitle_other": "{{count}} agents",
    "loading": "Loading team…",
    "search": {
      "placeholder": "Name, email, city…"
    },
    "filters": {
      "all": "All",
      "validated": "Verified",
      "pending": "Pending",
      "alerts": "Alerts"
    },
    "pills": {
      "cnapsValidated": "CNAPS verified",
      "cnapsNotValidated": "Not verified",
      "missions": "{{count}} missions"
    },
    "alerts": {
      "rejected_one": "{{count}} document rejected",
      "rejected_other": "{{count}} documents rejected",
      "missing_one": "{{count}} mandatory document missing",
      "missing_other": "{{count}} mandatory documents missing",
      "expiring_one": "{{count}} document expiring within 30 days",
      "expiring_other": "{{count}} documents expiring within 30 days",
      "pending_one": "{{count}} document under review",
      "pending_other": "{{count}} documents under review"
    },
    "empty": {
      "noAgentsTitle": "No agents",
      "noAgentsSubtitle": "Your team is empty. Invite agents to join your organisation.",
      "noResultsBySearch": "No agents match «{{search}}».",
      "noResultsByFilter": "No agents in this category."
    }
  },
  "agentDetail": {
    "title": "Agent detail",
    "loading": "Loading…",
    "sections": {
      "documents": "Documents",
      "onboarding": "Onboarding",
      "info": "Information"
    },
    "pills": {
      "cnapsValidated": "CNAPS verified",
      "cnapsNotValidated": "Not verified"
    },
    "onboarding": {
      "title": "Onboarding progress",
      "steps": {
        "profile": "Profile created",
        "documents": "Documents submitted",
        "cnaps": "CNAPS approved",
        "stripe": "Bank account set up"
      }
    },
    "docs": {
      "status": {
        "approved": "Approved",
        "pending": "Under review",
        "rejected": "Rejected",
        "missing": "To provide",
        "expired": "Expired"
      },
      "empty": "No documents submitted."
    },
    "errors": {
      "notFound": "Agent not found."
    }
  },
  "financials": {
    "title": "Team finances",
    "subtitle": "Payroll & payouts",
    "loading": "Loading finances…",
    "period": {
      "label": "Selected period",
      "all": "All periods",
      "pickTitle": "Select period",
      "year": "Year {{year}}",
      "all_periods": "All"
    },
    "totals": {
      "paid": "Paid",
      "pending": "Pending",
      "missions": "Missions"
    },
    "search": {
      "placeholder": "Search an agent…"
    },
    "sections": {
      "byAgent": "Per-agent breakdown",
      "byAgentWithResults_one": "Per-agent breakdown · {{count}} result",
      "byAgentWithResults_other": "Per-agent breakdown · {{count}} results"
    },
    "payout": {
      "status": {
        "paid": "Paid",
        "failed": "Failed",
        "scheduled": "Scheduled"
      },
      "pending": "+{{amount}} pending",
      "mission_one": "{{count}} mission",
      "mission_other": "{{count}} missions"
    },
    "pdf": {
      "title": "PDF summary",
      "subtitle": "Generate a payroll summary for the team over the selected period.\nCompliant with the collective agreement and legal obligations (spec §2.3).",
      "generate": "Generate PDF summary",
      "generating": "Generating…",
      "generated": "PDF generated",
      "generatedBody": "The summary has been generated and sent by email.",
      "cannotOpen": "Unable to open the URL. The PDF has been generated and will be sent by email."
    },
    "empty": {
      "noPayments": "No payments for this period.",
      "noResults": "No agents match the search.",
      "noPaymentsForAgent": "No payments for this agent during the period."
    },
    "errors": {
      "load": "Loading error",
      "pdfFailed": "Unable to generate the PDF.",
      "periodRequired": {
        "title": "Period required",
        "body": "Select a specific period to generate the PDF."
      }
    }
  },
  "billing": {
    "title": "Team billing",
    "subtitle": "PDF summary — spec §2.3",
    "notice": "Generate a PDF payroll summary for the team over a given period. This document complies with legal obligations (private security collective agreement).",
    "steps": {
      "period": "1 — Select period",
      "preview": "2 — Preview",
      "generate": "3 — Generate"
    },
    "period": {
      "label": "Period",
      "pickTitle": "Choose period"
    },
    "preview": {
      "totalPaid": "Total paid",
      "pending": "Pending",
      "missions": "Missions covered",
      "agents": "Agents included",
      "empty": "Select a period to display the preview.",
      "loading": "Calculating totals…"
    },
    "generate": {
      "title": "PDF summary",
      "subtitle": "Includes: agent name, missions, amounts, payout status",
      "cta": "📄  Generate and download PDF",
      "loading": "Generating…",
      "disabledHint": "Select a specific period to enable generation."
    },
    "alerts": {
      "generated": "PDF generated",
      "generatedBody": "The summary has been generated and sent to your registered email address.",
      "cannotOpen": "Unable to open the link. The document will be sent by email.",
      "error": "Error",
      "errorBody": "Unable to generate the PDF."
    },
    "errors": {
      "load": "Loading error"
    }
  },
  "compliance": {
    "title": "Company compliance",
    "hero": {
      "source": "Source: PROFIL-DOCUMENTS.xlsx — \"Partner\" tab. The documents listed below are required by CNAPS and URSSAF regulations."
    },
    "status": {
      "rejected": "Documents rejected — action required",
      "pending": "Company file under review",
      "compliant": "Company fully compliant",
      "incomplete": "Complete your company file"
    },
    "progress": {
      "title": "Company file progress",
      "approved": "Approved",
      "pending": "Pending",
      "rejected": "Rejected",
      "missing": "To provide"
    },
    "sections": {
      "mandatory": "Mandatory documents",
      "optional": "Optional documents",
      "optionalSubtitle": "Not required, but recommended to streamline billing and contracting."
    },
    "docStatus": {
      "approved": "Approved",
      "pending": "Under review",
      "rejected": "Rejected",
      "missing": "To provide",
      "optional": "Optional"
    },
    "rejectionNote": "Reason: {{note}}",
    "alert": {
      "title": "Action required",
      "body_one": "{{count}} document rejected. Please correct and resubmit.",
      "body_other": "{{count}} documents rejected. Please correct and resubmit."
    },
    "rgpd": {
      "title": "GDPR notice",
      "retention": "Retention: {{policy}}",
      "contactDpo": "Contact DPO — {{controller}}"
    },
    "actions": {
      "checkStatus": "Check status",
      "addDocument": "Add a document"
    }
  },
  "documents": {
    "title": "Company documents",
    "subtitle": "Partner legal file",
    "addButton": "Add",
    "loading": "Loading documents…",
    "stats": {
      "approved": "Approved",
      "pending": "Pending",
      "rejected": "Rejected",
      "total": "Total"
    },
    "expiringBanner": {
      "title": "{{type}} — expiring soon",
      "today": "Expires today — renew immediately.",
      "inDays_one": "In {{count}} day — {{date}}",
      "inDays_other": "In {{count}} days — {{date}}",
      "renew": "Renew"
    },
    "countLabel_one": "{{count}} document",
    "countLabel_other": "{{count}} documents",
    "empty": {
      "title": "No documents",
      "subtitle": "Add your legal documents to complete your partner file.",
      "action": "Add a document"
    },
    "actions": {
      "view": "View the file",
      "replace": "Replace",
      "delete": "Delete"
    },
    "alerts": {
      "approvedBody": "Approved document — to renew it, contact the administration.",
      "notApprovedBody": "What would you like to do?",
      "delete": {
        "title": "Delete this document?",
        "body": "This action is irreversible. Approved documents cannot be deleted."
      }
    },
    "errors": {
      "urlMissing": "No URL returned by the server",
      "openFailedTitle": "File unavailable",
      "openFailedBody": "Unable to open this document. The link may have expired.",
      "deleteFailed": "Unable to delete this document."
    }
  },
  "addDocument": {
    "title": "Add a document",
    "titleEdit": "Replace document",
    "subtitle": "Company legal file",
    "sections": {
      "selectType": "Document type",
      "uploadFile": "File",
      "rgpd": "GDPR consent"
    },
    "upload": {
      "cta": "Choose a file",
      "replace": "Replace",
      "formats": "PDF, JPG, PNG — max 10 MB",
      "selected": "Selected file:"
    },
    "rgpd": {
      "consent": "I authorise Provalk to process this document in accordance with its privacy policy.",
      "required": "GDPR consent is required to submit this document."
    },
    "actions": {
      "submit": "Submit document",
      "submitting": "Uploading…"
    },
    "alerts": {
      "typeRequired": {
        "title": "Type required",
        "body": "Please select a document type."
      },
      "fileRequired": {
        "title": "File required",
        "body": "Please select a file to submit."
      },
      "rgpdRequired": {
        "title": "Consent required",
        "body": "You must accept GDPR processing to continue."
      },
      "success": {
        "title": "Document submitted",
        "body": "Your document has been sent and is pending review."
      },
      "expiryRequired": {
        "title": "Expiry date required",
        "body": "Please select an expiry date for this document."
      }
    },
    "errors": {
      "pickFailed": "Unable to select the file.",
      "uploadFailed": "Unable to submit the document. Please try again.",
      "fileTooLarge": {
        "title": "File too large",
        "body": "Maximum allowed size is 10 MB."
      }
    },
    "steps": {
      "expiry": "Expiry date",
      "expirySub": "Required for this document type",
      "selectedDate": "Selected date",
      "notProvided": "— not provided —",
      "shortcuts": "Shortcuts",
      "months_other": "{{count}} months",
      "years_one": "{{count}} year",
      "years_other": "{{count}} years",
      "review": "Final check",
      "reviewSub": "Confirm the information before sending",
      "summary": {
        "type": "Type",
        "file": "File",
        "expiration": "Expiry",
        "retention": "GDPR retention"
      },
      "uploading": "Uploading… {{progress}}%",
      "months_one": "{{count}} month"
    }
  },
  "profile": {
    "title": "Company profile",
    "loading": "Loading…",
    "company": {
      "siret": "SIRET",
      "address": "Address",
      "contact": "Contact"
    },
    "compliance": {
      "ok": "Company compliant",
      "inProgress": "Compliance in progress",
      "docsValidated": "{{approved}} / {{total}} documents approved",
      "noDocsYet": "Submit your documents to activate compliance.",
      "rejected_one": "· {{count}} rejected",
      "rejected_other": "· {{count}} rejected"
    },
    "sections": {
      "company": "Company",
      "account": "Account"
    },
    "rows": {
      "editCompany": "Edit company",
      "editCompanySub": "Company name, SIRET, contact, address",
      "legalDocuments": "Legal documents",
      "legalDocumentsSub": "Kbis, CNAPS, URSSAF, tax, liability",
      "compliance": "Compliance",
      "complianceSub": "Detailed view of the company file",
      "logout": "Sign out",
      "missing_one": "{{count}} missing",
      "missing_other": "{{count}} missing",
      "rejected_one": "{{count}} rejected",
      "rejected_other": "{{count}} rejected"
    },
    "logout": {
      "title": "Sign out",
      "body": "You will be signed out of your partner account.",
      "cancel": "Cancel",
      "confirm": "Sign out",
      "inProgress": "Signing out…"
    },
    "footer": "Provalk v1.0 · DPO: dpo@provalk.fr · ICO: www.ico.org.uk",
    "errors": {
      "loadFailed": "Unable to load company profile.",
      "generic": "Error"
    }
  },
  "companyEdit": {
    "title": "Edit company",
    "loading": "Loading…",
    "sections": {
      "legalInfo": "Legal information",
      "address": "Address",
      "contact": "Contact",
      "billing": "Billing"
    },
    "fields": {
      "companyName": {
        "label": "Company name *",
        "placeholder": "SecurPro Ltd"
      },
      "siret": {
        "label": "SIRET",
        "placeholder": "12345678901234"
      },
      "vatNumber": {
        "label": "VAT number",
        "placeholder": "GB123456789"
      },
      "billingAddress": {
        "label": "Billing address",
        "placeholder": "25 Republic Avenue"
      },
      "billingCity": {
        "label": "Billing city",
        "placeholder": "Paris"
      },
      "billingZipCode": {
        "label": "Billing postal code",
        "placeholder": "75008"
      },
      "address": {
        "label": "Address",
        "placeholder": "15 King Street"
      },
      "city": {
        "label": "City",
        "placeholder": "London"
      },
      "zipCode": {
        "label": "Postcode",
        "placeholder": "EC1A 1BB"
      }
    },
    "actions": {
      "save": "Save changes",
      "saving": "Saving…"
    },
    "success": {
      "title": "✅ Company updated",
      "body": "Your company information has been saved."
    },
    "validation": {
      "nameRequired": {
        "title": "Required field",
        "body": "Company name is required."
      },
      "siretInvalid": "Invalid SIRET \u2014 14 digits with a valid checksum required",
      "zipInvalid": "Invalid postal code (5 digits)",
      "vatInvalid": "Invalid VAT number (e.g. FR12345678901)",
      "siretValid": "Valid SIRET"
    },
    "errors": {
      "loadFailed": "Unable to load company information.",
      "saveFailed": "Unable to save changes."
    }
  },
  "missionsList": {
    "error": {
      "title": "Unable to load",
      "body": "We could not load your missions. Check your connection and try again.",
      "retry": "Retry"
    },
    "title": "My missions",
    "untitled": "Untitled mission",
    "newMission": "Post a new mission",
    "urgent": "Urgent",
    "cancelAction": "Cancel mission",
    "agents_one": "{{count}} agent",
    "agents_other": "{{count}} agents",
    "tabs": {
      "active": "Active",
      "archived": "Archived"
    },
    "empty": {
      "title": "No missions",
      "activeBody": "You have no active missions. Post a new one to start staffing your assignments.",
      "archivedBody": "No archived missions yet.",
      "action": "Post a mission"
    },
    "cancel": {
      "title": "Cancel this mission?",
      "body": "This will release the assigned agents and notify them. The action cannot be undone.",
      "confirm": "Cancel mission",
      "dismiss": "Keep it",
      "errorTitle": "Error",
      "errorBody": "Unable to cancel this mission. Please try again."
    },
    "status": {
      "DRAFT": "Draft",
      "CONFIRMED": "Confirmed",
      "PUBLISHED": "Published",
      "STAFFING": "Staffing",
      "STAFFED": "Staffed",
      "IN_PROGRESS": "In progress",
      "COMPLETED": "Completed",
      "CANCELLED": "Cancelled",
      "CREATED": "Created"
    }
  },
  "createMission": {
    "title": "Post a mission",
    "submit": "Publish mission",
    "submitting": "Publishing…",
    "cancel": "Cancel",
    "confirm": "Confirm",
    "endsAt": "Ends at {{time}}",
    "legalNote": "By publishing, you confirm the working conditions comply with the private security collective agreement.",
    "noServiceTypes": "No service types available.",
    "perHour": " / hour",
    "totalAgents_one": "{{count}} agent required in total",
    "totalAgents_other": "{{count}} agents required in total",
    "sections": {
      "schedule": "Schedule",
      "staffing": "Staffing",
      "details": "Additional details"
    },
    "fields": {
      "title": "Mission title",
      "location": "Address (search)",
      "address": "Full address",
      "date": "Date",
      "startTime": "Start time",
      "duration": "Duration (hours)",
      "notes": "Notes",
      "urgent": "Urgent mission"
    },
    "placeholders": {
      "title": "e.g. Boutique opening — door supervision",
      "location": "Street, city…",
      "address": "Number, street, complement…",
      "notes": "Anything the agents should know (dress code, contact on-site, equipment provided…)"
    },
    "hints": {
      "location": "Pick an address to set the GPS location.",
      "duration": "Minimum 6 hours per shift (collective agreement).",
      "urgent": "Flagged urgent â†’ highlighted to nearby agents."
    },
    "errors": {
      "title": "Error",
      "generic": "Unable to post the mission. Please try again.",
      "address": "A valid address is required.",
      "duration": "Duration must be at least 6 hours.",
      "startAt": "Start time must be at least 1 hour from now.",
      "lines": "Pick at least one service type and one agent."
    },
    "success": {
      "title": "Mission published",
      "body": "Your mission is now visible to eligible agents.",
      "confirm": "View my missions"
    }
  },
  "employment": {
    "status": {
      "DRAFT": "Draft",
      "SENT_FOR_SIGNATURE": "Awaiting signature",
      "SIGNED": "Signed",
      "CANCELLED": "Cancelled"
    },
    "motifs": {
      "CDDU": "Fixed-term contract of use",
      "ACCROISSEMENT": "Temporary surge of activity",
      "REMPLACEMENT": "Replacement of an absent employee",
      "SAISONNIER": "Seasonal employment"
    },
    "categories": {
      "AGENT_EXPLOITATION": "Operations agent",
      "AGENT_MAITRISE": "Supervisor",
      "CADRE": "Executive"
    },
    "signature": {
      "partner": "Employer",
      "agent": "Employee",
      "signed": "Signed on {{date}}",
      "pending": "Pending"
    },
    "salary": {
      "estimate": "Indicative estimate based on planned hours. Real cost will be based on validated time tracking.",
      "base": "Base salary",
      "nightSurcharge": "Night surcharge",
      "sundaySurcharge": "Sunday surcharge",
      "holidaySurcharge": "Holiday surcharge",
      "seniorityPremium": "Seniority bonus",
      "panier": "Meal allowance",
      "cynophilePremium": "K-9 handler bonus",
      "indemniteFinContrat": "End-of-contract indemnity",
      "totalBrut": "Total gross",
      "employerCharges": "Employer charges",
      "totalEmployerCost": "Total employer cost"
    },
    "contract": {
      "detail": {
        "title": "Contract",
        "loading": "Loading contract…",
        "sections": {
          "legal": "Legal frame",
          "classification": "SNEPS classification (IDCC 1351)",
          "period": "Period and hours",
          "employer": "Estimated employer cost",
          "dpae": "DPAE (URSSAF)",
          "signatures": "Signatures"
        },
        "fields": {
          "motif": "Motive",
          "legalCode": "Labor Code reference",
          "justification": "Reason for fixed-term contract",
          "category": "Category",
          "niveau": "Level",
          "echelon": "Step",
          "coefficient": "Coefficient",
          "hourlyBrut": "Gross hourly rate",
          "start": "Start",
          "end": "End",
          "plannedHours": "Planned hours"
        },
        "dpae": {
          "statusLabel": "URSSAF status",
          "submittedAt": "Submitted on",
          "notCreated": "DPAE is being created — URSSAF declaration is automatic once both parties have signed.",
          "status": {
            "PENDING": "Pending submission",
            "SUBMITTED": "Submitted to URSSAF",
            "ACKNOWLEDGED": "URSSAF receipt received",
            "FAILED": "Submission failed"
          }
        },
        "sign": {
          "confirmTitle": "Confirm employer signature",
          "confirmBody": "Signing commits the company to this contract. The employee will then need to counter-sign to activate the CDD/CDDU.",
          "confirm": "Sign",
          "cta": "Sign as employer",
          "consent": "By signing I commit the company to the terms of the CDD/CDDU above, in accordance with IDCC 1351 collective agreement.",
          "bothSigned": "Active contract — both parties have signed.",
          "waitingAgent": "Waiting for the agent's signature.",
          "successTitle": "Signature recorded",
          "successBody": "Your employer-side signature has been recorded. The agent will be notified to counter-sign.",
          "failed": "The signature could not be completed. Please try again."
        },
        "cancel": {
          "cta": "Cancel the contract",
          "confirmTitle": "Cancel the contract?",
          "confirmBody": "This action permanently removes the contract. The agent should be informed beforehand.",
          "confirm": "Confirm",
          "reasonDefault": "Cancelled by the partner",
          "successTitle": "Contract cancelled",
          "successBody": "The contract has been cancelled and the agent will be notified.",
          "failed": "Cancellation failed. Please try again."
        }
      },
      "create": {
        "title": "New contract (CDD/CDDU)",
        "context": "Context",
        "agent": "Agent",
        "bookingRef": "Mission ref.",
        "motif": {
          "title": "Reason for fixed-term contract",
          "hint": "The motive determines the legal basis of the fixed-term contract. CDDU covers private security by default (CBA 3196).",
          "legalCode": "Labor Code",
          "CDDU": "Fixed-term contract of use",
          "ACCROISSEMENT": "Temporary surge",
          "REMPLACEMENT": "Replacement",
          "SAISONNIER": "Seasonal"
        },
        "justification": {
          "label": "Justification (≥ 10 characters)",
          "placeholder": "E.g. exceptional staffing for the X event on June 12-15."
        },
        "sneps": {
          "title": "SNEPS classification (IDCC 1351)",
          "hint": "The active grid is frozen at creation — later updates to the CBA will not affect this contract.",
          "category": "Category",
          "niveau": "Level (1-5)",
          "echelon": "Step (1-3)",
          "coefficient": "Coefficient (≥ 100)",
          "categories": {
            "AGENT_EXPLOITATION": "Operations agent",
            "AGENT_MAITRISE": "Supervisor",
            "CADRE": "Executive"
          },
          "hourlyBrut": {
            "label": "Gross hourly rate (optional)",
            "placeholder": "SNEPS floor if empty",
            "hint": "Leave empty to apply the SNEPS floor of the classification. Any value entered cannot go below the floor."
          }
        },
        "extras": {
          "title": "Extras",
          "seniority": "Seniority (% — 0 to 15)",
          "seniorityHint": "Agent's seniority bonus (0 for a new hire).",
          "cynophile": "K-9 handler bonus"
        },
        "actions": {
          "submit": "Create contract"
        },
        "errors": {
          "justification": "Justification must be at least 10 characters.",
          "niveau": "Level must be an integer between 1 and 5.",
          "echelon": "Step must be an integer between 1 and 3.",
          "coefficient": "Coefficient must be an integer ≥ 100.",
          "hourlyBrut": "Hourly rate must be strictly positive.",
          "seniority": "Seniority must be between 0 and 15 %.",
          "fixForm": "Please fix the highlighted fields before continuing.",
          "createFailed": "Could not create the contract. Check the inputs and try again."
        }
      }
    }
  },
  "funding": {
    "title": "Funding",
    "calculating": "Calculating quote…",
    "funded": "Mission funded",
    "actions": {
      "accept": "Accept quote",
      "declare": "Declare payment",
      "done": "Done",
      "retryQuote": "Recalculate quote"
    },
    "errors": {
      "noQuote": "Quote unavailable",
      "acceptFailed": "Could not accept the quote",
      "declareFailed": "Could not declare the payment"
    },
    "copied": {
      "title": "Copied",
      "body": "{{label}} copied to clipboard"
    },
    "breakdown": {
      "title": "Quote breakdown",
      "status": "Status",
      "totalHT": "Total excl. VAT",
      "totalTTC": "Total incl. VAT",
      "vat": "VAT",
      "agentSalary": "Agent payroll",
      "platformMargin": "Platform margin",
      "fixedCharges": "Fixed charges",
      "surcharges": {
        "night": "Night surcharge",
        "weekend": "Weekend surcharge",
        "holiday": "Holiday surcharge",
        "urgency": "Urgency surcharge",
        "luxury": "Luxury surcharge",
        "seasonal": "Seasonal surcharge",
        "location": "Location surcharge"
      }
    },
    "payment": {
      "method": "Payment method",
      "notice": "Make the transfer using the details below. The mission will be published as soon as the funds are received.",
      "VIREMENT": "Bank transfer",
      "CHEQUE": "Cheque"
    },
    "status": {
      "PENDING": "Pending",
      "ACCEPTED": "Accepted",
      "REJECTED": "Rejected"
    },
    "instructions": {
      "title": "Banking details",
      "invoice": "Invoice #",
      "amount": "Amount",
      "reference": "Reference",
      "beneficiary": "Beneficiary",
      "address": "Address"
    }
  }
};

export default partner;