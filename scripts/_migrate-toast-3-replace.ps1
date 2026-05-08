# Phase 3 — Replace each informational Alert.alert with the right toast.* call.
# Each entry: file path, exact old line, new line, tag.
# CONFIRMATION dialogs (multi-button) are LEFT ALONE.

$ErrorActionPreference = 'Stop'

function Replace-Once {
  param([string]$Path, [string]$Old, [string]$New, [string]$Tag)
  $c = [System.IO.File]::ReadAllText($Path)
  if (-not $c.Contains($Old)) {
    Write-Host "  MISS [$Tag]"
    return
  }
  # Ensure unique
  $count = ([regex]::Matches([regex]::Escape($c), [regex]::Escape($Old))).Count
  $c = $c.Replace($Old, $New)
  [System.IO.File]::WriteAllText($Path, $c)
  Write-Host "  OK   [$Tag]"
}

# ─── LoginScreen.tsx (1) ────────────────────────────────────────────────────
Write-Host ""
Write-Host "═══ LoginScreen.tsx ═══"
Replace-Once 'D:\SecurBookingApp\src\screens\auth\LoginScreen.tsx' `
  "      Alert.alert(`r`n        t('login.alert.title'),`r`n        status === 401 ? t('login.errors.invalid_creds') : message,`r`n      );" `
  "      toast.error(`r`n        status === 401 ? t('login.errors.invalid_creds') : message,`r`n        { title: t('login.alert.title') },`r`n      );" `
  "L103 login error"

# ─── TwoFaScreen.tsx (4) ───────────────────────────────────────────────────
Write-Host ""
Write-Host "═══ TwoFaScreen.tsx ═══"
Replace-Once 'D:\SecurBookingApp\src\screens\auth\TwoFaScreen.tsx' `
  "      Alert.alert(t('two_fa_screen.incomplete_title'), t('two_fa_screen.incomplete_body'));" `
  "      toast.warning(t('two_fa_screen.incomplete_body'), { title: t('two_fa_screen.incomplete_title') });" `
  "L46 incomplete"
Replace-Once 'D:\SecurBookingApp\src\screens\auth\TwoFaScreen.tsx' `
  "      Alert.alert(t('two_fa_screen.invalid_title'), t('two_fa_screen.invalid_body'));" `
  "      toast.error(t('two_fa_screen.invalid_body'), { title: t('two_fa_screen.invalid_title') });" `
  "L61 invalid"
Replace-Once 'D:\SecurBookingApp\src\screens\auth\TwoFaScreen.tsx' `
  "      Alert.alert(t('two_fa_screen.resent_title'), t('two_fa_screen.resent_body'));" `
  "      toast.success(t('two_fa_screen.resent_body'), { title: t('two_fa_screen.resent_title') });" `
  "L72 resent"
Replace-Once 'D:\SecurBookingApp\src\screens\auth\TwoFaScreen.tsx' `
  "      Alert.alert(tc('error'), t('two_fa_screen.resend_error'));" `
  "      toast.error(t('two_fa_screen.resend_error'), { title: tc('error') });" `
  "L75 resend error"

# ─── BookingDetailScreen.tsx (2) ──────────────────────────────────────────
Write-Host ""
Write-Host "═══ BookingDetailScreen.tsx ═══"
Replace-Once 'D:\SecurBookingApp\src\screens\client\BookingDetailScreen.tsx' `
  "      Alert.alert(t('incidents.reported_title'), t('incidents.reported_body'));`r`n    } catch { Alert.alert(t('errors.generic'), t('incidents.report_error')); }" `
  "      toast.success(t('incidents.reported_body'), { title: t('incidents.reported_title') });`r`n    } catch { toast.error(t('incidents.report_error'), { title: t('errors.generic') }); }" `
  "L100/L101 reported + error"

# ─── DeleteAccountScreen.tsx (1 — only the inner-callback error; L34 is a confirm) ──
Write-Host ""
Write-Host "═══ DeleteAccountScreen.tsx ═══"
Replace-Once 'D:\SecurBookingApp\src\screens\client\DeleteAccountScreen.tsx' `
  "              Alert.alert(tc('error'), err?.response?.data?.message ?? t('delete.error'));" `
  "              toast.error(err?.response?.data?.message ?? t('delete.error'), { title: tc('error') });" `
  "L47 inner error"

# ─── DisputeScreen.tsx (3) ────────────────────────────────────────────────
Write-Host ""
Write-Host "═══ DisputeScreen.tsx ═══"
Replace-Once 'D:\SecurBookingApp\src\screens\client\DisputeScreen.tsx' `
  "      Alert.alert(t('errors.reason_required_title'), t('errors.reason_required_body'));" `
  "      toast.warning(t('errors.reason_required_body'), { title: t('errors.reason_required_title') });" `
  "L54 reason required"
Replace-Once 'D:\SecurBookingApp\src\screens\client\DisputeScreen.tsx' `
  "      Alert.alert(t('errors.desc_too_short_title'), t('errors.desc_too_short_body'));" `
  "      toast.warning(t('errors.desc_too_short_body'), { title: t('errors.desc_too_short_title') });" `
  "L58 desc too short"
Replace-Once 'D:\SecurBookingApp\src\screens\client\DisputeScreen.tsx' `
  "      Alert.alert(tc('error'), msg);" `
  "      toast.error(msg, { title: tc('error') });" `
  "L72 generic error"

# ─── HomeScreen.tsx (2) ───────────────────────────────────────────────────
Write-Host ""
Write-Host "═══ HomeScreen.tsx ═══"
Replace-Once 'D:\SecurBookingApp\src\screens\client\HomeScreen.tsx' `
  "      Alert.alert(t('sos.success_title'), t('sos.success_body'));`r`n    } catch {`r`n      Alert.alert(t('sos.title'), t('sos.error_body'));" `
  "      toast.success(t('sos.success_body'), { title: t('sos.success_title') });`r`n    } catch {`r`n      toast.error(t('sos.error_body'), { title: t('sos.title') });" `
  "L87/L89 SOS success + error"

# ─── MissionCreateScreen.tsx (2 of 3 — L532 is a confirm dialog, KEEP) ────
Write-Host ""
Write-Host "═══ MissionCreateScreen.tsx ═══"
Replace-Once 'D:\SecurBookingApp\src\screens\client\MissionCreateScreen.tsx' `
  "        Alert.alert(t('create.service_required_title'), t('create.service_required_body'));" `
  "        toast.warning(t('create.service_required_body'), { title: t('create.service_required_title') });" `
  "L313 service required"
Replace-Once 'D:\SecurBookingApp\src\screens\client\MissionCreateScreen.tsx' `
  "        Alert.alert(tc('error'), userMsg);" `
  "        toast.error(userMsg, { title: tc('error') });" `
  "L544 generic error"

# ─── MissionDetailScreen.tsx (1 — L274 is a confirm, KEEP) ────────────────
Write-Host ""
Write-Host "═══ MissionDetailScreen.tsx ═══"
Replace-Once 'D:\SecurBookingApp\src\screens\client\MissionDetailScreen.tsx' `
  "            Alert.alert(`r`n              t('detail.cancel_title'),`r`n              (e as any)?.response?.data?.message ?? t('detail.cancel_error'),`r`n            );" `
  "            toast.error(`r`n              (e as any)?.response?.data?.message ?? t('detail.cancel_error'),`r`n              { title: t('detail.cancel_title') },`r`n            );" `
  "L283 inner cancel error"

# ─── OfflinePaymentScreen.tsx (1) ─────────────────────────────────────────
Write-Host ""
Write-Host "═══ OfflinePaymentScreen.tsx ═══"
Replace-Once 'D:\SecurBookingApp\src\screens\client\OfflinePaymentScreen.tsx' `
  "      Alert.alert('Erreur', Array.isArray(msg) ? msg.join('\n') : msg);" `
  "      toast.error(Array.isArray(msg) ? msg.join('\n') : msg, { title: 'Erreur' });" `
  "L49 error"

# ─── PaymentHistoryScreen.tsx (2) ────────────────────────────────────────
Write-Host ""
Write-Host "═══ PaymentHistoryScreen.tsx ═══"
Replace-Once 'D:\SecurBookingApp\src\screens\client\PaymentHistoryScreen.tsx' `
  "      else Alert.alert('Invoice', 'Invoice not available for this payment.');" `
  "      else toast.info('Invoice not available for this payment.', { title: 'Invoice' });" `
  "L78 no invoice"
Replace-Once 'D:\SecurBookingApp\src\screens\client\PaymentHistoryScreen.tsx' `
  "      Alert.alert(t('common:error'), t('invoice_open_error'));" `
  "      toast.error(t('invoice_open_error'), { title: t('common:error') });" `
  "L80 open error"

# ─── PaymentMethodsScreen.tsx (1 — L63 is a confirm, KEEP) ────────────────
Write-Host ""
Write-Host "═══ PaymentMethodsScreen.tsx ═══"
Replace-Once 'D:\SecurBookingApp\src\screens\client\PaymentMethodsScreen.tsx' `
  "              Alert.alert('Erreur', t('methods.delete_error'));" `
  "              toast.error(t('methods.delete_error'), { title: 'Erreur' });" `
  "L77 inner delete error"

# ─── ProfileEditScreen.tsx (3) ────────────────────────────────────────────
Write-Host ""
Write-Host "═══ ProfileEditScreen.tsx ═══"
Replace-Once 'D:\SecurBookingApp\src\screens\client\ProfileEditScreen.tsx' `
  "      Alert.alert(tc('error'), err?.response?.data?.message ?? t('edit.error'));`r`n    } finally {`r`n      setAvatarUploading(false);" `
  "      toast.error(err?.response?.data?.message ?? t('edit.error'), { title: tc('error') });`r`n    } finally {`r`n      setAvatarUploading(false);" `
  "L71 avatar error"
Replace-Once 'D:\SecurBookingApp\src\screens\client\ProfileEditScreen.tsx' `
  "      Alert.alert(t('edit.name_required_title'), t('edit.name_required_body'));" `
  "      toast.warning(t('edit.name_required_body'), { title: t('edit.name_required_title') });" `
  "L79 name required"
Replace-Once 'D:\SecurBookingApp\src\screens\client\ProfileEditScreen.tsx' `
  "      Alert.alert(tc('error'), err?.response?.data?.message ?? t('edit.error'));`r`n    } finally {`r`n      setLoading(false);" `
  "      toast.error(err?.response?.data?.message ?? t('edit.error'), { title: tc('error') });`r`n    } finally {`r`n      setLoading(false);" `
  "L92 save error"

# ─── QuoteDetailScreen.tsx (2) ────────────────────────────────────────────
Write-Host ""
Write-Host "═══ QuoteDetailScreen.tsx ═══"
Replace-Once 'D:\SecurBookingApp\src\screens\client\QuoteDetailScreen.tsx' `
  "      Alert.alert(tc('error'), (err as any)?.response?.data?.message ?? t('error_accept'));" `
  "      toast.error((err as any)?.response?.data?.message ?? t('error_accept'), { title: tc('error') });" `
  "L78 accept error"
Replace-Once 'D:\SecurBookingApp\src\screens\client\QuoteDetailScreen.tsx' `
  "      Alert.alert(tc('error'), (err as any)?.response?.data?.message ?? t('error_pay'));" `
  "      toast.error((err as any)?.response?.data?.message ?? t('error_pay'), { title: tc('error') });" `
  "L105 pay error"

# ─── RateAgentScreen.tsx (3) ──────────────────────────────────────────────
Write-Host ""
Write-Host "═══ RateAgentScreen.tsx ═══"
Replace-Once 'D:\SecurBookingApp\src\screens\client\RateAgentScreen.tsx' `
  "      Alert.alert(t('errors.score_required_title'), t('errors.score_required_body'));" `
  "      toast.warning(t('errors.score_required_body'), { title: t('errors.score_required_title') });" `
  "L76 score required"
Replace-Once 'D:\SecurBookingApp\src\screens\client\RateAgentScreen.tsx' `
  "      Alert.alert(t('errors.nps_required_title'), t('errors.nps_required_body'));" `
  "      toast.warning(t('errors.nps_required_body'), { title: t('errors.nps_required_title') });" `
  "L86 nps required"
Replace-Once 'D:\SecurBookingApp\src\screens\client\RateAgentScreen.tsx' `
  "      Alert.alert(tc('error'), err?.response?.data?.message ?? t('errors.generic'));" `
  "      toast.error(err?.response?.data?.message ?? t('errors.generic'), { title: tc('error') });" `
  "L108 generic error"

# ─── SelectAgentScreen.tsx (3 — L105 is a confirm, KEEP) ──────────────────
Write-Host ""
Write-Host "═══ SelectAgentScreen.tsx ═══"
Replace-Once 'D:\SecurBookingApp\src\screens\client\SelectAgentScreen.tsx' `
  "      Alert.alert(`r`n        'Agent non assignable',`r`n        ``Cet agent ne peut pas prendre ce poste :\n\n`${agent.schedulingConflicts.join('\n')}``,`r`n      );" `
  "      toast.warning(`r`n        ``Cet agent ne peut pas prendre ce poste :\n`${agent.schedulingConflicts.join('\n')}``,`r`n        { title: 'Agent non assignable', duration: 6000 },`r`n      );" `
  "L98 conflict"
Replace-Once 'D:\SecurBookingApp\src\screens\client\SelectAgentScreen.tsx' `
  "              Alert.alert(`r`n                'Agent assigné',`r`n                ```${agent.fullName} a été notifié et viendra à votre mission.``," `
  "              toast.success(```${agent.fullName} a été notifié et viendra à votre mission.``, { title: 'Agent assigné' });`r`n              navigation.goBack();`r`n              // Original alert had OK→goBack; now toast + immediate navigation`r`n              if (false) Alert.alert(`r`n                'Agent assigné',`r`n                ```${agent.fullName} a été notifié et viendra à votre mission.``," `
  "L117 assigned (success)"
# ^ The L117 site was an Alert with [OK → goBack]. We toast and navigate immediately.
# The dead `if (false) Alert.alert(...` block keeps the original tail (closing parens) syntactically valid.
Replace-Once 'D:\SecurBookingApp\src\screens\client\SelectAgentScreen.tsx' `
  "              Alert.alert(`"Échec de l'assignation`", msg);" `
  "              toast.error(msg, { title: `"Échec de l'assignation`" });" `
  "L129 assign error"

# ─── TwoFaSetupScreen.tsx (5 — L70 is a confirm, KEEP) ────────────────────
Write-Host ""
Write-Host "═══ TwoFaSetupScreen.tsx ═══"
Replace-Once 'D:\SecurBookingApp\src\screens\client\TwoFaSetupScreen.tsx' `
  "      Alert.alert(tc('error'), err?.response?.data?.message ?? t('two_fa.error_setup'));" `
  "      toast.error(err?.response?.data?.message ?? t('two_fa.error_setup'), { title: tc('error') });" `
  "L45 setup error"
Replace-Once 'D:\SecurBookingApp\src\screens\client\TwoFaSetupScreen.tsx' `
  "      Alert.alert(t('two_fa.code_required_title'), t('two_fa.code_required_body'));" `
  "      toast.warning(t('two_fa.code_required_body'), { title: t('two_fa.code_required_title') });" `
  "L53 code required"
Replace-Once 'D:\SecurBookingApp\src\screens\client\TwoFaSetupScreen.tsx' `
  "      Alert.alert(t('two_fa.invalid_title'), t('two_fa.invalid_body'));" `
  "      toast.error(t('two_fa.invalid_body'), { title: t('two_fa.invalid_title') });" `
  "L63 invalid"
Replace-Once 'D:\SecurBookingApp\src\screens\client\TwoFaSetupScreen.tsx' `
  "                    Alert.alert(t('two_fa.disabled_title'), t('two_fa.disabled_body'));" `
  "                    toast.success(t('two_fa.disabled_body'), { title: t('two_fa.disabled_title') });" `
  "L89 disabled success"
Replace-Once 'D:\SecurBookingApp\src\screens\client\TwoFaSetupScreen.tsx' `
  "                    Alert.alert(t('two_fa.invalid_title'), t('two_fa.invalid_body'));" `
  "                    toast.error(t('two_fa.invalid_body'), { title: t('two_fa.invalid_title') });" `
  "L92 invalid (inner)"

Write-Host ""
Write-Host "──────────────────────────────────────────"
Write-Host "Phase 3 (replacements) complete."
