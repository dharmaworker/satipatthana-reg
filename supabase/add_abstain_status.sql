-- 互動報名狀態加入「棄權」(abstain)
ALTER TABLE interactive_registrations
  DROP CONSTRAINT IF EXISTS interactive_registrations_group_status_check;
ALTER TABLE interactive_registrations
  ADD CONSTRAINT interactive_registrations_group_status_check
  CHECK (group_status IN ('pending', 'won', 'waitlist', 'lost', 'abstain'));

ALTER TABLE interactive_registrations
  DROP CONSTRAINT IF EXISTS interactive_registrations_small_status_check;
ALTER TABLE interactive_registrations
  ADD CONSTRAINT interactive_registrations_small_status_check
  CHECK (small_status IN ('pending', 'won', 'waitlist', 'lost', 'abstain'));
