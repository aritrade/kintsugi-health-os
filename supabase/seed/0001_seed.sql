-- Kintsugi Health OS - seed data (M0)
-- Investigation Pack definitions + metrics (Sleep, Sexual Health) and biomarker catalog.
-- Pack metric vocabulary mirrors docs/01-prd.md section 12.1 and docs/09-type-definitions.md.

-- ---------------------------------------------------------------------------
-- Packs
-- ---------------------------------------------------------------------------
insert into pack_definitions (slug, name, description, version) values
  ('sleep', 'Sleep Pack', 'Sleep quality, recovery, and related metrics.', '1.0.0'),
  ('sexual-health', 'Sexual Health Pack', 'Libido, erectile function, female sexual wellness, ejaculatory control.', '1.0.0')
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Sleep Pack metrics (all users)
-- ---------------------------------------------------------------------------
insert into pack_metric_definitions (pack_id, slug, label, kind, min_value, max_value, sex_scope, sensitivity)
select id, m.slug, m.label, m.kind::metric_kind, m.min_value, m.max_value, null, 'normal'::sensitivity
from pack_definitions, (values
  ('sleep_quality', 'Sleep quality', 'scale', 1, 10),
  ('daytime_fatigue', 'Daytime fatigue', 'scale', 1, 10)
) as m(slug, label, kind, min_value, max_value)
where pack_definitions.slug = 'sleep'
on conflict (pack_id, slug) do nothing;

-- ---------------------------------------------------------------------------
-- Sexual Health Pack metrics (sex-scoped; highly sensitive)
-- ---------------------------------------------------------------------------
insert into pack_metric_definitions (pack_id, slug, label, kind, min_value, max_value, sex_scope, sensitivity)
select p.id, m.slug, m.label, m.kind::metric_kind, m.min_value, m.max_value, m.sex_scope::biological_sex, 'highly_sensitive'::sensitivity
from pack_definitions p, (values
  -- Libido (all users)
  ('libido_desire',          'Sexual desire',         'scale',   1, 10, null),
  ('libido_thoughts',        'Sexual thoughts',       'scale',   1, 10, null),
  ('libido_attraction',      'Attraction',            'scale',   1, 10, null),
  ('libido_satisfaction',    'Sexual satisfaction',   'scale',   1, 10, null),
  -- Erectile function (male)
  ('morning_erection',       'Morning erection',      'boolean', null, null, 'male'),
  ('spontaneous_erection',   'Spontaneous erection',  'boolean', null, null, 'male'),
  ('erection_quality',       'Erection quality',      'scale',   1, 10, 'male'),
  ('erection_duration',      'Erection duration',     'numeric', null, null, 'male'),
  ('erectile_confidence',    'Sexual confidence',     'scale',   1, 10, 'male'),
  -- Ejaculatory control (male)
  ('ejac_latency',           'Latency',               'numeric', null, null, 'male'),
  ('ejac_control',           'Control',               'scale',   1, 10, 'male'),
  ('ejac_satisfaction',      'Satisfaction',          'scale',   1, 10, 'male'),
  -- Female sexual wellness (female)
  ('fsw_desire',             'Desire',                'scale',   1, 10, 'female'),
  ('fsw_arousal',            'Arousal',               'scale',   1, 10, 'female'),
  ('fsw_lubrication',        'Lubrication',           'scale',   1, 10, 'female'),
  ('fsw_orgasm',             'Orgasm satisfaction',   'scale',   1, 10, 'female'),
  ('fsw_intimacy',           'Intimacy satisfaction', 'scale',   1, 10, 'female')
) as m(slug, label, kind, min_value, max_value, sex_scope)
where p.slug = 'sexual-health'
on conflict (pack_id, slug) do nothing;

-- ---------------------------------------------------------------------------
-- Biomarker catalog (subset; doc 05 section 9)
-- ---------------------------------------------------------------------------
insert into biomarkers (slug, display_name, unit, default_ref_low, default_ref_high, category) values
  ('hba1c',        'HbA1c',                 '%',     4.0, 5.6,  'metabolic'),
  ('vitamin_d',    'Vitamin D (25-OH)',     'ng/mL', 30,  100,  'vitamin'),
  ('tsh',          'TSH',                   'mIU/L', 0.4, 4.0,  'thyroid'),
  ('free_t4',      'Free T4',               'ng/dL', 0.8, 1.8,  'thyroid'),
  ('testosterone_total', 'Total testosterone', 'ng/dL', 300, 1000, 'hormone'),
  ('shbg',         'SHBG',                  'nmol/L',10,  57,   'hormone'),
  ('ldl',          'LDL cholesterol',       'mg/dL', 0,   100,  'lipid'),
  ('hdl',          'HDL cholesterol',       'mg/dL', 40,  60,   'lipid'),
  ('triglycerides','Triglycerides',         'mg/dL', 0,   150,  'lipid'),
  ('hemoglobin',   'Hemoglobin',            'g/dL',  13.5,17.5, 'cbc'),
  ('ferritin',     'Ferritin',              'ng/mL', 30,  400,  'cbc')
on conflict (slug) do nothing;
