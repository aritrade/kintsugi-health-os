-- Kintsugi Health OS - Nutrition Knowledge Graph seed (catalog reference data).
-- Curated, evidence-graded mappings. Global staples + Indian / West Bengal foods.
-- All inserts are idempotent (on conflict do nothing).

-- ---------------------------------------------------------------------------
-- Nutrients (RDA by biological sex where it differs)
-- ---------------------------------------------------------------------------
insert into nutrients (slug, name, unit, category, rda, description) values
  ('vitamin_d','Vitamin D','mcg','vitamin','{"male":15,"female":15}','Supports calcium absorption and bone mineralization.'),
  ('calcium','Calcium','mg','mineral','{"male":1000,"female":1000}','Primary structural mineral of bone; supports neuromuscular function.'),
  ('iron','Iron','mg','mineral','{"male":8,"female":18}','Component of hemoglobin; central to oxygen transport.'),
  ('vitamin_b12','Vitamin B12','mcg','vitamin','{"male":2.4,"female":2.4}','Supports red blood cell formation and nerve function.'),
  ('folate','Folate','mcg','vitamin','{"male":400,"female":400}','Supports DNA synthesis and red blood cell formation.'),
  ('magnesium','Magnesium','mg','mineral','{"male":400,"female":310}','Cofactor in neuromuscular and energy metabolism.'),
  ('protein','Protein','g','macronutrient','{"male":56,"female":46}','Provides amino acids for tissue and muscle synthesis.'),
  ('omega_3','Omega-3 (EPA/DHA)','g','fat','{"male":1.6,"female":1.1}','Long-chain fatty acids involved in membrane and signalling pathways.'),
  ('vitamin_c','Vitamin C','mg','vitamin','{"male":90,"female":75}','Antioxidant; supports immune function and iron absorption.'),
  ('zinc','Zinc','mg','mineral','{"male":11,"female":8}','Supports immune function, skin, and hair.'),
  ('potassium','Potassium','mg','mineral','{"male":3400,"female":2600}','Electrolyte involved in blood pressure regulation.'),
  ('fiber','Dietary fiber','g','macronutrient','{"male":38,"female":25}','Supports gut motility and the microbiome.')
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Mechanisms (plain-language biological pathways)
-- ---------------------------------------------------------------------------
insert into mechanisms (slug, description) values
  ('bone_mineralization','provides minerals that are deposited into the bone matrix'),
  ('calcium_absorption','helps the gut absorb dietary calcium'),
  ('oxygen_transport','is built into hemoglobin, which carries oxygen in the blood'),
  ('rbc_formation','is needed to form healthy red blood cells'),
  ('neuromuscular_function','supports normal nerve signalling and muscle contraction'),
  ('dna_synthesis','is used to build and repair DNA in dividing cells'),
  ('neurotransmitter_synthesis','is involved in producing neurotransmitters that affect mood'),
  ('immune_support','supports the activity of immune cells'),
  ('protein_synthesis','provides amino acids used to build and maintain muscle'),
  ('electrolyte_balance','helps balance sodium and regulate blood pressure'),
  ('antioxidant','helps neutralise oxidative stress in tissues'),
  ('gut_motility','adds bulk that supports regular gut movement')
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Evidence sources (graded A strongest .. E weakest)
-- ---------------------------------------------------------------------------
insert into nutrition_evidence_sources (slug, citation, source_type, grade, note) values
  ('ev_vitd_bone','Vitamin D and calcium for bone health: pooled analyses of supplementation trials.','meta_analysis','A','Consistent association with bone mineral density.'),
  ('ev_calcium_bone','Dietary calcium intake and bone mineral density (systematic review).','systematic_review','A','Adequate calcium associated with bone maintenance.'),
  ('ev_iron_anemia','Iron intake and iron-deficiency anemia (systematic review).','systematic_review','A','Iron repletion associated with restored hemoglobin.'),
  ('ev_b12_anemia','Vitamin B12 status and megaloblastic anemia (review).','systematic_review','A','B12 adequacy associated with normal RBC formation.'),
  ('ev_folate_anemia','Folate intake and red blood cell formation (review).','systematic_review','B','Folate associated with healthy erythropoiesis.'),
  ('ev_iron_fatigue','Iron status and fatigue in non-anemic individuals (RCTs).','rct','B','Mixed but supportive association with energy.'),
  ('ev_b12_fatigue','B12 status and tiredness (cohort evidence).','cohort','C','Observational association with energy levels.'),
  ('ev_vitd_fatigue','Vitamin D status and fatigue (cohort studies).','cohort','C','Observational; effect sizes vary.'),
  ('ev_magnesium_cramps','Magnesium and skeletal muscle cramps (RCTs).','rct','C','Inconsistent but plausible association.'),
  ('ev_omega3_mood','Omega-3 fatty acids and low mood (meta-analysis).','meta_analysis','B','Modest association with mood support.'),
  ('ev_potassium_bp','Dietary potassium and blood pressure (meta-analysis).','meta_analysis','A','Higher potassium associated with lower blood pressure.'),
  ('ev_protein_muscle','Dietary protein and muscle mass maintenance (review).','systematic_review','A','Adequate protein associated with muscle preservation.'),
  ('ev_vitc_immune','Vitamin C and immune function (review).','systematic_review','B','Associated with normal immune cell activity.'),
  ('ev_zinc_hair','Zinc status and hair / skin health (review).','systematic_review','C','Observational association.'),
  ('ev_fiber_gut','Dietary fiber and gut health (review).','systematic_review','B','Associated with regularity and microbiome diversity.'),
  ('ev_expert_general','General dietary reference intakes and food-composition databases.','expert_consensus','C','Reference values for typical intakes.')
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Foods (global staples + Indian / West Bengal items)
-- diet_flags marks which diet types may eat the food.
-- ---------------------------------------------------------------------------
insert into foods (slug, name, category, region_tags, diet_flags, allergens, cultural_tags, meal_slots) values
  ('greek_yogurt','Greek yogurt','dairy','{global}','{"vegetarian":true,"vegan":false,"pescatarian":true}','{dairy}','{}','{breakfast,snack}'),
  ('milk_fortified','Fortified milk','dairy','{global}','{"vegetarian":true,"vegan":false,"pescatarian":true}','{dairy}','{}','{breakfast}'),
  ('salmon','Salmon','fish','{global}','{"vegetarian":false,"vegan":false,"pescatarian":true}','{fish}','{}','{lunch,dinner}'),
  ('sardines','Sardines','fish','{global}','{"vegetarian":false,"vegan":false,"pescatarian":true}','{fish}','{}','{lunch,dinner}'),
  ('eggs','Eggs','protein','{global}','{"vegetarian":true,"vegan":false,"pescatarian":true}','{egg}','{}','{breakfast}'),
  ('spinach','Spinach','vegetable','{global}','{"vegetarian":true,"vegan":true,"pescatarian":true}','{}','{}','{lunch,dinner}'),
  ('almonds','Almonds','seed_nut','{global}','{"vegetarian":true,"vegan":true,"pescatarian":true}','{tree_nut}','{}','{snack}'),
  ('pumpkin_seeds','Pumpkin seeds','seed_nut','{global}','{"vegetarian":true,"vegan":true,"pescatarian":true}','{}','{}','{snack}'),
  ('lentils','Lentils','legume','{global}','{"vegetarian":true,"vegan":true,"pescatarian":true}','{}','{}','{lunch,dinner}'),
  ('chickpeas','Chickpeas','legume','{global}','{"vegetarian":true,"vegan":true,"pescatarian":true}','{}','{}','{lunch,dinner}'),
  ('tofu','Tofu','protein','{global}','{"vegetarian":true,"vegan":true,"pescatarian":true}','{soy}','{}','{lunch,dinner}'),
  ('broccoli','Broccoli','vegetable','{global}','{"vegetarian":true,"vegan":true,"pescatarian":true}','{}','{}','{lunch,dinner}'),
  ('orange','Orange','fruit','{global}','{"vegetarian":true,"vegan":true,"pescatarian":true}','{}','{}','{breakfast,snack}'),
  ('banana','Banana','fruit','{global}','{"vegetarian":true,"vegan":true,"pescatarian":true}','{}','{}','{breakfast,snack}'),
  ('oats','Oats','grain','{global}','{"vegetarian":true,"vegan":true,"pescatarian":true}','{}','{}','{breakfast}'),
  ('chicken_breast','Chicken breast','protein','{global}','{"vegetarian":false,"vegan":false,"pescatarian":false}','{}','{}','{lunch,dinner}'),
  ('beef','Lean beef','protein','{global}','{"vegetarian":false,"vegan":false,"pescatarian":false}','{}','{}','{dinner}'),
  ('sweet_potato','Sweet potato','vegetable','{global}','{"vegetarian":true,"vegan":true,"pescatarian":true}','{}','{}','{lunch,dinner}'),
  ('mushrooms_uv','UV-exposed mushrooms','vegetable','{global}','{"vegetarian":true,"vegan":true,"pescatarian":true}','{}','{}','{lunch,dinner}'),
  ('rohu','Rohu fish','fish','{"West Bengal",India}','{"vegetarian":false,"vegan":false,"pescatarian":true}','{fish}','{bengali}','{lunch,dinner}'),
  ('hilsa','Hilsa (ilish)','fish','{"West Bengal",India}','{"vegetarian":false,"vegan":false,"pescatarian":true}','{fish}','{bengali}','{lunch,dinner}'),
  ('curd_dahi','Curd (dahi)','dairy','{"West Bengal",India}','{"vegetarian":true,"vegan":false,"pescatarian":true}','{dairy}','{bengali,indian}','{breakfast,snack}'),
  ('paneer','Paneer','dairy','{India}','{"vegetarian":true,"vegan":false,"pescatarian":true}','{dairy}','{indian}','{lunch,dinner}'),
  ('mustard_greens','Mustard greens (shorshe shak)','vegetable','{"West Bengal",India}','{"vegetarian":true,"vegan":true,"pescatarian":true}','{}','{bengali,indian}','{lunch,dinner}'),
  ('sesame_seeds','Sesame seeds (til)','seed_nut','{India}','{"vegetarian":true,"vegan":true,"pescatarian":true}','{sesame}','{indian}','{snack}'),
  ('masoor_dal','Masoor dal','legume','{"West Bengal",India}','{"vegetarian":true,"vegan":true,"pescatarian":true}','{}','{bengali,indian}','{lunch,dinner}'),
  ('moringa','Moringa (sajne)','vegetable','{India}','{"vegetarian":true,"vegan":true,"pescatarian":true}','{}','{indian}','{lunch,dinner}'),
  ('ragi','Ragi (finger millet)','grain','{India}','{"vegetarian":true,"vegan":true,"pescatarian":true}','{}','{indian}','{breakfast}')
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Food -> nutrient content (per typical serving)
-- ---------------------------------------------------------------------------
insert into food_nutrients (food_id, nutrient_id, amount, serving_desc)
select f.id, n.id, v.amount, v.serving
from (values
  ('greek_yogurt','calcium',200,'170 g'),('greek_yogurt','protein',17,'170 g'),('greek_yogurt','vitamin_b12',1.3,'170 g'),
  ('milk_fortified','calcium',300,'240 ml'),('milk_fortified','vitamin_d',3,'240 ml'),('milk_fortified','protein',8,'240 ml'),('milk_fortified','vitamin_b12',1.2,'240 ml'),
  ('salmon','vitamin_d',13,'100 g'),('salmon','omega_3',2.3,'100 g'),('salmon','protein',20,'100 g'),('salmon','vitamin_b12',3,'100 g'),
  ('sardines','calcium',380,'100 g'),('sardines','vitamin_d',5,'100 g'),('sardines','omega_3',1.5,'100 g'),('sardines','protein',25,'100 g'),
  ('eggs','protein',12,'2 eggs'),('eggs','vitamin_d',2,'2 eggs'),('eggs','vitamin_b12',1.1,'2 eggs'),
  ('spinach','iron',3.6,'100 g cooked'),('spinach','calcium',136,'100 g cooked'),('spinach','folate',146,'100 g cooked'),('spinach','magnesium',79,'100 g cooked'),
  ('almonds','calcium',76,'28 g'),('almonds','magnesium',80,'28 g'),('almonds','protein',6,'28 g'),
  ('pumpkin_seeds','magnesium',150,'28 g'),('pumpkin_seeds','iron',2.5,'28 g'),('pumpkin_seeds','zinc',2.2,'28 g'),('pumpkin_seeds','protein',9,'28 g'),
  ('lentils','iron',6.6,'1 cup cooked'),('lentils','folate',358,'1 cup cooked'),('lentils','protein',18,'1 cup cooked'),('lentils','fiber',16,'1 cup cooked'),
  ('chickpeas','iron',4.7,'1 cup cooked'),('chickpeas','folate',282,'1 cup cooked'),('chickpeas','protein',15,'1 cup cooked'),('chickpeas','fiber',12,'1 cup cooked'),
  ('tofu','calcium',350,'100 g'),('tofu','protein',8,'100 g'),('tofu','iron',5.4,'100 g'),
  ('broccoli','vitamin_c',81,'1 cup'),('broccoli','calcium',43,'1 cup'),('broccoli','folate',57,'1 cup'),('broccoli','fiber',2.4,'1 cup'),
  ('orange','vitamin_c',70,'1 medium'),('orange','folate',40,'1 medium'),('orange','fiber',3,'1 medium'),
  ('banana','potassium',422,'1 medium'),('banana','magnesium',32,'1 medium'),('banana','fiber',3,'1 medium'),
  ('oats','fiber',4,'40 g dry'),('oats','magnesium',56,'40 g dry'),('oats','iron',1.8,'40 g dry'),
  ('chicken_breast','protein',31,'100 g'),('chicken_breast','vitamin_b12',0.3,'100 g'),('chicken_breast','zinc',1,'100 g'),
  ('beef','iron',2.7,'100 g'),('beef','vitamin_b12',2.6,'100 g'),('beef','zinc',4.8,'100 g'),('beef','protein',26,'100 g'),
  ('sweet_potato','potassium',542,'1 medium'),('sweet_potato','fiber',4,'1 medium'),('sweet_potato','vitamin_c',22,'1 medium'),
  ('mushrooms_uv','vitamin_d',10,'100 g'),
  ('rohu','protein',17,'100 g'),('rohu','vitamin_d',4,'100 g'),('rohu','omega_3',0.5,'100 g'),('rohu','vitamin_b12',2,'100 g'),
  ('hilsa','omega_3',2.0,'100 g'),('hilsa','protein',21,'100 g'),('hilsa','vitamin_d',5,'100 g'),
  ('curd_dahi','calcium',180,'150 g'),('curd_dahi','protein',5,'150 g'),('curd_dahi','vitamin_b12',0.7,'150 g'),
  ('paneer','calcium',480,'100 g'),('paneer','protein',18,'100 g'),
  ('mustard_greens','calcium',165,'100 g cooked'),('mustard_greens','iron',1.5,'100 g cooked'),('mustard_greens','vitamin_c',35,'100 g cooked'),('mustard_greens','folate',73,'100 g cooked'),
  ('sesame_seeds','calcium',280,'28 g'),('sesame_seeds','iron',4.1,'28 g'),('sesame_seeds','magnesium',100,'28 g'),
  ('masoor_dal','iron',6.6,'1 cup cooked'),('masoor_dal','folate',358,'1 cup cooked'),('masoor_dal','protein',18,'1 cup cooked'),('masoor_dal','fiber',15,'1 cup cooked'),
  ('moringa','calcium',185,'100 g'),('moringa','iron',4,'100 g'),('moringa','vitamin_c',51,'100 g'),
  ('ragi','calcium',344,'100 g'),('ragi','iron',3.9,'100 g'),('ragi','fiber',11,'100 g')
) as v(food_slug, nutrient_slug, amount, serving)
join foods f on f.slug = v.food_slug
join nutrients n on n.slug = v.nutrient_slug
on conflict (food_id, nutrient_id) do nothing;

-- ---------------------------------------------------------------------------
-- Symptom -> nutrient associations (weight 0..1)
-- ---------------------------------------------------------------------------
insert into nutrient_symptoms (nutrient_id, symptom_name, weight, mechanism_id, evidence_id)
select n.id, v.symptom, v.weight, m.id, e.id
from (values
  ('iron','fatigue',0.6,'oxygen_transport','ev_iron_fatigue'),
  ('vitamin_b12','fatigue',0.5,'rbc_formation','ev_b12_fatigue'),
  ('folate','fatigue',0.4,'rbc_formation','ev_folate_anemia'),
  ('vitamin_d','fatigue',0.4,'neuromuscular_function','ev_vitd_fatigue'),
  ('magnesium','fatigue',0.3,'neuromuscular_function','ev_magnesium_cramps'),
  ('iron','low energy',0.55,'oxygen_transport','ev_iron_fatigue'),
  ('vitamin_b12','low energy',0.45,'rbc_formation','ev_b12_fatigue'),
  ('vitamin_d','low energy',0.4,'neuromuscular_function','ev_vitd_fatigue'),
  ('magnesium','muscle cramps',0.6,'neuromuscular_function','ev_magnesium_cramps'),
  ('calcium','muscle cramps',0.4,'neuromuscular_function','ev_calcium_bone'),
  ('potassium','muscle cramps',0.45,'electrolyte_balance','ev_potassium_bp'),
  ('vitamin_d','muscle weakness',0.5,'neuromuscular_function','ev_vitd_fatigue'),
  ('magnesium','muscle weakness',0.4,'neuromuscular_function','ev_magnesium_cramps'),
  ('protein','muscle weakness',0.4,'protein_synthesis','ev_protein_muscle'),
  ('vitamin_d','bone pain',0.5,'bone_mineralization','ev_vitd_bone'),
  ('calcium','bone pain',0.5,'bone_mineralization','ev_calcium_bone'),
  ('iron','hair loss',0.5,'oxygen_transport','ev_iron_anemia'),
  ('zinc','hair loss',0.45,'immune_support','ev_zinc_hair'),
  ('protein','hair loss',0.4,'protein_synthesis','ev_protein_muscle'),
  ('iron','brittle nails',0.4,'oxygen_transport','ev_iron_anemia'),
  ('zinc','brittle nails',0.4,'immune_support','ev_zinc_hair'),
  ('vitamin_d','low mood',0.4,'neurotransmitter_synthesis','ev_omega3_mood'),
  ('omega_3','low mood',0.4,'neurotransmitter_synthesis','ev_omega3_mood'),
  ('vitamin_b12','low mood',0.4,'neurotransmitter_synthesis','ev_b12_fatigue'),
  ('folate','low mood',0.3,'neurotransmitter_synthesis','ev_folate_anemia'),
  ('vitamin_b12','brain fog',0.45,'rbc_formation','ev_b12_fatigue'),
  ('iron','brain fog',0.4,'oxygen_transport','ev_iron_fatigue'),
  ('omega_3','brain fog',0.3,'neurotransmitter_synthesis','ev_omega3_mood'),
  ('vitamin_b12','tingling',0.6,'rbc_formation','ev_b12_anemia'),
  ('iron','pale skin',0.5,'oxygen_transport','ev_iron_anemia'),
  ('vitamin_c','frequent infections',0.4,'immune_support','ev_vitc_immune'),
  ('zinc','frequent infections',0.45,'immune_support','ev_vitc_immune'),
  ('vitamin_d','frequent infections',0.4,'immune_support','ev_vitd_fatigue'),
  ('magnesium','poor sleep',0.4,'neuromuscular_function','ev_magnesium_cramps'),
  ('iron','restless legs',0.5,'oxygen_transport','ev_iron_anemia'),
  ('magnesium','headaches',0.35,'neuromuscular_function','ev_magnesium_cramps'),
  ('fiber','constipation',0.5,'gut_motility','ev_fiber_gut'),
  ('magnesium','constipation',0.3,'gut_motility','ev_magnesium_cramps'),
  ('iron','shortness of breath',0.45,'oxygen_transport','ev_iron_anemia'),
  ('iron','dizziness',0.4,'oxygen_transport','ev_iron_anemia'),
  ('fiber','acid reflux',0.2,'gut_motility','ev_fiber_gut'),
  ('magnesium','acid reflux',0.2,'neuromuscular_function','ev_magnesium_cramps')
) as v(nutrient_slug, symptom, weight, mech_slug, ev_slug)
join nutrients n on n.slug = v.nutrient_slug
left join mechanisms m on m.slug = v.mech_slug
left join nutrition_evidence_sources e on e.slug = v.ev_slug
on conflict (nutrient_id, symptom_name) do nothing;

-- ---------------------------------------------------------------------------
-- Condition / goal -> nutrient associations
-- ---------------------------------------------------------------------------
insert into nutrient_conditions (condition_slug, nutrient_id, relationship, mechanism_id, evidence_id)
select v.condition_slug, n.id, v.relationship, m.id, e.id
from (values
  ('bone_health','calcium','supports','bone_mineralization','ev_calcium_bone'),
  ('bone_health','vitamin_d','supports','calcium_absorption','ev_vitd_bone'),
  ('bone_health','protein','supports','protein_synthesis','ev_protein_muscle'),
  ('bone_health','magnesium','supports','bone_mineralization','ev_calcium_bone'),
  ('osteoporosis','calcium','supports','bone_mineralization','ev_calcium_bone'),
  ('osteoporosis','vitamin_d','supports','calcium_absorption','ev_vitd_bone'),
  ('osteopenia','calcium','supports','bone_mineralization','ev_calcium_bone'),
  ('osteopenia','vitamin_d','supports','calcium_absorption','ev_vitd_bone'),
  ('anemia','iron','supports','oxygen_transport','ev_iron_anemia'),
  ('anemia','vitamin_b12','supports','rbc_formation','ev_b12_anemia'),
  ('anemia','folate','supports','dna_synthesis','ev_folate_anemia'),
  ('anemia','vitamin_c','supports','antioxidant','ev_vitc_immune'),
  ('hypertension','potassium','supports','electrolyte_balance','ev_potassium_bp'),
  ('hypertension','magnesium','supports','neuromuscular_function','ev_magnesium_cramps'),
  ('low_mood','omega_3','supports','neurotransmitter_synthesis','ev_omega3_mood'),
  ('low_mood','vitamin_d','supports','neurotransmitter_synthesis','ev_vitd_fatigue'),
  ('low_mood','vitamin_b12','supports','neurotransmitter_synthesis','ev_b12_fatigue'),
  ('low_mood','folate','supports','neurotransmitter_synthesis','ev_folate_anemia'),
  ('immunity','vitamin_c','supports','immune_support','ev_vitc_immune'),
  ('immunity','zinc','supports','immune_support','ev_vitc_immune'),
  ('immunity','vitamin_d','supports','immune_support','ev_vitd_fatigue'),
  ('muscle_health','protein','supports','protein_synthesis','ev_protein_muscle'),
  ('muscle_health','vitamin_d','supports','neuromuscular_function','ev_vitd_fatigue'),
  ('muscle_health','magnesium','supports','neuromuscular_function','ev_magnesium_cramps'),
  ('fatigue','iron','supports','oxygen_transport','ev_iron_fatigue'),
  ('fatigue','vitamin_b12','supports','rbc_formation','ev_b12_fatigue'),
  ('fatigue','vitamin_d','supports','neuromuscular_function','ev_vitd_fatigue'),
  ('gut_health','fiber','supports','gut_motility','ev_fiber_gut')
) as v(condition_slug, nutrient_slug, relationship, mech_slug, ev_slug)
join nutrients n on n.slug = v.nutrient_slug
left join mechanisms m on m.slug = v.mech_slug
left join nutrition_evidence_sources e on e.slug = v.ev_slug
on conflict (condition_slug, nutrient_id) do nothing;

-- ---------------------------------------------------------------------------
-- Nutrient -> lab marker thresholds (logical reference to biomarkers / input labs)
-- ---------------------------------------------------------------------------
insert into nutrient_lab_markers (nutrient_id, biomarker_slug, low_threshold, unit)
select n.id, v.bm, v.low, v.unit
from (values
  ('vitamin_d','vitamin_d',30,'ng/mL'),
  ('iron','ferritin',30,'ng/mL'),
  ('vitamin_b12','vitamin_b12',300,'pg/mL'),
  ('folate','folate',4,'ng/mL'),
  ('calcium','calcium',8.5,'mg/dL'),
  ('magnesium','magnesium',1.8,'mg/dL'),
  ('potassium','potassium',3.5,'mmol/L')
) as v(nutrient_slug, bm, low, unit)
join nutrients n on n.slug = v.nutrient_slug
on conflict (nutrient_id, biomarker_slug) do nothing;

-- ---------------------------------------------------------------------------
-- Food / nutrient <-> medication interactions
-- ---------------------------------------------------------------------------
insert into food_drug_interactions (subject, subject_kind, medication_class, severity, note, safer_alternatives) values
  ('vitamin_k_foods','food','anticoagulant','caution','High vitamin-K greens can affect how some blood thinners (e.g. warfarin) work; keep intake steady and discuss with your clinician.','{salmon,sardines,oats}'),
  ('potassium','nutrient','ace_inhibitor','caution','High-potassium foods may interact with ACE inhibitors / potassium-sparing diuretics; discuss with your clinician.','{oats,milk_fortified}'),
  ('potassium','nutrient','potassium_sparing_diuretic','caution','Potassium-sparing diuretics can raise potassium; be cautious combining with very high-potassium foods.','{oats,milk_fortified}'),
  ('calcium','nutrient','levothyroxine','caution','Calcium-rich foods can reduce levothyroxine absorption; separate them by a few hours.','{spinach,broccoli}'),
  ('iron','nutrient','levothyroxine','caution','Iron can reduce levothyroxine absorption; separate them by a few hours.','{vitamin_c}'),
  ('calcium','nutrient','tetracycline_antibiotic','caution','Dairy / calcium can bind some antibiotics; separate dosing as advised.','{}'),
  ('grapefruit','food','statin','avoid','Grapefruit can raise blood levels of some statins; usually best avoided.','{orange}')
on conflict (subject, medication_class) do nothing;

-- ---------------------------------------------------------------------------
-- Condition -> dietary restrictions (drives the Safety Engine)
-- ---------------------------------------------------------------------------
insert into condition_diet_restrictions (condition_slug, restricted, restricted_kind, rule, severity, safer_alternatives) values
  ('ckd','potassium','nutrient','Chronic kidney disease often requires limiting potassium; high-potassium foods may need to be moderated.','avoid','{}'),
  ('ckd','protein','nutrient','Some kidney conditions require moderating protein; discuss targets with your clinician.','caution','{}'),
  ('ckd','banana','food','Bananas are high in potassium and are often limited in CKD.','avoid','{orange,broccoli}'),
  ('ckd','sweet_potato','food','Sweet potato is high in potassium and is often limited in CKD.','avoid','{broccoli}'),
  ('diabetes','banana','food','Bananas are higher in fast carbohydrate; pair with protein/fat and watch portions.','caution','{orange,almonds}'),
  ('hyperkalemia','potassium','nutrient','High blood potassium requires limiting high-potassium foods.','avoid','{}'),
  ('pregnancy','hilsa','food','Some larger / oily fish can be higher in mercury; check current pregnancy guidance.','caution','{rohu,salmon}'),
  ('lactose_intolerance','milk_fortified','food','Milk may not be tolerated; choose lactose-free or plant calcium sources.','caution','{tofu,sesame_seeds,ragi}')
on conflict (condition_slug, restricted) do nothing;
