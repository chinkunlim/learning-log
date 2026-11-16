-- 我的學習紀錄：資料表與門禁（RLS）
-- 用法：在 Supabase 左側 SQL Editor 貼上整份並按 Run（可重複執行）。

-- 1. 建立資料表：user_id 預設自動帶入目前登入者 auth.uid()
create table if not exists public.learning_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  log_date   date not null default current_date,
  topic      text not null check (char_length(topic) between 1 and 200),
  minutes    integer check (minutes is null or (minutes >= 0 and minutes <= 1440)),
  note       text check (note is null or char_length(note) <= 1000),
  created_at timestamptz not null default now()
);

-- 2. 開啟 Row Level Security（門禁）
alter table public.learning_logs enable row level security;

-- 3. 清除這張表既有的舊規則，避免舊規則放行過寬
do $$
declare p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'learning_logs'
  loop
    execute format('drop policy %I on public.learning_logs', p.policyname);
  end loop;
end $$;

-- 4. 建立門禁規則：每一條都以 auth.uid() 比對 user_id，只有本人能讀寫刪
create policy "本人可以看自己的紀錄" on public.learning_logs
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "本人只能新增自己的紀錄" on public.learning_logs
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "本人只能修改自己的紀錄" on public.learning_logs
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "本人只能刪除自己的紀錄" on public.learning_logs
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- 5. 授權給已登入使用者（authenticated），並撤銷未登入者（anon）權限
grant select, insert, update, delete on table public.learning_logs to authenticated;
revoke all on table public.learning_logs from anon;
