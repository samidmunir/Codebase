-- Up Migration

-- The official scoring's versions now hold every official setting (scoring, the rules,
-- the conditions): renamed for what they are. Values saved before get the defaults for
-- the settings they didn't have.
ALTER TABLE scoring_versions RENAME TO session_rules_versions;

-- Down Migration

ALTER TABLE session_rules_versions RENAME TO scoring_versions;
