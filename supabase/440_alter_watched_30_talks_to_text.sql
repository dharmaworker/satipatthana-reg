-- Q12 從 yes/no 改為三選一：yes / no / commit
-- 'commit' 代表「目前尚未聽完，承諾於 8/16 禪修前完整聽完 30 個法談」

alter table registrations
  alter column watched_30_talks drop default;

alter table registrations
  alter column watched_30_talks type text
  using case when watched_30_talks then 'yes' else 'no' end;

alter table registrations
  alter column watched_30_talks set default 'no';

alter table registrations
  alter column watched_30_talks set not null;
