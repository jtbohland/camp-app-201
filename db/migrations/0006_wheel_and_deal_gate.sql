-- cAMP 201 - Wheel & Deal lock (update 2)
-- The route was already gated on "wheel_and_deal" but no gate row existed,
-- so counselors had no way to lock/unlock it. Starts unlocked to match current behavior.
INSERT INTO camp201_feature_gates (feature_key, label, is_locked)
VALUES ('wheel_and_deal', 'Wheel & Deal', false)
ON CONFLICT (feature_key) DO NOTHING;
