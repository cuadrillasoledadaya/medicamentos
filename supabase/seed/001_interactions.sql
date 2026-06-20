-- Seed curated drug-drug interaction pairs.
-- Canonical ordering: drug_a < drug_b (alphabetically).
-- Idempotent: uses INSERT ... ON CONFLICT DO NOTHING.

insert into interactions (drug_a, drug_b, severity, description, source_notes)
values
  ('aspirina', 'warfarina', 'severe',
   'Aumenta significativamente el riesgo de sangrado. Evitar combinación o monitorear INR estrechamente.',
   'ANMAT 2024'),

  ('ibuprofeno', 'warfarina', 'warning',
   'AINEs potencian el efecto anticoagulante de warfarina. Riesgo de hemorragia gastrointestinal.',
   'FDA Label'),

  ('enalapril', 'espironolactona', 'caution',
   'Riesgo de hiperpotasemia. Monitorear potasio sérico regularmente.',
   'ANMAT 2024'),

  ('metformina', 'contraste_yodado', 'warning',
   'Suspender metformina 48h antes y después de procedimientos con contraste yodado. Riesgo de acidosis láctica.',
   'FDA Label'),

  ('simvastatina', 'claritromicina', 'severe',
   'Inhibición de CYP3A4 aumenta niveles de simvastatina. Riesgo de rabdomiólisis.',
   'FDA Label'),

  ('omeprazol', 'clopidogrel', 'caution',
   'Omeprazol reduce la activación de clopidogrel vía CYP2C19. Considerar pantoprazol como alternativa.',
   'EMA 2023'),

  ('fluoxetina', 'tramadol', 'warning',
   'Riesgo de síndrome serotoninérgico. Evitar combinación o monitorear estrechamente.',
   'FDA Label'),

  ('metotrexato', 'ibuprofeno', 'severe',
   'AINEs reducen la eliminación renal de metotrexato. Riesgo de toxicidad grave.',
   'ANMAT 2024'),

  ('digoxina', 'amiodarona', 'caution',
   'Amiodarona aumenta niveles de digoxina. Reducir dosis de digoxina en 50%.',
   'FDA Label'),

  ('levotiroxina', 'hierro', 'caution',
   'El hierro reduce la absorción de levotiroxina. Separar administración al menos 4 horas.',
   'EMA 2023')
on conflict (drug_a, drug_b) do nothing;
