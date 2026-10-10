-- Fix onboarding initialization of tenant AI settings.
drop policy if exists ai_settings_insert on public.ai_settings;
create policy ai_settings_insert on public.ai_settings
for insert to authenticated
with check (
  private.can_manage_team(organization_id)
  and updated_by=(select auth.uid())
);
grant insert on public.ai_settings to authenticated;
