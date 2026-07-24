-- ⚠️ À exécuter dans Supabase SQL Editor

-- 1. REPLICA IDENTITY FULL — obligatoire pour que les filtres realtime fonctionnent
--    sur des colonnes non-PK (to_user_id, from_user_id)
ALTER TABLE private_messages REPLICA IDENTITY FULL;

-- 2. Politique UPDATE manquante (pour marquer les messages comme lus)
DROP POLICY IF EXISTS "pm_update_read" ON private_messages;
CREATE POLICY "pm_update_read" ON private_messages
  FOR UPDATE USING (
    auth.uid() = to_user_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND "role" = 'admin')
  )
  WITH CHECK (
    auth.uid() = to_user_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND "role" = 'admin')
  );

-- 3. (optionnel) recréer les policies SELECT avec "role" correctement quoté
--    Si tu as l'erreur "column role does not exist", exécute aussi ces lignes :
DROP POLICY IF EXISTS "pm_admin_select" ON private_messages;
CREATE POLICY "pm_admin_select" ON private_messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND "role" = 'admin')
  );
