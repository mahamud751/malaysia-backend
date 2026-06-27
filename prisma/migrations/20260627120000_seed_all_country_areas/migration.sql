-- Seed common areas for all Placein countries (idempotent)

-- Dubai (AE)
INSERT INTO "Area" ("id", "name", "countryId", "sortOrder", "isActive", "updatedAt")
VALUES
  ('seed_area_ae_dubai_marina', 'Dubai Marina', 'seed_country_dubai', 1, true, CURRENT_TIMESTAMP),
  ('seed_area_ae_downtown', 'Downtown Dubai', 'seed_country_dubai', 2, true, CURRENT_TIMESTAMP),
  ('seed_area_ae_palm', 'Palm Jumeirah', 'seed_country_dubai', 3, true, CURRENT_TIMESTAMP),
  ('seed_area_ae_business_bay', 'Business Bay', 'seed_country_dubai', 4, true, CURRENT_TIMESTAMP),
  ('seed_area_ae_jbr', 'JBR', 'seed_country_dubai', 5, true, CURRENT_TIMESTAMP),
  ('seed_area_ae_difc', 'DIFC', 'seed_country_dubai', 6, true, CURRENT_TIMESTAMP)
ON CONFLICT ("countryId", "name") DO UPDATE SET
  "sortOrder" = EXCLUDED."sortOrder",
  "isActive" = EXCLUDED."isActive",
  "updatedAt" = CURRENT_TIMESTAMP;

-- Spain (ES)
INSERT INTO "Area" ("id", "name", "countryId", "sortOrder", "isActive", "updatedAt")
VALUES
  ('seed_area_es_madrid', 'Madrid', 'seed_country_spain', 1, true, CURRENT_TIMESTAMP),
  ('seed_area_es_barcelona', 'Barcelona', 'seed_country_spain', 2, true, CURRENT_TIMESTAMP),
  ('seed_area_es_valencia', 'Valencia', 'seed_country_spain', 3, true, CURRENT_TIMESTAMP),
  ('seed_area_es_marbella', 'Marbella', 'seed_country_spain', 4, true, CURRENT_TIMESTAMP),
  ('seed_area_es_seville', 'Seville', 'seed_country_spain', 5, true, CURRENT_TIMESTAMP),
  ('seed_area_es_malaga', 'Malaga', 'seed_country_spain', 6, true, CURRENT_TIMESTAMP)
ON CONFLICT ("countryId", "name") DO UPDATE SET
  "sortOrder" = EXCLUDED."sortOrder",
  "isActive" = EXCLUDED."isActive",
  "updatedAt" = CURRENT_TIMESTAMP;

-- Portugal (PT)
INSERT INTO "Area" ("id", "name", "countryId", "sortOrder", "isActive", "updatedAt")
VALUES
  ('seed_area_pt_lisbon', 'Lisbon', 'seed_country_portugal', 1, true, CURRENT_TIMESTAMP),
  ('seed_area_pt_porto', 'Porto', 'seed_country_portugal', 2, true, CURRENT_TIMESTAMP),
  ('seed_area_pt_algarve', 'Algarve', 'seed_country_portugal', 3, true, CURRENT_TIMESTAMP),
  ('seed_area_pt_cascais', 'Cascais', 'seed_country_portugal', 4, true, CURRENT_TIMESTAMP),
  ('seed_area_pt_sintra', 'Sintra', 'seed_country_portugal', 5, true, CURRENT_TIMESTAMP),
  ('seed_area_pt_faro', 'Faro', 'seed_country_portugal', 6, true, CURRENT_TIMESTAMP)
ON CONFLICT ("countryId", "name") DO UPDATE SET
  "sortOrder" = EXCLUDED."sortOrder",
  "isActive" = EXCLUDED."isActive",
  "updatedAt" = CURRENT_TIMESTAMP;

-- USA (US)
INSERT INTO "Area" ("id", "name", "countryId", "sortOrder", "isActive", "updatedAt")
VALUES
  ('seed_area_us_nyc', 'New York', 'seed_country_usa', 1, true, CURRENT_TIMESTAMP),
  ('seed_area_us_la', 'Los Angeles', 'seed_country_usa', 2, true, CURRENT_TIMESTAMP),
  ('seed_area_us_miami', 'Miami', 'seed_country_usa', 3, true, CURRENT_TIMESTAMP),
  ('seed_area_us_chicago', 'Chicago', 'seed_country_usa', 4, true, CURRENT_TIMESTAMP),
  ('seed_area_us_sf', 'San Francisco', 'seed_country_usa', 5, true, CURRENT_TIMESTAMP),
  ('seed_area_us_austin', 'Austin', 'seed_country_usa', 6, true, CURRENT_TIMESTAMP)
ON CONFLICT ("countryId", "name") DO UPDATE SET
  "sortOrder" = EXCLUDED."sortOrder",
  "isActive" = EXCLUDED."isActive",
  "updatedAt" = CURRENT_TIMESTAMP;

-- Malaysia (MY)
INSERT INTO "Area" ("id", "name", "countryId", "sortOrder", "isActive", "updatedAt")
VALUES
  ('seed_area_my_mont_kiara', 'Mont Kiara', 'seed_country_malaysia', 1, true, CURRENT_TIMESTAMP),
  ('seed_area_my_bangsar', 'Bangsar', 'seed_country_malaysia', 2, true, CURRENT_TIMESTAMP),
  ('seed_area_my_klcc', 'KLCC', 'seed_country_malaysia', 3, true, CURRENT_TIMESTAMP),
  ('seed_area_my_damansara', 'Damansara Heights', 'seed_country_malaysia', 4, true, CURRENT_TIMESTAMP),
  ('seed_area_my_penang', 'Penang Georgetown', 'seed_country_malaysia', 5, true, CURRENT_TIMESTAMP),
  ('seed_area_my_jb', 'Johor Bahru', 'seed_country_malaysia', 6, true, CURRENT_TIMESTAMP)
ON CONFLICT ("countryId", "name") DO UPDATE SET
  "sortOrder" = EXCLUDED."sortOrder",
  "isActive" = EXCLUDED."isActive",
  "updatedAt" = CURRENT_TIMESTAMP;

-- Qatar (QA)
INSERT INTO "Area" ("id", "name", "countryId", "sortOrder", "isActive", "updatedAt")
VALUES
  ('seed_area_qa_doha', 'Doha', 'seed_country_qatar', 1, true, CURRENT_TIMESTAMP),
  ('seed_area_qa_pearl', 'The Pearl', 'seed_country_qatar', 2, true, CURRENT_TIMESTAMP),
  ('seed_area_qa_lusail', 'Lusail', 'seed_country_qatar', 3, true, CURRENT_TIMESTAMP),
  ('seed_area_qa_west_bay', 'West Bay', 'seed_country_qatar', 4, true, CURRENT_TIMESTAMP),
  ('seed_area_qa_wakrah', 'Al Wakrah', 'seed_country_qatar', 5, true, CURRENT_TIMESTAMP)
ON CONFLICT ("countryId", "name") DO UPDATE SET
  "sortOrder" = EXCLUDED."sortOrder",
  "isActive" = EXCLUDED."isActive",
  "updatedAt" = CURRENT_TIMESTAMP;

-- Saudi (SA)
INSERT INTO "Area" ("id", "name", "countryId", "sortOrder", "isActive", "updatedAt")
VALUES
  ('seed_area_sa_riyadh', 'Riyadh', 'seed_country_saudi', 1, true, CURRENT_TIMESTAMP),
  ('seed_area_sa_jeddah', 'Jeddah', 'seed_country_saudi', 2, true, CURRENT_TIMESTAMP),
  ('seed_area_sa_dammam', 'Dammam', 'seed_country_saudi', 3, true, CURRENT_TIMESTAMP),
  ('seed_area_sa_khobar', 'Khobar', 'seed_country_saudi', 4, true, CURRENT_TIMESTAMP),
  ('seed_area_sa_neom', 'NEOM', 'seed_country_saudi', 5, true, CURRENT_TIMESTAMP)
ON CONFLICT ("countryId", "name") DO UPDATE SET
  "sortOrder" = EXCLUDED."sortOrder",
  "isActive" = EXCLUDED."isActive",
  "updatedAt" = CURRENT_TIMESTAMP;

-- Canada (CA)
INSERT INTO "Area" ("id", "name", "countryId", "sortOrder", "isActive", "updatedAt")
VALUES
  ('seed_area_ca_toronto', 'Toronto', 'seed_country_canada', 1, true, CURRENT_TIMESTAMP),
  ('seed_area_ca_vancouver', 'Vancouver', 'seed_country_canada', 2, true, CURRENT_TIMESTAMP),
  ('seed_area_ca_montreal', 'Montreal', 'seed_country_canada', 3, true, CURRENT_TIMESTAMP),
  ('seed_area_ca_calgary', 'Calgary', 'seed_country_canada', 4, true, CURRENT_TIMESTAMP),
  ('seed_area_ca_ottawa', 'Ottawa', 'seed_country_canada', 5, true, CURRENT_TIMESTAMP)
ON CONFLICT ("countryId", "name") DO UPDATE SET
  "sortOrder" = EXCLUDED."sortOrder",
  "isActive" = EXCLUDED."isActive",
  "updatedAt" = CURRENT_TIMESTAMP;

-- Bangladesh (BD)
INSERT INTO "Area" ("id", "name", "countryId", "sortOrder", "isActive", "updatedAt")
VALUES
  ('seed_area_bd_dhaka', 'Dhaka', 'seed_country_bangladesh', 1, true, CURRENT_TIMESTAMP),
  ('seed_area_bd_gulshan', 'Gulshan', 'seed_country_bangladesh', 2, true, CURRENT_TIMESTAMP),
  ('seed_area_bd_chattogram', 'Chattogram', 'seed_country_bangladesh', 3, true, CURRENT_TIMESTAMP),
  ('seed_area_bd_sylhet', 'Sylhet', 'seed_country_bangladesh', 4, true, CURRENT_TIMESTAMP),
  ('seed_area_bd_banani', 'Banani', 'seed_country_bangladesh', 5, true, CURRENT_TIMESTAMP)
ON CONFLICT ("countryId", "name") DO UPDATE SET
  "sortOrder" = EXCLUDED."sortOrder",
  "isActive" = EXCLUDED."isActive",
  "updatedAt" = CURRENT_TIMESTAMP;

-- India (IN)
INSERT INTO "Area" ("id", "name", "countryId", "sortOrder", "isActive", "updatedAt")
VALUES
  ('seed_area_in_mumbai', 'Mumbai', 'seed_country_india', 1, true, CURRENT_TIMESTAMP),
  ('seed_area_in_delhi', 'Delhi', 'seed_country_india', 2, true, CURRENT_TIMESTAMP),
  ('seed_area_in_bangalore', 'Bangalore', 'seed_country_india', 3, true, CURRENT_TIMESTAMP),
  ('seed_area_in_hyderabad', 'Hyderabad', 'seed_country_india', 4, true, CURRENT_TIMESTAMP),
  ('seed_area_in_pune', 'Pune', 'seed_country_india', 5, true, CURRENT_TIMESTAMP),
  ('seed_area_in_goa', 'Goa', 'seed_country_india', 6, true, CURRENT_TIMESTAMP)
ON CONFLICT ("countryId", "name") DO UPDATE SET
  "sortOrder" = EXCLUDED."sortOrder",
  "isActive" = EXCLUDED."isActive",
  "updatedAt" = CURRENT_TIMESTAMP;
