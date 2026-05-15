export interface Barbershop {
  id: number;
  name: string;
  photo: string;
  rating: number;
  reviewCount: number;
  specialties: string[];
  openNow: boolean;
  lat: number;
  lng: number;
}

export const BARBERSHOPS: Barbershop[] = [
  {
    id: 1,
    name: "Captain Barbershop",
    photo: "https://images.unsplash.com/photo-1585747860036-4cb9b3c98a1b?q=80&w=400&auto=format&fit=crop",
    rating: 4.8,
    reviewCount: 324,
    specialties: ["Fade", "Pompadour", "Beard Trim"],
    openNow: true,
    lat: -6.2146,
    lng: 106.8451,
  },
  {
    id: 2,
    name: "The Gents Place",
    photo: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=400&auto=format&fit=crop",
    rating: 4.6,
    reviewCount: 189,
    specialties: ["Textured Crop", "Skin Fade"],
    openNow: true,
    lat: -6.2088,
    lng: 106.8456,
  },
  {
    id: 3,
    name: "Blade & Co.",
    photo: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?q=80&w=400&auto=format&fit=crop",
    rating: 4.9,
    reviewCount: 412,
    specialties: ["Classic Cut", "Hot Towel Shave"],
    openNow: false,
    lat: -6.2201,
    lng: 106.8513,
  },
  {
    id: 4,
    name: "Urban Cuts Studio",
    photo: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=400&auto=format&fit=crop",
    rating: 4.5,
    reviewCount: 156,
    specialties: ["Modern Styles", "Coloring"],
    openNow: true,
    lat: -6.2255,
    lng: 106.8398,
  },
  {
    id: 5,
    name: "Razor Sharp Barber",
    photo: "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?q=80&w=400&auto=format&fit=crop",
    rating: 4.7,
    reviewCount: 278,
    specialties: ["Line Up", "Taper Fade"],
    openNow: true,
    lat: -6.2178,
    lng: 106.8327,
  },
];

export function getGoogleMapsUrl(shop: Barbershop): string {
  return `https://www.google.com/maps/search/${encodeURIComponent(shop.name)}/@${shop.lat},${shop.lng},17z`;
}

export const SPONSORED_BARBERSHOP: Barbershop = {
  id: 99,
  name: "Jeeva Barbershop",
  photo: "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?q=80&w=800&auto=format&fit=crop",
  rating: 4.9,
  reviewCount: 587,
  specialties: ["Premium Fade", "Hair Coloring", "Scalp Treatment", "Beard Sculpt"],
  openNow: true,
  lat: -6.2120,
  lng: 106.8430,
};
