-- Kintsugi Health OS - extend index_kind enum for Phase 2 & 3 pack indices.
-- New values must exist before recompute can store these derived indices.

alter type index_kind add value if not exists 'body_composition';
alter type index_kind add value if not exists 'thyroid_symptom_load';
alter type index_kind add value if not exists 'bp_control';
alter type index_kind add value if not exists 'cycle_regularity';
alter type index_kind add value if not exists 'pcos_symptom_load';
alter type index_kind add value if not exists 'fertility_readiness';
alter type index_kind add value if not exists 'menopause_symptom_load';
alter type index_kind add value if not exists 'energy_stability';
alter type index_kind add value if not exists 'mood_stability';
alter type index_kind add value if not exists 'longevity_score';
