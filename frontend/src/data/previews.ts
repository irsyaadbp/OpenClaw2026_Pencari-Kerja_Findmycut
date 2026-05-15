export interface PreviewStyle {
  id: number;
  style: string;
  url: string;
  angles: {
    left: string;
    right: string;
    back: string;
  };
  confidence: number;
  sides: string;
  top: string;
  finish: string;
  maintenance: string;
}

export const PREVIEWS: PreviewStyle[] = [
  {
    id: 1,
    style: "Textured Crop",
    url: "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?q=80&w=400&auto=format&fit=crop",
    angles: {
      left: "https://images.unsplash.com/photo-1595152772835-219674b2a8a6?q=80&w=400&auto=format&fit=crop",
      right: "https://images.unsplash.com/photo-1605497788044-5a32c7078486?q=80&w=400&auto=format&fit=crop",
      back: "https://images.unsplash.com/photo-1600948836101-f9ffda59d250?q=80&w=400&auto=format&fit=crop",
    },
    confidence: 94,
    sides: "Gradasi #1.5 membaur ke #3",
    top: "Sisakan 6-7 cm, tambahkan tekstur",
    finish: "Natural, hindari garis patah yang keras",
    maintenance: "Gunakan matte clay untuk tekstur. Keringkan ke atas. Rapikan setiap 4-5 minggu.",
  },
  {
    id: 2,
    style: "Mid Fade Pompadour",
    url: "https://images.unsplash.com/photo-1593702275687-f8b402bf1fb5?q=80&w=400&auto=format&fit=crop",
    angles: {
      left: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=400&auto=format&fit=crop",
      right: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400&auto=format&fit=crop",
      back: "https://images.unsplash.com/photo-1480429370139-e01abe1c84d6?q=80&w=400&auto=format&fit=crop",
    },
    confidence: 88,
    sides: "Gradasi mid skin fade",
    top: "Sisakan 10-12 cm, biarkan panjang di bagian depan",
    finish: "Klimis ke belakang dengan volume",
    maintenance: "Gunakan pomade untuk kilau. Keringkan dengan sisir bulat. Rapikan setiap 3 minggu.",
  },
  {
    id: 3,
    style: "Messy Fringe",
    url: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?q=80&w=400&auto=format&fit=crop",
    angles: {
      left: "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?q=80&w=400&auto=format&fit=crop",
      right: "https://images.unsplash.com/photo-1595152772835-219674b2a8a6?q=80&w=400&auto=format&fit=crop",
      back: "https://images.unsplash.com/photo-1605497788044-5a32c7078486?q=80&w=400&auto=format&fit=crop",
    },
    confidence: 85,
    sides: "Gradasi low taper fade",
    top: "Sisakan 7-9 cm, kurangi ketebalan (point cutting)",
    finish: "Bertekstur dan disisir menyapu ke depan",
    maintenance: "Gunakan sea salt spray untuk volume. Biarkan kering alami. Rapikan setiap 5-6 minggu.",
  },
  {
    id: 4,
    style: "Buzz Cut",
    url: "https://images.unsplash.com/photo-1517832606299-7ae9b620a186?q=80&w=400&auto=format&fit=crop",
    angles: {
      left: "https://images.unsplash.com/photo-1600948836101-f9ffda59d250?q=80&w=400&auto=format&fit=crop",
      right: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=400&auto=format&fit=crop",
      back: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400&auto=format&fit=crop",
    },
    confidence: 78,
    sides: "Rata ukuran sepatu #1",
    top: "Ukuran sepatu #2, rapikan garis tepi",
    finish: "Garis tepi tajam, panjang seragam",
    maintenance: "Tidak perlu styling. Cukur ulang setiap 2 minggu.",
  },
  {
    id: 5,
    style: "Slick Back",
    url: "https://images.unsplash.com/photo-1605497788044-5a32c7078486?q=80&w=400&auto=format&fit=crop",
    angles: {
      left: "https://images.unsplash.com/photo-1480429370139-e01abe1c84d6?q=80&w=400&auto=format&fit=crop",
      right: "https://images.unsplash.com/photo-1593702275687-f8b402bf1fb5?q=80&w=400&auto=format&fit=crop",
      back: "https://images.unsplash.com/photo-1582230200318-12c8b8686e08?q=80&w=400&auto=format&fit=crop",
    },
    confidence: 75,
    sides: "Taper fade",
    top: "Sisakan 12-15 cm",
    finish: "Klimis lurus ke belakang",
    maintenance: "Gunakan pomade daya rekat tinggi. Sisir ke belakang saat basah. Rapikan setiap 4 minggu.",
  },
  {
    id: 6,
    style: "French Crop",
    url: "https://images.unsplash.com/photo-1600948836101-f9ffda59d250?q=80&w=400&auto=format&fit=crop",
    angles: {
      left: "https://images.unsplash.com/photo-1517832606299-7ae9b620a186?q=80&w=400&auto=format&fit=crop",
      right: "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?q=80&w=400&auto=format&fit=crop",
      back: "https://images.unsplash.com/photo-1595152772835-219674b2a8a6?q=80&w=400&auto=format&fit=crop",
    },
    confidence: 70,
    sides: "High skin fade",
    top: "Sisakan 4-5 cm, poni rata (blunt fringe)",
    finish: "Garis poni rata yang presisi di dahi",
    maintenance: "Gunakan texturizing powder. Dorong rambut ke depan. Rapikan setiap 3 minggu.",
  },
];

export function findPreviewById(id: number): PreviewStyle {
  return PREVIEWS.find((p) => p.id === id) || PREVIEWS[0];
}
