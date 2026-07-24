-- Vues read-only pour le module Rapports (§6)
-- Branchées dans app/utils/reports-sql-views.server.ts (fallback TS si absentes).
-- Exécuter ce script dans Supabase SQL Editor pour activer les vues.

-- Finance : synthèse par centre (alignée sur student_finance_summary)
CREATE OR REPLACE VIEW report_finance_by_center AS
SELECT
  center_id,
  COUNT(*) AS nb_dossiers,
  COUNT(*) FILTER (WHERE enrollment_status = 'active') AS nb_actifs,
  COALESCE(SUM(tuition_fee), 0) AS ca_facture,
  COALESCE(SUM(tuition_paid), 0) AS encaisse,
  COALESCE(SUM(reste_a_payer), 0) AS reste,
  COUNT(*) FILTER (WHERE financial_status = 'late') AS nb_retard
FROM student_finance_summary
GROUP BY center_id;

-- Finance : par filière
CREATE OR REPLACE VIEW report_finance_by_filiere AS
SELECT
  center_id,
  filiere_name,
  COUNT(*) AS nb_dossiers,
  COALESCE(SUM(tuition_fee), 0) AS ca_facture,
  COALESCE(SUM(tuition_paid), 0) AS encaisse,
  COALESCE(SUM(reste_a_payer), 0) AS reste
FROM student_finance_summary
WHERE enrollment_status = 'active'
GROUP BY center_id, filiere_name;

-- Effectifs : inscriptions actives par filière (via enrollments)
CREATE OR REPLACE VIEW report_effectifs_by_filiere AS
SELECT
  f.center_id,
  e.filiere_id,
  f.name AS filiere_name,
  COUNT(*) AS effectif,
  COUNT(*) FILTER (WHERE e.status = 'active') AS actifs,
  COUNT(*) FILTER (WHERE e.status = 'draft') AS brouillons
FROM enrollments e
JOIN filieres f ON f.id = e.filiere_id
GROUP BY f.center_id, e.filiere_id, f.name;

-- Réductions : montants par centre (enrollments)
CREATE OR REPLACE VIEW report_reductions_by_center AS
SELECT
  f.center_id,
  COUNT(*) FILTER (WHERE COALESCE(e.discount_amount, 0) > 0) AS nb_dossiers_avec_reduction,
  COALESCE(SUM(COALESCE(e.discount_amount, 0)), 0) AS total_reductions
FROM enrollments e
JOIN filieres f ON f.id = e.filiere_id
GROUP BY f.center_id;

-- Coupons actifs par centre
CREATE OR REPLACE VIEW report_coupons_summary AS
SELECT
  center_id,
  COUNT(*) AS nb_coupons,
  COUNT(*) FILTER (WHERE is_active = true) AS nb_actifs,
  COALESCE(SUM(uses_count), 0) AS utilisations_totales
FROM coupons
GROUP BY center_id;

COMMENT ON VIEW report_finance_by_center IS 'Agrégats finance direction — module rapports';
COMMENT ON VIEW report_finance_by_filiere IS 'CA et recouvrement par filière';
COMMENT ON VIEW report_effectifs_by_filiere IS 'Effectifs inscriptions par filière';
COMMENT ON VIEW report_reductions_by_center IS 'Réductions accordées par centre';
COMMENT ON VIEW report_coupons_summary IS 'Statistiques coupons promo par centre';
