-- cAMP 201 - Memories becomes its own sidebar tab (update 27)
-- Previously Memories lived inside the Graduation page. It now has its own
-- route (/memories) and lock so counselors can open it independently.
-- Starts locked; counselors unlock it from the sidebar or Counselor Hub.
INSERT INTO camp201_feature_gates (feature_key, label, is_locked)
VALUES ('memories', 'Memories', true)
ON CONFLICT (feature_key) DO NOTHING;
