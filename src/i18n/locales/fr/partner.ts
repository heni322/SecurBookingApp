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
    "title": "Tableau de bord",
    "loading": "Chargement…",
    "greeting": {
      "morning": "Bonjour",
      "afternoon": "Bon après-midi",
      "evening": "Bonsoir",
      "fallback": "Partenaire"
    },
    "sections": {
      "team": "Mon équipe",
      "missions": "Missions",
      "finances": "Finances",
      "quickAccess": "Accès rapide"
    },
    "kpi": {
      "agents": "Agents",
      "validated": "Validés",
      "active": "En cours",
      "completed": "Terminées",
      "scheduledPayouts": "Virements planifiés",
      "totalPaid": "Total versé"
    },
    "actions": {
      "team": "Mon équipe",
      "teamSub": "Gérer et suivre les agents",
      "finances": "Finances & salaires",
      "financesSub": "Synthèse et ventilation par agent",
      "billing": "Facturation équipe",
      "billingSub": "Générer le récapitulatif PDF",
      "compliance": "Conformité société",
      "complianceSub": "Kbis, CNAPS, URSSAF, fiscale, RC pro",
      "documents": "Documents société",
      "documentsSub": "Tous les documents légaux soumis",
      "editCompany": "Ma société",
      "editCompanySub": "Modifier les informations légales",
      "createMission": "Publier une mission",
      "createMissionSub": "Créer une nouvelle prestation",
      "myMissions": "Mes missions",
      "myMissionsSub": "Suivre et gérer les missions publiées"
    }
  },
  "team": {
    "title": "Mon équipe",
    "subtitle_one": "{{count}} agent",
    "subtitle_other": "{{count}} agents",
    "loading": "Chargement de l'équipe…",
    "search": {
      "placeholder": "Nom, email, ville…"
    },
    "filters": {
      "all": "Tous",
      "validated": "Validés",
      "pending": "En attente",
      "alerts": "Alertes"
    },
    "pills": {
      "cnapsValidated": "CNAPS validé",
      "cnapsNotValidated": "Non validé",
      "missions": "{{count}} missions"
    },
    "alerts": {
      "rejected_one": "{{count}} document rejeté",
      "rejected_other": "{{count}} documents rejetés",
      "missing_one": "{{count}} document obligatoire manquant",
      "missing_other": "{{count}} documents obligatoires manquants",
      "expiring_one": "{{count}} document expirant dans 30 j.",
      "expiring_other": "{{count}} documents expirant dans 30 j.",
      "pending_one": "{{count}} document en vérification",
      "pending_other": "{{count}} documents en vérification"
    },
    "empty": {
      "noAgentsTitle": "Aucun agent",
      "noAgentsSubtitle": "Votre équipe est vide. Invitez des agents à rejoindre votre structure.",
      "noResultsBySearch": "Aucun agent ne correspond à «{{search}}».",
      "noResultsByFilter": "Aucun agent dans cette catégorie."
    }
  },
  "agentDetail": {
    "title": "Détail agent",
    "loading": "Chargement…",
    "sections": {
      "documents": "Documents",
      "onboarding": "Onboarding",
      "info": "Informations"
    },
    "pills": {
      "cnapsValidated": "CNAPS validé",
      "cnapsNotValidated": "Non validé"
    },
    "onboarding": {
      "title": "Progression onboarding",
      "steps": {
        "profile": "Profil créé",
        "documents": "Documents soumis",
        "cnaps": "CNAPS approuvé",
        "stripe": "Compte bancaire configuré"
      }
    },
    "docs": {
      "status": {
        "approved": "Validé",
        "pending": "En vérif.",
        "rejected": "Rejeté",
        "missing": "À fournir",
        "expired": "Expiré"
      },
      "empty": "Aucun document soumis."
    },
    "errors": {
      "notFound": "Agent introuvable."
    }
  },
  "financials": {
    "title": "Finances équipe",
    "subtitle": "Salaires & virements",
    "loading": "Chargement des finances…",
    "period": {
      "label": "Période sélectionnée",
      "all": "Toutes les périodes",
      "pickTitle": "Sélectionner la période",
      "year": "Année {{year}}",
      "all_periods": "Tout"
    },
    "totals": {
      "paid": "Versé",
      "pending": "En attente",
      "missions": "Missions"
    },
    "search": {
      "placeholder": "Rechercher un agent…"
    },
    "sections": {
      "byAgent": "Détail par agent",
      "byAgentWithResults_one": "Détail par agent · {{count}} résultat",
      "byAgentWithResults_other": "Détail par agent · {{count}} résultats"
    },
    "payout": {
      "status": {
        "paid": "Versé",
        "failed": "Échoué",
        "scheduled": "Planifié"
      },
      "pending": "+{{amount}} att.",
      "mission_one": "{{count}} mission",
      "mission_other": "{{count}} missions"
    },
    "pdf": {
      "title": "Récapitulatif PDF",
      "subtitle": "Générez un récapitulatif des salaires de l'équipe sur la période sélectionnée.\nConforme à la convention collective et aux obligations légales (spec §2.3).",
      "generate": "Générer le PDF récapitulatif",
      "generating": "Génération…",
      "generated": "PDF généré",
      "generatedBody": "Le récapitulatif a été généré et envoyé par email.",
      "cannotOpen": "Impossible d'ouvrir l'URL. Le PDF a été généré et sera envoyé par email."
    },
    "empty": {
      "noPayments": "Aucun paiement sur cette période.",
      "noResults": "Aucun agent ne correspond à la recherche.",
      "noPaymentsForAgent": "Aucun paiement pour cet agent sur la période."
    },
    "errors": {
      "load": "Erreur de chargement",
      "pdfFailed": "Impossible de générer le PDF.",
      "periodRequired": {
        "title": "Période requise",
        "body": "Sélectionnez une période précise pour générer le PDF."
      }
    }
  },
  "billing": {
    "title": "Facturation équipe",
    "subtitle": "Récapitulatif PDF — spec §2.3",
    "notice": "Générez le récapitulatif PDF des salaires de l'équipe sur une période donnée. Ce document est conforme aux obligations légales (convention collective des entreprises de sécurité).",
    "steps": {
      "period": "1 — Sélectionner la période",
      "preview": "2 — Aperçu",
      "generate": "3 — Générer"
    },
    "period": {
      "label": "Période",
      "pickTitle": "Choisir la période"
    },
    "preview": {
      "totalPaid": "Total versé",
      "pending": "En attente",
      "missions": "Missions couvertes",
      "agents": "Agents concernés",
      "empty": "Sélectionnez une période pour afficher l'aperçu.",
      "loading": "Calcul des totaux…"
    },
    "generate": {
      "title": "PDF récapitulatif",
      "subtitle": "Inclut : nom de l'agent, missions, montants, statut des virements",
      "cta": "📄  Générer et télécharger le PDF",
      "loading": "Génération en cours…",
      "disabledHint": "Sélectionnez une période précise pour activer la génération."
    },
    "alerts": {
      "generated": "PDF généré",
      "generatedBody": "Le récapitulatif a été généré et envoyé par email à votre adresse enregistrée.",
      "cannotOpen": "Impossible d'ouvrir le lien. Le document sera envoyé par email.",
      "error": "Erreur",
      "errorBody": "Impossible de générer le PDF."
    },
    "errors": {
      "load": "Erreur de chargement"
    }
  },
  "compliance": {
    "title": "Conformité société",
    "hero": {
      "source": "Source : PROFIL-DOCUMENTS.xlsx — onglet \"Partenaire\". Les documents listés ci-dessous sont requis par la réglementation CNAPS et URSSAF."
    },
    "status": {
      "rejected": "Documents rejetés à corriger",
      "pending": "Dossier société en cours de vérification",
      "compliant": "Société entièrement conforme",
      "incomplete": "Complétez votre dossier société"
    },
    "progress": {
      "title": "Progression du dossier société",
      "approved": "Validés",
      "pending": "En attente",
      "rejected": "Rejetés",
      "missing": "À fournir"
    },
    "sections": {
      "mandatory": "Documents obligatoires",
      "optional": "Documents facultatifs",
      "optionalSubtitle": "Pas obligatoires, mais recommandés pour faciliter la facturation et la contractualisation."
    },
    "docStatus": {
      "approved": "Validé",
      "pending": "En vérif.",
      "rejected": "Rejeté",
      "missing": "À fournir",
      "optional": "Facultatif"
    },
    "rejectionNote": "Motif : {{note}}",
    "alert": {
      "title": "Action requise",
      "body_one": "{{count}} document rejeté. Corrigez et soumettez de nouveaux fichiers.",
      "body_other": "{{count}} documents rejetés. Corrigez et soumettez de nouveaux fichiers."
    },
    "rgpd": {
      "title": "Notice RGPD",
      "retention": "Conservation : {{policy}}",
      "contactDpo": "Contacter le DPO — {{controller}}"
    },
    "actions": {
      "checkStatus": "Vérifier le statut",
      "addDocument": "Ajouter un document"
    }
  },
  "documents": {
    "title": "Documents société",
    "subtitle": "Dossier légal partenaire",
    "addButton": "Ajouter",
    "loading": "Chargement des documents…",
    "stats": {
      "approved": "Validés",
      "pending": "En attente",
      "rejected": "Rejetés",
      "total": "Total"
    },
    "expiringBanner": {
      "title": "{{type}} — expire bientôt",
      "today": "Expire aujourd'hui — renouvelez immédiatement.",
      "inDays_one": "Dans {{count}} jour — {{date}}",
      "inDays_other": "Dans {{count}} jours — {{date}}",
      "renew": "Renouveler"
    },
    "countLabel_one": "{{count}} document",
    "countLabel_other": "{{count}} documents",
    "empty": {
      "title": "Aucun document",
      "subtitle": "Ajoutez vos documents légaux pour compléter votre dossier partenaire.",
      "action": "Ajouter un document"
    },
    "actions": {
      "view": "Voir le fichier",
      "replace": "Remplacer",
      "delete": "Supprimer"
    },
    "alerts": {
      "approvedBody": "Document approuvé — pour le renouveler, contactez l'administration.",
      "notApprovedBody": "Que souhaitez-vous faire ?",
      "delete": {
        "title": "Supprimer ce document ?",
        "body": "Cette action est irréversible. Les documents approuvés ne peuvent pas être supprimés."
      }
    },
    "errors": {
      "urlMissing": "Aucune URL renvoyée par le serveur",
      "openFailedTitle": "Fichier indisponible",
      "openFailedBody": "Impossible d'ouvrir ce document. Le lien peut avoir expiré.",
      "deleteFailed": "Impossible de supprimer ce document."
    }
  },
  "addDocument": {
    "title": "Ajouter un document",
    "titleEdit": "Remplacer le document",
    "subtitle": "Dossier légal société",
    "sections": {
      "selectType": "Type de document",
      "uploadFile": "Fichier",
      "rgpd": "Consentement RGPD"
    },
    "upload": {
      "cta": "Choisir un fichier",
      "replace": "Remplacer",
      "formats": "PDF, JPG, PNG — max 10 Mo",
      "selected": "Fichier sélectionné :"
    },
    "rgpd": {
      "consent": "J'autorise Provalk à traiter ce document conformément à sa politique de confidentialité.",
      "required": "Le consentement RGPD est requis pour soumettre ce document."
    },
    "actions": {
      "submit": "Soumettre le document",
      "submitting": "Envoi en cours…"
    },
    "alerts": {
      "typeRequired": {
        "title": "Type requis",
        "body": "Sélectionnez un type de document."
      },
      "fileRequired": {
        "title": "Fichier requis",
        "body": "Sélectionnez un fichier à soumettre."
      },
      "rgpdRequired": {
        "title": "Consentement requis",
        "body": "Vous devez accepter le traitement RGPD pour continuer."
      },
      "success": {
        "title": "Document soumis",
        "body": "Votre document a été envoyé et est en attente de vérification."
      },
      "expiryRequired": {
        "title": "Date d'expiration requise",
        "body": "Sélectionnez une date d'expiration pour ce document."
      }
    },
    "errors": {
      "pickFailed": "Impossible de sélectionner le fichier.",
      "uploadFailed": "Impossible de soumettre le document. Réessayez.",
      "fileTooLarge": {
        "title": "Fichier trop volumineux",
        "body": "La taille maximale autorisée est 10 Mo."
      }
    },
    "steps": {
      "expiry": "Date d'expiration",
      "expirySub": "Requise pour ce type de document",
      "selectedDate": "Date sélectionnée",
      "notProvided": "— Non renseignée —",
      "shortcuts": "Raccourcis",
      "months_other": "{{count}} mois",
      "years_one": "{{count}} an",
      "years_other": "{{count}} ans",
      "review": "Vérification finale",
      "reviewSub": "Confirmez les informations avant envoi",
      "summary": {
        "type": "Type",
        "file": "Fichier",
        "expiration": "Expiration",
        "retention": "Rétention RGPD"
      },
      "uploading": "Téléversement… {{progress}}%",
      "months_one": "{{count}} mois"
    }
  },
  "profile": {
    "title": "Profil société",
    "loading": "Chargement…",
    "company": {
      "siret": "SIRET",
      "address": "Adresse",
      "contact": "Contact"
    },
    "compliance": {
      "ok": "Société conforme",
      "inProgress": "Conformité en cours",
      "docsValidated": "{{approved}} / {{total}} documents validés",
      "noDocsYet": "Soumettez vos documents pour activer votre conformité.",
      "rejected_one": "· {{count}} rejeté",
      "rejected_other": "· {{count}} rejetés"
    },
    "sections": {
      "company": "Société",
      "account": "Compte"
    },
    "rows": {
      "editCompany": "Éditer la société",
      "editCompanySub": "Raison sociale, SIRET, contact, adresse",
      "legalDocuments": "Documents légaux",
      "legalDocumentsSub": "Kbis, CNAPS, URSSAF, fiscale, RC pro",
      "compliance": "Conformité",
      "complianceSub": "Vue détaillée du dossier société",
      "logout": "Se déconnecter",
      "missing_one": "{{count}} manquant",
      "missing_other": "{{count}} manquants",
      "rejected_one": "{{count}} rejeté",
      "rejected_other": "{{count}} rejetés"
    },
    "logout": {
      "title": "Déconnexion",
      "body": "Vous serez déconnecté de votre compte partenaire.",
      "cancel": "Annuler",
      "confirm": "Se déconnecter",
      "inProgress": "Déconnexion…"
    },
    "footer": "Provalk v1.0 · DPO : dpo@provalk.fr · CNIL : www.cnil.fr",
    "errors": {
      "loadFailed": "Impossible de charger le profil société.",
      "generic": "Erreur"
    }
  },
  "companyEdit": {
    "title": "Éditer la société",
    "loading": "Chargement…",
    "sections": {
      "legalInfo": "Informations légales",
      "address": "Adresse",
      "contact": "Contact",
      "billing": "Facturation"
    },
    "fields": {
      "companyName": {
        "label": "Raison sociale *",
        "placeholder": "SecurPro SAS"
      },
      "siret": {
        "label": "SIRET",
        "placeholder": "12345678901234"
      },
      "vatNumber": {
        "label": "Numéro de TVA",
        "placeholder": "FR12345678901"
      },
      "billingAddress": {
        "label": "Adresse de facturation",
        "placeholder": "25 avenue de la R\u00e9publique"
      },
      "billingCity": {
        "label": "Ville de facturation",
        "placeholder": "Paris"
      },
      "billingZipCode": {
        "label": "CP facturation",
        "placeholder": "75008"
      },
      "address": {
        "label": "Adresse",
        "placeholder": "15 rue de la Paix"
      },
      "city": {
        "label": "Ville",
        "placeholder": "Paris"
      },
      "zipCode": {
        "label": "Code postal",
        "placeholder": "75001"
      }
    },
    "actions": {
      "save": "Enregistrer les modifications",
      "saving": "Enregistrement…"
    },
    "success": {
      "title": "✅ Société mise à jour",
      "body": "Les informations de votre société ont été enregistrées."
    },
    "validation": {
      "nameRequired": {
        "title": "Champ requis",
        "body": "La raison sociale est obligatoire."
      },
      "siretInvalid": "SIRET invalide \u2014 14 chiffres et cl\u00e9 de contr\u00f4le requis",
      "zipInvalid": "Code postal invalide (5 chiffres)",
      "vatInvalid": "Num\u00e9ro de TVA invalide (ex : FR12345678901)",
      "siretValid": "SIRET valide"
    },
    "errors": {
      "loadFailed": "Impossible de charger les informations.",
      "saveFailed": "Impossible d'enregistrer les modifications."
    }
  },
  "missionsList": {
    "error": {
      "title": "Chargement impossible",
      "body": "Impossible de charger vos missions. V\u00e9rifiez votre connexion et r\u00e9essayez.",
      "retry": "R\u00e9essayer"
    },
    "title": "Mes missions",
    "untitled": "Mission sans titre",
    "newMission": "Publier une nouvelle mission",
    "urgent": "Urgent",
    "cancelAction": "Annuler la mission",
    "agents_one": "{{count}} agent",
    "agents_other": "{{count}} agents",
    "tabs": {
      "active": "Actives",
      "archived": "Archivées"
    },
    "empty": {
      "title": "Aucune mission",
      "activeBody": "Vous n'avez aucune mission active. Publiez-en une pour commencer à staffer vos prestations.",
      "archivedBody": "Aucune mission archivée pour le moment.",
      "action": "Publier une mission"
    },
    "cancel": {
      "title": "Annuler cette mission ?",
      "body": "Les agents affectés seront libérés et notifiés. Cette action est irréversible.",
      "confirm": "Annuler la mission",
      "dismiss": "Conserver",
      "errorTitle": "Erreur",
      "errorBody": "Impossible d'annuler la mission. Réessayez."
    },
    "status": {
      "DRAFT": "Brouillon",
      "CONFIRMED": "Confirmée",
      "PUBLISHED": "Publiée",
      "STAFFING": "Staffing",
      "STAFFED": "Staffée",
      "IN_PROGRESS": "En cours",
      "COMPLETED": "Terminée",
      "CANCELLED": "Annulée",
      "CREATED": "Créée"
    }
  },
  "createMission": {
    "title": "Publier une mission",
    "submit": "Publier la mission",
    "submitting": "Publication…",
    "cancel": "Annuler",
    "confirm": "Confirmer",
    "endsAt": "Se termine à {{time}}",
    "legalNote": "En publiant, vous confirmez que les conditions de travail respectent la convention collective des entreprises de sécurité.",
    "noServiceTypes": "Aucun type de prestation disponible.",
    "perHour": " / heure",
    "totalAgents_one": "{{count}} agent requis au total",
    "totalAgents_other": "{{count}} agents requis au total",
    "sections": {
      "schedule": "Créneau",
      "staffing": "Effectifs",
      "details": "Informations complémentaires"
    },
    "fields": {
      "title": "Titre de la mission",
      "location": "Adresse (recherche)",
      "address": "Adresse complète",
      "date": "Date",
      "startTime": "Heure de début",
      "duration": "Durée (heures)",
      "notes": "Notes",
      "urgent": "Mission urgente"
    },
    "placeholders": {
      "title": "Ex. Ouverture boutique — agent de sécurité",
      "location": "Rue, ville…",
      "address": "Numéro, rue, complément…",
      "notes": "Tout ce que les agents doivent savoir (tenue, contact sur site, équipement fourni…)"
    },
    "hints": {
      "location": "Choisissez une adresse pour fixer la position GPS.",
      "duration": "Minimum 6 heures par vacation (convention collective).",
      "urgent": "Marquée urgente â†’ mise en avant pour les agents à proximité."
    },
    "errors": {
      "title": "Erreur",
      "generic": "Impossible de publier la mission. Réessayez.",
      "address": "Une adresse valide est obligatoire.",
      "duration": "La durée doit être d'au moins 6 heures.",
      "startAt": "L'heure de début doit être au moins 1 heure dans le futur.",
      "lines": "Sélectionnez au moins un type de prestation et un agent."
    },
    "success": {
      "title": "Mission publiée",
      "body": "Votre mission est désormais visible par les agents éligibles.",
      "confirm": "Voir mes missions"
    }
  },
  "employment": {
    "status": {
      "DRAFT": "Brouillon",
      "SENT_FOR_SIGNATURE": "En attente de signature",
      "SIGNED": "Signé",
      "CANCELLED": "Annulé"
    },
    "motifs": {
      "CDDU": "CDD d'usage",
      "ACCROISSEMENT": "Accroissement temporaire d'activité",
      "REMPLACEMENT": "Remplacement d'un salarié absent",
      "SAISONNIER": "Emploi saisonnier"
    },
    "categories": {
      "AGENT_EXPLOITATION": "Agent d'exploitation",
      "AGENT_MAITRISE": "Agent de maîtrise",
      "CADRE": "Cadre"
    },
    "signature": {
      "partner": "Employeur",
      "agent": "Salarié",
      "signed": "Signé le {{date}}",
      "pending": "En attente"
    },
    "salary": {
      "estimate": "Estimation indicative basée sur les heures planifiées. Le coût réel reposera sur le pointage validé.",
      "base": "Salaire de base",
      "nightSurcharge": "Majoration nuit",
      "sundaySurcharge": "Majoration dimanche",
      "holidaySurcharge": "Majoration jour férié",
      "seniorityPremium": "Prime d'ancienneté",
      "panier": "Panier repas",
      "cynophilePremium": "Prime cynophile",
      "indemniteFinContrat": "Indemnité fin de contrat",
      "totalBrut": "Total brut",
      "employerCharges": "Charges patronales",
      "totalEmployerCost": "Coût total employeur"
    },
    "contract": {
      "detail": {
        "title": "Contrat",
        "loading": "Chargement du contrat…",
        "sections": {
          "legal": "Cadre légal",
          "classification": "Classification SNEPS (IDCC 1351)",
          "period": "Période et heures",
          "employer": "Coût employeur estimé",
          "dpae": "DPAE (URSSAF)",
          "signatures": "Signatures"
        },
        "fields": {
          "motif": "Motif",
          "legalCode": "Article du Code du travail",
          "justification": "Justification du recours",
          "category": "Catégorie",
          "niveau": "Niveau",
          "echelon": "Échelon",
          "coefficient": "Coefficient",
          "hourlyBrut": "Taux horaire brut",
          "start": "Début",
          "end": "Fin",
          "plannedHours": "Heures planifiées"
        },
        "dpae": {
          "statusLabel": "Statut URSSAF",
          "submittedAt": "Soumise le",
          "notCreated": "DPAE en cours de création — la déclaration URSSAF est automatique dès la signature des deux parties.",
          "status": {
            "PENDING": "En attente d'envoi",
            "SUBMITTED": "Transmise à l'URSSAF",
            "ACKNOWLEDGED": "Accusé URSSAF reçu",
            "FAILED": "Échec de transmission"
          }
        },
        "sign": {
          "confirmTitle": "Confirmer la signature employeur",
          "confirmBody": "En signant, vous engagez la société sur ce contrat. La signature côté salarié sera ensuite requise pour activer le CDD/CDDU.",
          "confirm": "Signer",
          "cta": "Signer en tant qu'employeur",
          "consent": "En signant, j'engage la société sur les termes du CDD/CDDU ci-dessus, conformément à la convention IDCC 1351.",
          "bothSigned": "Contrat actif — les deux parties ont signé.",
          "waitingAgent": "En attente de la signature de l'agent.",
          "successTitle": "Signature enregistrée",
          "successBody": "Votre signature côté employeur a été enregistrée. L'agent sera notifié pour contre-signer.",
          "failed": "La signature n'a pas pu aboutir. Veuillez réessayer."
        },
        "cancel": {
          "cta": "Annuler le contrat",
          "confirmTitle": "Annuler le contrat ?",
          "confirmBody": "Cette action retire définitivement le contrat. L'agent doit être prévenu en amont.",
          "confirm": "Confirmer",
          "reasonDefault": "Annulation par le partenaire",
          "successTitle": "Contrat annulé",
          "successBody": "Le contrat a été annulé et l'agent va être notifié.",
          "failed": "L'annulation a échoué. Veuillez réessayer."
        }
      },
      "create": {
        "title": "Nouveau contrat (CDD/CDDU)",
        "context": "Contexte",
        "agent": "Agent",
        "bookingRef": "Réf. mission",
        "motif": {
          "title": "Motif de recours",
          "hint": "Le motif détermine la base légale du CDD. Le CDDU couvre la sécurité privée par défaut (CCN 3196).",
          "legalCode": "Code du travail",
          "CDDU": "CDD d'usage",
          "ACCROISSEMENT": "Accroissement temporaire",
          "REMPLACEMENT": "Remplacement",
          "SAISONNIER": "Saisonnier"
        },
        "justification": {
          "label": "Justification (≥ 10 caractères)",
          "placeholder": "Ex. surcroît exceptionnel pour la manifestation X du 12 au 15 juin."
        },
        "sneps": {
          "title": "Classification SNEPS (IDCC 1351)",
          "hint": "La grille en vigueur est figée à la création — toute modification ultérieure de la convention ne touchera pas ce contrat.",
          "category": "Catégorie",
          "niveau": "Niveau (1-5)",
          "echelon": "Échelon (1-3)",
          "coefficient": "Coefficient (≥ 100)",
          "categories": {
            "AGENT_EXPLOITATION": "Agent d'exploitation",
            "AGENT_MAITRISE": "Agent de maîtrise",
            "CADRE": "Cadre"
          },
          "hourlyBrut": {
            "label": "Taux horaire brut (optionnel)",
            "placeholder": "Plancher SNEPS si vide",
            "hint": "Laissez vide pour appliquer le plancher SNEPS de la classification. Une valeur saisie ne peut jamais être inférieure au plancher."
          }
        },
        "extras": {
          "title": "Compléments",
          "seniority": "Ancienneté (% — 0 à 15)",
          "seniorityHint": "Prime d'ancienneté de l'agent (0 pour un nouvel embauché).",
          "cynophile": "Maître-chien (prime cynophile)"
        },
        "actions": {
          "submit": "Créer le contrat"
        },
        "errors": {
          "justification": "La justification doit faire au moins 10 caractères.",
          "niveau": "Le niveau doit être un entier entre 1 et 5.",
          "echelon": "L'échelon doit être un entier entre 1 et 3.",
          "coefficient": "Le coefficient doit être un entier ≥ 100.",
          "hourlyBrut": "Le taux horaire doit être strictement positif.",
          "seniority": "L'ancienneté doit être comprise entre 0 et 15 %.",
          "fixForm": "Veuillez corriger les champs en erreur avant de continuer.",
          "createFailed": "La création du contrat a échoué. Vérifiez les informations puis réessayez."
        }
      }
    }
  },
  "funding": {
    "title": "Financement",
    "calculating": "Calcul du devis…",
    "funded": "Mission financée",
    "actions": {
      "accept": "Accepter le devis",
      "declare": "Déclarer le paiement",
      "done": "Terminé",
      "retryQuote": "Recalculer le devis"
    },
    "errors": {
      "noQuote": "Devis indisponible",
      "acceptFailed": "Acceptation du devis impossible",
      "declareFailed": "Déclaration impossible"
    },
    "copied": {
      "title": "Copié",
      "body": "{{label}} copié dans le presse-papiers"
    },
    "breakdown": {
      "title": "Détail du devis",
      "status": "Statut",
      "totalHT": "Total HT",
      "totalTTC": "Total TTC",
      "vat": "TVA",
      "agentSalary": "Salaires agents",
      "platformMargin": "Marge plateforme",
      "fixedCharges": "Charges fixes",
      "surcharges": {
        "night": "Majoration nuit",
        "weekend": "Majoration week-end",
        "holiday": "Majoration jours fériés",
        "urgency": "Majoration urgence",
        "luxury": "Majoration luxe",
        "seasonal": "Majoration saison",
        "location": "Majoration zone"
      }
    },
    "payment": {
      "method": "Mode de paiement",
      "notice": "Effectuez le virement en utilisant les coordonnées ci-dessous. La mission sera publiée dès réception.",
      "VIREMENT": "Virement bancaire",
      "CHEQUE": "Chèque"
    },
    "status": {
      "PENDING": "En attente",
      "ACCEPTED": "Accepté",
      "REJECTED": "Refusé"
    },
    "instructions": {
      "title": "Coordonnées bancaires",
      "invoice": "N de facture",
      "amount": "Montant",
      "reference": "Référence",
      "beneficiary": "Bénéficiaire",
      "address": "Adresse"
    }
  }
};

export default partner;