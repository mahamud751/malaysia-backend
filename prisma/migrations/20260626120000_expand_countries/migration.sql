-- Expand Placein country list (client order: Dubai, Spain, Portugal, USA, Malaysia, Qatar, Saudi, Canada, Bangladesh, India)

INSERT INTO "Country" ("id", "name", "code", "subtitle", "imageUrl", "defaultCurrency", "mapLatitude", "mapLongitude", "sortOrder", "isActive", "updatedAt")
VALUES
  ('seed_country_dubai', 'Dubai', 'AE', 'Discover properties in Dubai', 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=300&auto=format&fit=crop', 'AED', 25.2048, 55.2708, 1, true, CURRENT_TIMESTAMP),
  ('seed_country_spain', 'Spain', 'ES', 'Discover properties in Spain', 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?q=80&w=300&auto=format&fit=crop', 'EUR', 40.4168, -3.7038, 2, true, CURRENT_TIMESTAMP),
  ('seed_country_portugal', 'Portugal', 'PT', 'Discover properties in Portugal', 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?q=80&w=300&auto=format&fit=crop', 'EUR', 38.7223, -9.1393, 3, true, CURRENT_TIMESTAMP),
  ('seed_country_usa', 'USA', 'US', 'Discover properties in the USA', 'https://images.unsplash.com/photo-1496442223266-8d4d0e62e6e9?q=80&w=300&auto=format&fit=crop', 'USD', 40.7128, -74.006, 4, true, CURRENT_TIMESTAMP),
  ('seed_country_malaysia', 'Malaysia', 'MY', 'Discover properties in Malaysia', 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=300&auto=format&fit=crop', 'GBP', 3.139, 101.6869, 5, true, CURRENT_TIMESTAMP),
  ('seed_country_qatar', 'Qatar', 'QA', 'Discover properties in Qatar', 'https://images.unsplash.com/photo-1580500532595-4a956a7262a8?q=80&w=300&auto=format&fit=crop', 'QAR', 25.2854, 51.531, 6, true, CURRENT_TIMESTAMP),
  ('seed_country_saudi', 'Saudi', 'SA', 'Discover properties in Saudi Arabia', 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f1fa?q=80&w=300&auto=format&fit=crop', 'SAR', 24.7136, 46.6753, 7, true, CURRENT_TIMESTAMP),
  ('seed_country_canada', 'Canada', 'CA', 'Discover properties in Canada', 'https://images.unsplash.com/photo-1517935708355-2065223a13de?q=80&w=300&auto=format&fit=crop', 'CAD', 43.6532, -79.3832, 8, true, CURRENT_TIMESTAMP),
  ('seed_country_bangladesh', 'Bangladesh', 'BD', 'Discover properties in Bangladesh', 'https://images.unsplash.com/photo-1587474260584-136574528ed5?q=80&w=300&auto=format&fit=crop', 'BDT', 23.8103, 90.4125, 9, true, CURRENT_TIMESTAMP),
  ('seed_country_india', 'India', 'IN', 'Discover properties in India', 'https://images.unsplash.com/photo-1524492412937-28028a87fd3e?q=80&w=300&auto=format&fit=crop', 'INR', 28.6139, 77.209, 10, true, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "subtitle" = EXCLUDED."subtitle",
  "imageUrl" = EXCLUDED."imageUrl",
  "defaultCurrency" = EXCLUDED."defaultCurrency",
  "mapLatitude" = EXCLUDED."mapLatitude",
  "mapLongitude" = EXCLUDED."mapLongitude",
  "sortOrder" = EXCLUDED."sortOrder",
  "isActive" = EXCLUDED."isActive",
  "updatedAt" = CURRENT_TIMESTAMP;
