-- À exécuter dans Supabase SQL Editor
-- Matières système TCF pour le constructeur de cours (gestion-cours)
-- 4 compétences + Neutre (transversal). N'affecte pas les centres génériques côté UI.

INSERT INTO public.exam_disciplines (name, code, is_builtin, center_id)
SELECT v.name, v.code, true, null
FROM (VALUES
  ('Compréhension écrite',  'tcf_comprehension_ecrite'),
  ('Compréhension orale',   'tcf_comprehension_orale'),
  ('Expression écrite',     'tcf_expression_ecrite'),
  ('Expression orale',      'tcf_expression_orale'),
  ('Neutre',                'tcf_neutral')
) AS v(name, code)
WHERE NOT EXISTS (
  SELECT 1 FROM public.exam_disciplines d WHERE d.code = v.code
);

-- Mise à jour des libellés si les lignes existaient déjà
UPDATE public.exam_disciplines d
SET name = v.name, is_builtin = true, center_id = null
FROM (VALUES
  ('Compréhension écrite',  'tcf_comprehension_ecrite'),
  ('Compréhension orale',   'tcf_comprehension_orale'),
  ('Expression écrite',     'tcf_expression_ecrite'),
  ('Expression orale',      'tcf_expression_orale'),
  ('Neutre',                'tcf_neutral')
) AS v(name, code)
WHERE d.code = v.code;
