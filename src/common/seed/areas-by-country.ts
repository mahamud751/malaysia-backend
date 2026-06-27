/** Common property areas per country (client order). */
export const AREAS_BY_COUNTRY: Record<
  string,
  { name: string; sortOrder: number }[]
> = {
  AE: [
    { name: 'Dubai Marina', sortOrder: 1 },
    { name: 'Downtown Dubai', sortOrder: 2 },
    { name: 'Palm Jumeirah', sortOrder: 3 },
    { name: 'Business Bay', sortOrder: 4 },
    { name: 'JBR', sortOrder: 5 },
    { name: 'DIFC', sortOrder: 6 },
  ],
  ES: [
    { name: 'Madrid', sortOrder: 1 },
    { name: 'Barcelona', sortOrder: 2 },
    { name: 'Valencia', sortOrder: 3 },
    { name: 'Marbella', sortOrder: 4 },
    { name: 'Seville', sortOrder: 5 },
    { name: 'Malaga', sortOrder: 6 },
  ],
  PT: [
    { name: 'Lisbon', sortOrder: 1 },
    { name: 'Porto', sortOrder: 2 },
    { name: 'Algarve', sortOrder: 3 },
    { name: 'Cascais', sortOrder: 4 },
    { name: 'Sintra', sortOrder: 5 },
    { name: 'Faro', sortOrder: 6 },
  ],
  US: [
    { name: 'New York', sortOrder: 1 },
    { name: 'Los Angeles', sortOrder: 2 },
    { name: 'Miami', sortOrder: 3 },
    { name: 'Chicago', sortOrder: 4 },
    { name: 'San Francisco', sortOrder: 5 },
    { name: 'Austin', sortOrder: 6 },
  ],
  MY: [
    { name: 'Mont Kiara', sortOrder: 1 },
    { name: 'Bangsar', sortOrder: 2 },
    { name: 'KLCC', sortOrder: 3 },
    { name: 'Damansara Heights', sortOrder: 4 },
    { name: 'Penang Georgetown', sortOrder: 5 },
    { name: 'Johor Bahru', sortOrder: 6 },
  ],
  QA: [
    { name: 'Doha', sortOrder: 1 },
    { name: 'The Pearl', sortOrder: 2 },
    { name: 'Lusail', sortOrder: 3 },
    { name: 'West Bay', sortOrder: 4 },
    { name: 'Al Wakrah', sortOrder: 5 },
  ],
  SA: [
    { name: 'Riyadh', sortOrder: 1 },
    { name: 'Jeddah', sortOrder: 2 },
    { name: 'Dammam', sortOrder: 3 },
    { name: 'Khobar', sortOrder: 4 },
    { name: 'NEOM', sortOrder: 5 },
  ],
  CA: [
    { name: 'Toronto', sortOrder: 1 },
    { name: 'Vancouver', sortOrder: 2 },
    { name: 'Montreal', sortOrder: 3 },
    { name: 'Calgary', sortOrder: 4 },
    { name: 'Ottawa', sortOrder: 5 },
  ],
  BD: [
    { name: 'Dhaka', sortOrder: 1 },
    { name: 'Gulshan', sortOrder: 2 },
    { name: 'Chattogram', sortOrder: 3 },
    { name: 'Sylhet', sortOrder: 4 },
    { name: 'Banani', sortOrder: 5 },
  ],
  IN: [
    { name: 'Mumbai', sortOrder: 1 },
    { name: 'Delhi', sortOrder: 2 },
    { name: 'Bangalore', sortOrder: 3 },
    { name: 'Hyderabad', sortOrder: 4 },
    { name: 'Pune', sortOrder: 5 },
    { name: 'Goa', sortOrder: 6 },
  ],
};

export function totalAreaSeedCount() {
  return Object.values(AREAS_BY_COUNTRY).reduce((sum, rows) => sum + rows.length, 0);
}
