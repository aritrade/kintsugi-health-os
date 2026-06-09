-- Kintsugi Health OS - Phase 2 & 3 pack catalog (docs/13, docs/14)
-- Adds opt-in packs. Activation is user-driven via the pack marketplace
-- (pack_activations), so these are not auto-enabled.

insert into pack_definitions (slug, name, description, version) values
  ('weight', 'Weight & Body Composition', 'Weight, waist, body fat, and composition trends.', '1.0.0'),
  ('thyroid', 'Thyroid Pack', 'Thyroid-related symptom tracking and lab correlation.', '1.0.0'),
  ('hypertension', 'Hypertension Pack', 'Blood pressure logging and lifestyle correlation.', '1.0.0'),
  ('pcos', 'PCOS Pack', 'PCOS-related symptom tracking and cycle correlation.', '1.0.0'),
  ('fertility', 'Fertility Pack', 'Cycle tracking and fertility-window signals.', '1.0.0'),
  ('menopause', 'Menopause Pack', 'Perimenopause / menopause symptom tracking.', '1.0.0'),
  ('chronic-fatigue', 'Chronic Fatigue Pack', 'Energy, post-exertional malaise, and pacing.', '1.0.0'),
  ('mental-health', 'Mental Health Pack', 'Mood, anxiety, motivation, and connection tracking.', '1.0.0'),
  ('longevity', 'Longevity Pack', 'Healthspan behaviors: activity, recovery, restraint.', '1.0.0')
on conflict (slug) do nothing;

-- Helper pattern per pack: insert metric defs joined to the pack id by slug.
insert into pack_metric_definitions (pack_id, slug, label, kind, min_value, max_value, sex_scope, sensitivity)
select p.id, m.slug, m.label, m.kind::metric_kind, m.min_value, m.max_value, m.sex_scope::biological_sex, m.sensitivity::sensitivity
from pack_definitions p, (values
  -- Weight & Body Composition
  ('weight','weight_kg','Weight (kg)','numeric',null,null,null,'normal'),
  ('weight','waist_cm','Waist (cm)','numeric',null,null,null,'normal'),
  ('weight','neck_cm','Neck (cm)','numeric',null,null,null,'normal'),
  ('weight','body_fat_pct','Body fat (%)','numeric',null,null,null,'normal'),
  -- Thyroid
  ('thyroid','cold_intolerance','Cold intolerance','scale',1,10,null,'normal'),
  ('thyroid','thyroid_fatigue','Fatigue','scale',1,10,null,'normal'),
  ('thyroid','hair_thinning','Hair thinning','scale',1,10,null,'normal'),
  ('thyroid','brain_fog','Brain fog','scale',1,10,null,'normal'),
  ('thyroid','constipation','Constipation','scale',1,10,null,'normal'),
  -- Hypertension
  ('hypertension','systolic','Systolic (mmHg)','numeric',null,null,null,'normal'),
  ('hypertension','diastolic','Diastolic (mmHg)','numeric',null,null,null,'normal'),
  ('hypertension','bp_meds_taken','BP medication taken','boolean',null,null,null,'normal'),
  ('hypertension','high_sodium_day','High-sodium day','boolean',null,null,null,'normal'),
  -- PCOS (female, highly sensitive)
  ('pcos','acne','Acne severity','scale',1,10,'female','highly_sensitive'),
  ('pcos','hirsutism','Excess hair growth','scale',1,10,'female','highly_sensitive'),
  ('pcos','pcos_mood_swings','Mood swings','scale',1,10,'female','highly_sensitive'),
  ('pcos','irregular_cycle','Irregular cycle today','boolean',null,null,'female','highly_sensitive'),
  ('pcos','pcos_cravings','Sugar cravings','scale',1,10,'female','highly_sensitive'),
  -- Fertility (female, highly sensitive)
  ('fertility','cycle_day','Cycle day','numeric',null,null,'female','highly_sensitive'),
  ('fertility','period_today','Period today','boolean',null,null,'female','highly_sensitive'),
  ('fertility','bbt','Basal body temp (Celsius)','numeric',null,null,'female','highly_sensitive'),
  ('fertility','cervical_mucus','Cervical mucus quality','scale',1,10,'female','highly_sensitive'),
  ('fertility','ovulation_positive','Ovulation test positive','boolean',null,null,'female','highly_sensitive'),
  -- Menopause (female, highly sensitive)
  ('menopause','hot_flashes','Hot flashes','scale',1,10,'female','highly_sensitive'),
  ('menopause','night_sweats','Night sweats','scale',1,10,'female','highly_sensitive'),
  ('menopause','meno_sleep_disruption','Sleep disruption','scale',1,10,'female','highly_sensitive'),
  ('menopause','meno_mood_changes','Mood changes','scale',1,10,'female','highly_sensitive'),
  ('menopause','vaginal_dryness','Vaginal dryness','scale',1,10,'female','highly_sensitive'),
  -- Chronic Fatigue
  ('chronic-fatigue','post_exertional_malaise','Post-exertional malaise','scale',1,10,null,'normal'),
  ('chronic-fatigue','unrefreshing_sleep','Unrefreshing sleep','scale',1,10,null,'normal'),
  ('chronic-fatigue','cognitive_difficulty','Cognitive difficulty','scale',1,10,null,'normal'),
  ('chronic-fatigue','widespread_pain','Widespread pain','scale',1,10,null,'normal'),
  ('chronic-fatigue','energy_envelope_exceeded','Overdid it today','boolean',null,null,null,'normal'),
  -- Mental Health (sensitive)
  ('mental-health','mh_mood','Mood','scale',1,10,null,'sensitive'),
  ('mental-health','mh_anxiety','Anxiety','scale',1,10,null,'sensitive'),
  ('mental-health','mh_motivation','Motivation','scale',1,10,null,'sensitive'),
  ('mental-health','mh_social','Social connection','scale',1,10,null,'sensitive'),
  ('mental-health','mh_intrusive','Intrusive thoughts','scale',1,10,null,'sensitive'),
  -- Longevity
  ('longevity','exercise_minutes','Exercise minutes','numeric',null,null,null,'normal'),
  ('longevity','alcohol_free','Alcohol-free day','boolean',null,null,null,'normal'),
  ('longevity','whole_foods','Mostly whole foods','boolean',null,null,null,'normal'),
  ('longevity','resting_hr','Resting heart rate','numeric',null,null,null,'normal')
) as m(pack_slug, slug, label, kind, min_value, max_value, sex_scope, sensitivity)
where p.slug = m.pack_slug
on conflict (pack_id, slug) do nothing;
