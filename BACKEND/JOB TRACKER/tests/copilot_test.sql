-- Apply Copilot RPC tests (schema.sql section 7).
-- Run: npx supabase db query --remote=cdlvlgtemdlhbvhihvle -f "BACKEND/JOB TRACKER/tests/copilot_test.sql"
-- Everything is rolled back. Success = no ERROR (and NOTICE 'ALL PASS' if notices are shown).
begin;
do $$
declare v_tok text; v_uid uuid; v_res jsonb; v_app jt_applications;
begin
  v_tok := public.jt_sign_up('jtc_t_' || substr(md5(random()::text), 1, 8), 'testpass123')->>'token';

  v_res := public.jt_copilot_load(v_tok)::jsonb;
  assert v_res->>'profile' = '' and v_res->'answers' = '{}'::jsonb, 'load: empty';
  assert (v_res->>'used_today')::int = 0 and (v_res->>'daily_cap')::int = 25, 'load: 0 of 25';

  begin perform public.jt_copilot_take(v_tok); raise exception 'take without profile must fail';
  exception when sqlstate 'JTNOP' then null; end;

  v_res := public.jt_copilot_save(v_tok, 'Clark profile',
    '{"first_name":"  Clark ","bogus":"x","custom":[{"question":"Q1","answer":"A1"},{"question":"","answer":"gone"}]}')::jsonb;
  assert v_res->'answers'->>'first_name' = 'Clark', 'save: trims';
  assert not (v_res->'answers' ? 'bogus'), 'save: drops unknown keys';
  assert jsonb_array_length(v_res->'answers'->'custom') = 1, 'save: drops empty custom rows';

  begin perform public.jt_copilot_save(v_tok, repeat('x', 12001), '{}'); raise exception 'long profile must fail';
  exception when sqlstate '22023' then null; end;
  begin perform public.jt_copilot_save(v_tok, 'p', '[]'); raise exception 'array answers must fail';
  exception when sqlstate '22023' then null; end;

  v_res := public.jt_copilot_take(v_tok)::jsonb;
  assert (v_res->>'used_today')::int = 1 and v_res->>'profile' = 'Clark profile', 'take: counts, returns profile';

  v_uid := public.jt_user_from_token(v_tok);   -- look up once: calling it inside the UPDATE's WHERE raised 28000
  update jt_copilot_usage set count = 25 where user_id = v_uid;
  begin perform public.jt_copilot_take(v_tok); raise exception 'take past cap must fail';
  exception when sqlstate 'JTCAP' then null; end;
  assert (public.jt_copilot_load(v_tok)::jsonb->>'used_today')::int = 25, 'cap: failed take does not count past 25';

  v_app := public.jt_save_application(v_tok, '{"title":"VA","url":"https://www.onlinejobs.ph/jobseekers/job/Some-VA-123/?utm=x#top","applied_on":"2026-11-16","source":"onlinejobsph"}');
  assert public.jt_find_application(v_tok, 'https://www.onlinejobs.ph/jobseekers/job/some-va-123') = v_app.id, 'find: same job, other spelling';
  assert public.jt_find_application(v_tok, 'https://www.onlinejobs.ph/jobseekers/job/other-9') is null, 'find: other job';

  begin perform public.jt_copilot_load('nope'); raise exception 'bad token must fail';
  exception when sqlstate '28000' then null; end;

  raise notice 'ALL PASS';
end $$;
rollback;
