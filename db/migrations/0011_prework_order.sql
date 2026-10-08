-- cAMP 201 - Reorder Pre-Work items on the Journey tab.
-- Order: Complete Registration, Calendar Invites, Ramp Budget, Book Travel,
--        Challenger, Wheel & Deal, Share with Manager.
-- Any other pre-work items keep their relative order and move to the end.

UPDATE camp201_journey_content
SET sort_order = sort_order + 100, updated_at = now()
WHERE section = 'prework'
  AND (item_key IS NULL OR item_key NOT IN (
    'complete_registration', 'calendar_invites', 'ramp_budget', 'book_travel',
    'challenger_sales', 'wheel_and_deal', 'share_with_manager'
  ))
  AND sort_order < 100;

UPDATE camp201_journey_content AS jc
SET sort_order = o.pos, updated_at = now()
FROM (VALUES
  ('complete_registration', 1),
  ('calendar_invites',      2),
  ('ramp_budget',           3),
  ('book_travel',           4),
  ('challenger_sales',      5),
  ('wheel_and_deal',        6),
  ('share_with_manager',    7)
) AS o(item_key, pos)
WHERE jc.section = 'prework' AND jc.item_key = o.item_key;
