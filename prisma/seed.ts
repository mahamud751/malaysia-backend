import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const AREAS = [
  { name: 'Mont Kiara', sortOrder: 1 },
  { name: 'Bangsar', sortOrder: 2 },
  { name: 'KLCC', sortOrder: 3 },
  { name: 'Damansara Heights', sortOrder: 4 },
  { name: 'Penang Georgetown', sortOrder: 5 },
  { name: 'Johor Bahru', sortOrder: 6 },
];

const AGENT = {
  email: 'ayon@gmail.com',
  password: '123456',
  fullName: 'Ayon Hassan',
  phone: '+60123456789',
  agencyName: 'Place In Malaysia Realty',
  cityOrArea: 'Kuala Lumpur',
  reraLicenseNumber: 'MY-REA-2024-001',
  profileImageUrl:
    'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=200&q=80',
  about:
    'Licensed agent specialising in luxury homes and investment properties across Kuala Lumpur and Penang.',
  responseTime: 'Within 2 hours',
  languages: ['English', 'Bahasa Malaysia'],
  specializations: ['Luxury', 'Investment', 'Condominiums'],
};

const IMG = {
  house:
    'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80',
  villa:
    'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80',
  apartment:
    'https://images.unsplash.com/photo-1545324418-cc68a1d9c331?auto=format&fit=crop&w=1200&q=80',
  condo:
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
  modern:
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
  pool:
    'https://images.unsplash.com/photo-1600585154340-be6162a9a0c2?auto=format&fit=crop&w=1200&q=80',
  interior:
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
  terrace:
    'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd7?auto=format&fit=crop&w=1200&q=80',
};

type PropertySeed = {
  title: string;
  areaName: string;
  propertyType: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  areaSqFt: number;
  landAreaSqFt?: number;
  address: string;
  latitude: number;
  longitude: number;
  furnishing: string;
  availability: string;
  status: string;
  description: string;
  imageUrls: string[];
};

const PROPERTIES: PropertySeed[] = [
  {
    title: 'Luxury Villa with Private Pool',
    areaName: 'Mont Kiara',
    propertyType: 'Villa',
    price: 2850000,
    bedrooms: 5,
    bathrooms: 6,
    areaSqFt: 4200,
    landAreaSqFt: 6500,
    address:
      '12 Jalan Kiara 3, Mont Kiara, 50480 Kuala Lumpur, Wilayah Persekutuan, Malaysia',
    latitude: 3.1725,
    longitude: 101.6508,
    furnishing: 'Fully Furnished',
    availability: 'Ready to Move in',
    status: 'FOR_SALE',
    description:
      'Stunning 5-bedroom villa in Mont Kiara with private pool, smart home features, and 24-hour security. Walking distance to international schools and dining.',
    imageUrls: [IMG.villa, IMG.pool, IMG.interior],
  },
  {
    title: 'KLCC Skyline Penthouse',
    areaName: 'KLCC',
    propertyType: 'Apartment',
    price: 3200000,
    bedrooms: 4,
    bathrooms: 5,
    areaSqFt: 3100,
    address:
      '88 Jalan Pinang, Kuala Lumpur City Centre, 50450 Kuala Lumpur, Malaysia',
    latitude: 3.1579,
    longitude: 101.7116,
    furnishing: 'Fully Furnished',
    availability: 'Ready to Move in',
    status: 'FOR_SALE',
    description:
      'Corner penthouse with panoramic Petronas Twin Towers views, private lift lobby, and five-star building facilities.',
    imageUrls: [IMG.apartment, IMG.modern, IMG.interior],
  },
  {
    title: 'Bangsar Family Residence',
    areaName: 'Bangsar',
    propertyType: 'Residence',
    price: 1450000,
    bedrooms: 4,
    bathrooms: 3,
    areaSqFt: 2400,
    landAreaSqFt: 3200,
    address:
      '45 Jalan Terasek 3, Bangsar, 59100 Kuala Lumpur, Wilayah Persekutuan, Malaysia',
    latitude: 3.1289,
    longitude: 101.6784,
    furnishing: 'Partially Furnished',
    availability: 'Ready to Move in',
    status: 'FOR_SALE',
    description:
      'Quiet Bangsar neighbourhood, open-plan living, large garden, and easy access to LRT Bangsar station.',
    imageUrls: [IMG.house, IMG.terrace, IMG.interior],
  },
  {
    title: 'Damansara Investment Condo',
    areaName: 'Damansara Heights',
    propertyType: 'Investment',
    price: 980000,
    bedrooms: 3,
    bathrooms: 2,
    areaSqFt: 1450,
    address:
      'Jalan Semantan, Damansara Heights, 50490 Kuala Lumpur, Wilayah Persekutuan, Malaysia',
    latitude: 3.1546,
    longitude: 101.6648,
    furnishing: 'Fully Furnished',
    availability: 'Ready to Move in',
    status: 'FOR_SALE',
    description:
      'High rental yield investment unit near KL business district. Tenanted with strong ROI history — ideal for investors.',
    imageUrls: [IMG.condo, IMG.apartment],
  },
  {
    title: 'Mont Kiara Designer Apartment',
    areaName: 'Mont Kiara',
    propertyType: 'Apartment',
    price: 1250000,
    bedrooms: 3,
    bathrooms: 3,
    areaSqFt: 1850,
    address:
      '2 Jalan Kiara, Mont Kiara, 50480 Kuala Lumpur, Wilayah Persekutuan, Malaysia',
    latitude: 3.171,
    longitude: 101.652,
    furnishing: 'Fully Furnished',
    availability: 'Ready to Move in',
    status: 'FOR_SALE',
    description:
      'Brand-new designer finishes, floor-to-ceiling windows, and resort-style facilities including gym and infinity pool.',
    imageUrls: [IMG.condo, IMG.modern],
  },
  {
    title: 'Penang Heritage Sea View Home',
    areaName: 'Penang Georgetown',
    propertyType: 'Residence',
    price: 1680000,
    bedrooms: 4,
    bathrooms: 4,
    areaSqFt: 2800,
    address:
      '88 Lebuh Light, Georgetown, 10200 George Town, Penang, Malaysia',
    latitude: 5.4141,
    longitude: 100.3288,
    furnishing: 'Partially Furnished',
    availability: 'Ready to Move in',
    status: 'FOR_SALE',
    description:
      'Restored heritage home minutes from UNESCO Georgetown with sea glimpses and modern kitchen extension.',
    imageUrls: [IMG.terrace, IMG.house],
  },
  {
    title: 'Johor Bahru Smart Villa',
    areaName: 'Johor Bahru',
    propertyType: 'Villa',
    price: 1950000,
    bedrooms: 5,
    bathrooms: 5,
    areaSqFt: 3800,
    landAreaSqFt: 5200,
    address:
      '15 Jalan Indah 4, Bukit Indah, 81200 Johor Bahru, Johor, Malaysia',
    latitude: 1.4927,
    longitude: 103.7414,
    furnishing: 'Fully Furnished',
    availability: 'Under Construction',
    status: 'FOR_SALE',
    description:
      'Gated community villa near Singapore causeway with EV charging, solar panels, and landscaped gardens.',
    imageUrls: [IMG.villa, IMG.modern, IMG.pool],
  },
  {
    title: 'KLCC Commercial Investment Suite',
    areaName: 'KLCC',
    propertyType: 'Investment',
    price: 2100000,
    bedrooms: 2,
    bathrooms: 2,
    areaSqFt: 1650,
    address:
      'Menara KLCC, Jalan Ampang, 50088 Kuala Lumpur, Wilayah Persekutuan, Malaysia',
    latitude: 3.158,
    longitude: 101.713,
    furnishing: 'Unfurnished',
    availability: 'Pre Launch',
    status: 'FOR_SALE',
    description:
      'Grade-A commercial-residential suite with stable corporate tenancy. Strong capital appreciation in KLCC core.',
    imageUrls: [IMG.apartment, IMG.modern],
  },
];

async function seedAreas() {
  const malaysia = await prisma.country.findUnique({ where: { code: 'MY' } });
  if (!malaysia) {
    throw new Error('Malaysia country not found — run countries migration first');
  }
  const map = new Map<string, string>();
  for (const row of AREAS) {
    const area = await prisma.area.upsert({
      where: { countryId_name: { countryId: malaysia.id, name: row.name } },
      create: {
        name: row.name,
        countryId: malaysia.id,
        sortOrder: row.sortOrder,
        isActive: true,
      },
      update: { sortOrder: row.sortOrder, isActive: true },
    });
    map.set(row.name, area.id);
  }
  return map;
}

async function seedAgent() {
  const passwordHash = await bcrypt.hash(AGENT.password, 10);
  return prisma.user.upsert({
    where: { email: AGENT.email.toLowerCase() },
    create: {
      email: AGENT.email.toLowerCase(),
      passwordHash,
      fullName: AGENT.fullName,
      phone: AGENT.phone,
      role: UserRole.AGENT,
      agencyName: AGENT.agencyName,
      cityOrArea: AGENT.cityOrArea,
      reraLicenseNumber: AGENT.reraLicenseNumber,
      profileImageUrl: AGENT.profileImageUrl,
      about: AGENT.about,
      responseTime: AGENT.responseTime,
      languages: AGENT.languages,
      specializations: AGENT.specializations,
    },
    update: {
      passwordHash,
      fullName: AGENT.fullName,
      phone: AGENT.phone,
      role: UserRole.AGENT,
      agencyName: AGENT.agencyName,
      cityOrArea: AGENT.cityOrArea,
      reraLicenseNumber: AGENT.reraLicenseNumber,
      profileImageUrl: AGENT.profileImageUrl,
      about: AGENT.about,
      responseTime: AGENT.responseTime,
      languages: AGENT.languages,
      specializations: AGENT.specializations,
    },
  });
}

async function seedProperties(
  ownerId: string,
  areaIds: Map<string, string>,
) {
  const malaysia = await prisma.country.findUnique({ where: { code: 'MY' } });
  if (!malaysia) {
    throw new Error('Malaysia country not found — run countries migration first');
  }
  await prisma.property.deleteMany({ where: { ownerId } });

  for (const p of PROPERTIES) {
    const areaId = areaIds.get(p.areaName);
    await prisma.property.create({
      data: {
        title: p.title,
        description: p.description,
        city: p.areaName,
        address: p.address,
        countryId: malaysia.id,
        areaId,
        latitude: p.latitude,
        longitude: p.longitude,
        propertyType: p.propertyType,
        price: p.price,
        currency: 'GBP',
        bedrooms: p.bedrooms,
        bathrooms: p.bathrooms,
        areaSqFt: p.areaSqFt,
        landAreaSqFt: p.landAreaSqFt,
        furnishing: p.furnishing,
        availability: p.availability,
        status: p.status,
        approvalStatus: 'ACTIVE',
        imageUrls: p.imageUrls,
        videoUrls: [],
        isActive: true,
        ownerId,
      },
    });
  }
}

async function seedPlatformSettings() {
  await prisma.platformSettings.upsert({
    where: { id: 'default' },
    create: {
      id: 'default',
      monthlyFeeGbp: 800,
      settings: {
        platform: [
          {
            key: 'verify_agents',
            label: 'Verify new agent signups manually',
            checked: true,
            enabled: true,
          },
          {
            key: 'auto_archive',
            label: 'Auto-archive flagged listings after 7 days',
            checked: false,
            enabled: true,
          },
        ],
        features: [
          {
            key: 'double_opt_in',
            label: 'Require double opt-in for new leads',
            checked: false,
            enabled: false,
          },
        ],
      },
    },
    update: {},
  });
}

async function main() {
  console.log('Seeding Malaysia areas…');
  const areaIds = await seedAreas();

  console.log('Seeding agent ayon@gmail.com…');
  const agent = await seedAgent();

  console.log('Seeding properties…');
  await seedProperties(agent.id, areaIds);

  console.log('Seeding platform settings…');
  await seedPlatformSettings();

  console.log('\nDone.');
  console.log(`  Areas: ${AREAS.length}`);
  console.log(`  Properties: ${PROPERTIES.length} (approval: ACTIVE)`);
  console.log('  Agent login: ayon@gmail.com / 123456');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
