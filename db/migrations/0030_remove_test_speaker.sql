-- cAMP 201 Update 38: remove the leftover "Test Executive Updated" speaker tile.
-- Matches only that exact test name (no real speaker has it), plus its Q&A questions.
-- Safe to re-run: does nothing once the row is gone.

DELETE FROM camp201_exec_questions
WHERE executive_id IN (SELECT id FROM camp201_executives WHERE name = 'Test Executive Updated');

DELETE FROM camp201_executives
WHERE name = 'Test Executive Updated';
