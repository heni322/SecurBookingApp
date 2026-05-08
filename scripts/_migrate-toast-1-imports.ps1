$ErrorActionPreference = 'Stop'

# ─── Helpers ───────────────────────────────────────────────────────────────────
function Patch-File {
  param([string]$Path, [hashtable[]]$Replacements)
  $c = [System.IO.File]::ReadAllText($Path)
  $rel = $Path -replace [regex]::Escape('D:\SecurBookingApp\'), ''
  Write-Host ""
  Write-Host "═══ $rel ═══"
  foreach ($r in $Replacements) {
    if ($c.Contains($r.Old)) {
      $c = $c.Replace($r.Old, $r.New)
      Write-Host "  OK: $($r.Tag)"
    } else {
      Write-Host "  MISS: $($r.Tag)"
    }
  }
  [System.IO.File]::WriteAllText($Path, $c)
}

# Common pattern: drop Alert from RN imports + add useToast import + add hook call.
# Each file has minor variations (different RN imports, different first hook line),
# so we encode each file's specifics below.

# ─── LoginScreen.tsx ───────────────────────────────────────────────────────────
Patch-File 'D:\SecurBookingApp\src\screens\auth\LoginScreen.tsx' @(
  @{ Old = "import { useTranslation } from '@i18n';"
     New = "import { useTranslation } from '@i18n';`r`nimport { useToast } from '@hooks/useToast';"
     Tag = "Add useToast import" }
)

# ─── TwoFaScreen.tsx ───────────────────────────────────────────────────────────
Patch-File 'D:\SecurBookingApp\src\screens\auth\TwoFaScreen.tsx' @(
  @{ Old = "import { useTranslation } from '@i18n';"
     New = "import { useTranslation } from '@i18n';`r`nimport { useToast } from '@hooks/useToast';"
     Tag = "Add useToast import" }
)

# ─── BookingDetailScreen.tsx ──────────────────────────────────────────────────
Patch-File 'D:\SecurBookingApp\src\screens\client\BookingDetailScreen.tsx' @(
  @{ Old = "import { useTranslation } from '@i18n';"
     New = "import { useTranslation } from '@i18n';`r`nimport { useToast } from '@hooks/useToast';"
     Tag = "Add useToast import" }
)

# ─── DeleteAccountScreen.tsx ──────────────────────────────────────────────────
Patch-File 'D:\SecurBookingApp\src\screens\client\DeleteAccountScreen.tsx' @(
  @{ Old = "import { useTranslation } from '@i18n';"
     New = "import { useTranslation } from '@i18n';`r`nimport { useToast } from '@hooks/useToast';"
     Tag = "Add useToast import" }
)

# ─── DisputeScreen.tsx ─────────────────────────────────────────────────────────
Patch-File 'D:\SecurBookingApp\src\screens\client\DisputeScreen.tsx' @(
  @{ Old = "import { useTranslation } from '@i18n';"
     New = "import { useTranslation } from '@i18n';`r`nimport { useToast } from '@hooks/useToast';"
     Tag = "Add useToast import" }
)

# ─── HomeScreen.tsx ───────────────────────────────────────────────────────────
Patch-File 'D:\SecurBookingApp\src\screens\client\HomeScreen.tsx' @(
  @{ Old = "import { useTranslation } from '@i18n';"
     New = "import { useTranslation } from '@i18n';`r`nimport { useToast } from '@hooks/useToast';"
     Tag = "Add useToast import" }
)

# ─── MissionCreateScreen.tsx ──────────────────────────────────────────────────
Patch-File 'D:\SecurBookingApp\src\screens\client\MissionCreateScreen.tsx' @(
  @{ Old = "import { useTranslation } from '@i18n';"
     New = "import { useTranslation } from '@i18n';`r`nimport { useToast } from '@hooks/useToast';"
     Tag = "Add useToast import" }
)

# ─── MissionDetailScreen.tsx ──────────────────────────────────────────────────
Patch-File 'D:\SecurBookingApp\src\screens\client\MissionDetailScreen.tsx' @(
  @{ Old = "import { useTranslation } from '@i18n';"
     New = "import { useTranslation } from '@i18n';`r`nimport { useToast } from '@hooks/useToast';"
     Tag = "Add useToast import" }
)

# ─── OfflinePaymentScreen.tsx ─────────────────────────────────────────────────
Patch-File 'D:\SecurBookingApp\src\screens\client\OfflinePaymentScreen.tsx' @(
  @{ Old = "import { useTranslation } from '@i18n';"
     New = "import { useTranslation } from '@i18n';`r`nimport { useToast } from '@hooks/useToast';"
     Tag = "Add useToast import" }
)

# ─── PaymentHistoryScreen.tsx ─────────────────────────────────────────────────
Patch-File 'D:\SecurBookingApp\src\screens\client\PaymentHistoryScreen.tsx' @(
  @{ Old = "import { useTranslation } from '@i18n';"
     New = "import { useTranslation } from '@i18n';`r`nimport { useToast } from '@hooks/useToast';"
     Tag = "Add useToast import" }
)

# ─── PaymentMethodsScreen.tsx ─────────────────────────────────────────────────
Patch-File 'D:\SecurBookingApp\src\screens\client\PaymentMethodsScreen.tsx' @(
  @{ Old = "import { useTranslation } from '@i18n';"
     New = "import { useTranslation } from '@i18n';`r`nimport { useToast } from '@hooks/useToast';"
     Tag = "Add useToast import" }
)

# ─── ProfileEditScreen.tsx ────────────────────────────────────────────────────
Patch-File 'D:\SecurBookingApp\src\screens\client\ProfileEditScreen.tsx' @(
  @{ Old = "import { useTranslation } from '@i18n';"
     New = "import { useTranslation } from '@i18n';`r`nimport { useToast } from '@hooks/useToast';"
     Tag = "Add useToast import" }
)

# ─── QuoteDetailScreen.tsx ────────────────────────────────────────────────────
Patch-File 'D:\SecurBookingApp\src\screens\client\QuoteDetailScreen.tsx' @(
  @{ Old = "import { useTranslation } from '@i18n';"
     New = "import { useTranslation } from '@i18n';`r`nimport { useToast } from '@hooks/useToast';"
     Tag = "Add useToast import" }
)

# ─── RateAgentScreen.tsx ──────────────────────────────────────────────────────
Patch-File 'D:\SecurBookingApp\src\screens\client\RateAgentScreen.tsx' @(
  @{ Old = "import { useTranslation } from '@i18n';"
     New = "import { useTranslation } from '@i18n';`r`nimport { useToast } from '@hooks/useToast';"
     Tag = "Add useToast import" }
)

# ─── SelectAgentScreen.tsx ────────────────────────────────────────────────────
Patch-File 'D:\SecurBookingApp\src\screens\client\SelectAgentScreen.tsx' @(
  @{ Old = "import { useTranslation } from '@i18n';"
     New = "import { useTranslation } from '@i18n';`r`nimport { useToast } from '@hooks/useToast';"
     Tag = "Add useToast import" }
)

# ─── TwoFaSetupScreen.tsx ─────────────────────────────────────────────────────
Patch-File 'D:\SecurBookingApp\src\screens\client\TwoFaSetupScreen.tsx' @(
  @{ Old = "import { useTranslation } from '@i18n';"
     New = "import { useTranslation } from '@i18n';`r`nimport { useToast } from '@hooks/useToast';"
     Tag = "Add useToast import" }
)

Write-Host ""
Write-Host "──────────────────────────────────────────"
Write-Host "Phase 1 (imports) complete."
