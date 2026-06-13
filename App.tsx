import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';

type Ingredient = {
  name: string;
  aliases: string[];
  severity: 'Low' | 'Medium' | 'High';
  reason: string;
  use: string;
  alternative: string;
};

type ProductResult = {
  name: string;
  brand: string;
  category: string;
  score: number;
  summary: string;
  barcode?: string;
  ingredients: Array<Ingredient & { matched: string }>;
};

type ProductCatalogEntry = {
  barcode?: string;
  name: string;
  brand: string;
  category: string;
  summary: string;
  aliases?: string[];
};

const ingredientDb: Ingredient[] = [
  {
    name: 'Fragrance / Parfum',
    aliases: ['fragrance', 'parfum', 'aroma'],
    severity: 'Medium',
    reason: 'A catch-all term that can hide multiple undisclosed fragrance chemicals and allergens.',
    use: 'Adds scent',
    alternative: 'Fragrance-free versions',
  },
  {
    name: 'Sodium Lauryl Sulfate',
    aliases: ['sls', 'sodium lauryl sulfate'],
    severity: 'Medium',
    reason: 'Can be irritating for sensitive skin and eyes, especially in leave-on products.',
    use: 'Foaming cleanser',
    alternative: 'Milder surfactants like coco-glucoside',
  },
  {
    name: 'Sodium Laureth Sulfate',
    aliases: ['sles', 'sodium laureth sulfate'],
    severity: 'Medium',
    reason: 'Common cleanser that may irritate very sensitive skin.',
    use: 'Foaming cleanser',
    alternative: 'Gentler surfactants',
  },
  {
    name: 'Parabens',
    aliases: ['methylparaben', 'propylparaben', 'butylparaben', 'ethylparaben', 'isobutylparaben'],
    severity: 'Medium',
    reason: 'Preservatives that some users prefer to avoid due to controversy around endocrine concerns.',
    use: 'Preservative',
    alternative: 'Alternative preservative systems',
  },
  {
    name: 'Formaldehyde releasers',
    aliases: ['dmdm hydantoin', 'quaternium-15', 'imidazolidinyl urea', 'diazolidinyl urea', 'bronopol', '2-bromo-2-nitropropane-1,3-diol'],
    severity: 'High',
    reason: 'Can release formaldehyde, which is a known irritant and sensitizer.',
    use: 'Preservative',
    alternative: 'Safer preservative options',
  },
  {
    name: 'Phthalates',
    aliases: ['diethyl phthalate', 'dep', 'dibutyl phthalate', 'dbp'],
    severity: 'High',
    reason: 'Often associated with fragrance formulations and frequently avoided for possible endocrine concerns.',
    use: 'Fragrance solvent',
    alternative: 'Phthalate-free fragrance',
  },
  {
    name: 'PFAS',
    aliases: ['pfas', 'ptfe', 'polyfluoroalkyl'],
    severity: 'High',
    reason: 'Persistent chemicals that are widely criticized for environmental concerns.',
    use: 'Water-resistant coating',
    alternative: 'PFAS-free products',
  },
  {
    name: 'Bleach',
    aliases: ['sodium hypochlorite', 'bleach'],
    severity: 'High',
    reason: 'Strong oxidizer that can irritate skin, lungs, and eyes.',
    use: 'Disinfectant',
    alternative: 'Non-chlorine cleaners',
  },
  {
    name: 'Ammonia',
    aliases: ['ammonium hydroxide', 'ammonia'],
    severity: 'High',
    reason: 'Can be harsh on airways and eyes, especially in enclosed spaces.',
    use: 'Cleaner',
    alternative: 'Low-odor cleaners',
  },
  {
    name: 'Triclosan',
    aliases: ['triclosan'],
    severity: 'High',
    reason: 'Antibacterial agent banned in many soap products by the FDA due to concerns about resistance and endocrine disruption.',
    use: 'Antibacterial',
    alternative: 'Plain soap and water',
  },
  {
    name: 'Oxybenzone',
    aliases: ['oxybenzone', 'benzophenone-3'],
    severity: 'Medium',
    reason: 'UV filter linked to hormone disruption and coral reef damage. Banned in some regions.',
    use: 'Sunscreen UV filter',
    alternative: 'Mineral sunscreens (zinc oxide, titanium dioxide)',
  },
  {
    name: 'Mineral Oil',
    aliases: ['mineral oil', 'paraffinum liquidum', 'petrolatum', 'petroleum jelly'],
    severity: 'Low',
    reason: 'Occlusive petroleum derivative. Generally safe but some prefer plant-based alternatives.',
    use: 'Emollient / moisture barrier',
    alternative: 'Plant oils (jojoba, squalane)',
  },
  {
    name: 'Talc',
    aliases: ['talc', 'talcum'],
    severity: 'Medium',
    reason: 'Historically controversial due to potential asbestos contamination in some sources.',
    use: 'Absorbent / texture',
    alternative: 'Cornstarch or arrowroot powder',
  },
  {
    name: 'DEA / TEA / MEA',
    aliases: ['diethanolamine', 'triethanolamine', 'monoethanolamine', 'cocamide dea', 'lauramide dea', 'cocamide mea'],
    severity: 'Medium',
    reason: 'Ethanolamines can react with other ingredients to form nitrosamines, which are potential carcinogens.',
    use: 'pH adjuster / emulsifier',
    alternative: 'Products without ethanolamines',
  },
  {
    name: 'BHT / BHA',
    aliases: ['butylated hydroxytoluene', 'butylated hydroxyanisole', 'bht', 'bha'],
    severity: 'Low',
    reason: 'Synthetic antioxidant preservatives with some controversy around long-term exposure.',
    use: 'Antioxidant preservative',
    alternative: 'Vitamin E (tocopherol)',
  },
  {
    name: 'Coal Tar Dyes',
    aliases: ['ci 77499', 'fd&c', 'fd and c', 'd&c', 'coal tar', 'p-phenylenediamine'],
    severity: 'Medium',
    reason: 'Derived from petroleum, some coal tar dyes are recognized as potential carcinogens.',
    use: 'Colorant',
    alternative: 'Natural pigments and dyes',
  },
  {
    name: 'Hydroquinone',
    aliases: ['hydroquinone'],
    severity: 'High',
    reason: 'Skin-lightening agent banned in several countries due to links to ochronosis and potential carcinogenicity.',
    use: 'Skin lightener',
    alternative: 'Vitamin C, niacinamide, arbutin',
  },
  {
    name: 'Toluene',
    aliases: ['toluene', 'methylbenzene'],
    severity: 'High',
    reason: 'Volatile solvent found in nail products that can cause headaches, dizziness, and is toxic to the nervous system.',
    use: 'Solvent in nail polish',
    alternative: 'Toluene-free nail polishes',
  },
  {
    name: 'Phenoxyethanol',
    aliases: ['phenoxyethanol'],
    severity: 'Low',
    reason: 'Common preservative generally considered safe at low concentrations, but can cause irritation in some individuals.',
    use: 'Preservative',
    alternative: 'Products with lower concentration or alternative preservatives',
  },
  {
    name: 'Benzalkonium Chloride',
    aliases: ['benzalkonium chloride', 'bac'],
    severity: 'Medium',
    reason: 'Disinfectant/preservative that can be irritating to skin and eyes, and may contribute to antimicrobial resistance.',
    use: 'Disinfectant / preservative',
    alternative: 'Gentler preservative systems',
  },
];

const seedHistory: ProductResult[] = [
  {
    name: 'Daily Glow Face Cream',
    brand: 'Northline',
    category: 'Skincare',
    score: 7,
    summary: 'Mostly low concern, but fragrance and parabens reduce the score.',
    ingredients: [
      { ...ingredientDb[0], matched: 'Fragrance' },
      { ...ingredientDb[3], matched: 'Methylparaben' },
    ],
  },
];

const productCatalog: ProductCatalogEntry[] = [
  // --- Real-world beauty products ---
  {
    barcode: '3337875725828',
    name: 'Micellar Cleansing Water',
    brand: 'La Roche-Posay',
    category: 'Skincare',
    summary: 'Popular micellar water. Scan the ingredient label for a deeper review.',
    aliases: ['micellar water', 'cleansing water'],
  },
  {
    barcode: '3606000787881',
    name: 'Micellar Cleansing Water',
    brand: 'Garnier',
    category: 'Skincare',
    summary: 'Garnier micellar water recognized. Scan the label for surfactant and fragrance details.',
    aliases: ['micellar water', 'cleansing water', 'garnier'],
  },
  {
    barcode: '3614225234804',
    name: 'Hydrating Facial Cleanser',
    brand: 'CeraVe',
    category: 'Skincare',
    summary: 'CeraVe cleanser detected. Generally well-rated. Scan label for full ingredient check.',
    aliases: ['cerave', 'facial cleanser', 'hydrating cleanser'],
  },
  {
    barcode: '0011111028005',
    name: 'Moisturizing Cream',
    brand: 'CeraVe',
    category: 'Skincare',
    summary: 'CeraVe moisturizer detected. Dermatologist-recommended. Scan label for full details.',
    aliases: ['cerave', 'moisturizing cream'],
  },
  {
    barcode: '0079400460837',
    name: 'Beauty Bar',
    brand: 'Dove',
    category: 'Body Care',
    summary: 'Dove Beauty Bar. Mild cleanser. Scan label for fragrance and surfactant details.',
    aliases: ['dove', 'beauty bar', 'soap bar'],
  },
  {
    barcode: '4005808220830',
    name: 'Soft Moisturising Cream',
    brand: 'NIVEA',
    category: 'Skincare',
    summary: 'Classic NIVEA cream recognized. Scan label for mineral oil and fragrance content.',
    aliases: ['nivea', 'nivea cream', 'moisturising cream'],
  },
  {
    barcode: '5410091728830',
    name: 'Total Care Toothpaste',
    brand: 'Colgate',
    category: 'Oral Care',
    summary: 'Colgate toothpaste found. Scan label for fluoride, SLS, and flavoring details.',
    aliases: ['colgate', 'toothpaste', 'total care'],
  },
  {
    barcode: '8001090443298',
    name: 'Anti-Dandruff Shampoo Classic',
    brand: 'Head & Shoulders',
    category: 'Haircare',
    summary: 'Head & Shoulders recognized. Contains zinc pyrithione. Scan label for full list.',
    aliases: ['head and shoulders', 'anti dandruff', 'shampoo'],
  },
  {
    barcode: '0080878042197',
    name: 'Original Body Wash',
    brand: 'Dove',
    category: 'Body Care',
    summary: 'Dove body wash found. Scan label for fragrance and surfactant breakdown.',
    aliases: ['dove', 'body wash', 'shower gel'],
  },
  {
    barcode: '5000101155796',
    name: 'Silk Smooth Shampoo',
    brand: 'TRESemmé',
    category: 'Haircare',
    summary: 'TRESemmé shampoo detected. Scan the label for sulfates and silicones.',
    aliases: ['tresemme', 'shampoo', 'silk smooth'],
  },
  {
    barcode: '5000328630618',
    name: 'Advanced Protection Deodorant',
    brand: 'Dove',
    category: 'Body Care',
    summary: 'Dove deodorant detected. Scan label for aluminum compounds and fragrance.',
    aliases: ['dove', 'deodorant', 'antiperspirant'],
  },
  // --- Real-world household products ---
  {
    barcode: '5000204903966',
    name: 'Original Washing Up Liquid',
    brand: 'Fairy',
    category: 'Household',
    summary: 'Fairy dish soap recognized. Scan label for surfactants and fragrance content.',
    aliases: ['fairy', 'washing up liquid', 'dish soap'],
  },
  {
    barcode: '5011417559291',
    name: 'Antibacterial Surface Cleanser',
    brand: 'Dettol',
    category: 'Household',
    summary: 'Dettol surface cleaner found. Scan label for benzalkonium chloride and fragrance.',
    aliases: ['dettol', 'surface cleaner', 'antibacterial'],
  },
  {
    barcode: '5000146063933',
    name: 'All-Purpose Cleaner',
    brand: 'Flash',
    category: 'Household',
    summary: 'Flash cleaner recognized. Scan label for surfactants and chemical actives.',
    aliases: ['flash', 'all purpose cleaner', 'multi surface'],
  },
  {
    barcode: '0817939011676',
    name: 'All-Purpose Natural Surface Cleaner',
    brand: 'Method',
    category: 'Household',
    summary: 'Method cleaner found. Marketed as eco-friendly. Scan for full ingredient verification.',
    aliases: ['method', 'surface cleaner', 'natural cleaner'],
  },
  {
    barcode: '5010045003803',
    name: 'Non-Bio Laundry Detergent',
    brand: 'Persil',
    category: 'Household',
    summary: 'Persil detergent found. Scan label for surfactant and optical brightener details.',
    aliases: ['persil', 'laundry detergent', 'non bio'],
  },
  {
    barcode: '5413149595880',
    name: 'Bleach Thick',
    brand: 'Domestos',
    category: 'Household',
    summary: 'Domestos bleach detected. Contains sodium hypochlorite. Handle with care.',
    aliases: ['domestos', 'bleach', 'toilet cleaner'],
  },
  // --- Fallback generic entries ---
  {
    barcode: '3606000537447',
    name: 'Beauty Facial Cleanser',
    brand: 'Garnier',
    category: 'Skincare',
    summary: 'Common cleanser found. Use the label scan for ingredient details.',
    aliases: ['facial cleanser', 'face wash'],
  },
  {
    barcode: '037000123456',
    name: 'Ultra Dish Soap',
    brand: 'ShineDish',
    category: 'Household',
    summary: 'Dish soap detected. Scan the ingredient label for surfactants and fragrance.',
    aliases: ['dish soap', 'dishwashing liquid'],
  },
  {
    barcode: '381370036123',
    name: 'Daily Shampoo',
    brand: 'SoftRoot',
    category: 'Haircare',
    summary: 'Shampoo found. Ingredient scan will catch sulfates, fragrance, and preservatives.',
    aliases: ['shampoo'],
  },
  {
    barcode: '075650001234',
    name: 'Body Wash',
    brand: 'GlowBar',
    category: 'Body Care',
    summary: 'Body wash found. Label scan recommended for fragrance and surfactants.',
    aliases: ['body wash', 'shower gel'],
  },
  {
    barcode: '086800000123',
    name: 'Facial Moisturizer',
    brand: 'DailyDerm',
    category: 'Skincare',
    summary: 'Moisturizer found. Scan ingredients for fragrance, preservatives, and oils.',
    aliases: ['moisturizer', 'face cream', 'face moisturizer'],
  },
];

function normalize(input: string) {
  return input.toLowerCase().replace(/[\s\-_()/]+/g, ' ').trim();
}

function findCatalogMatch(query: string) {
  const normalized = normalize(query);
  return productCatalog.find((item) => {
    const barcodeMatch = item.barcode === query;
    const aliasMatch = item.aliases?.some((alias) => normalized.includes(normalize(alias)));
    const nameMatch =
      normalized.includes(normalize(item.name)) || normalized.includes(normalize(item.brand));
    return barcodeMatch || Boolean(aliasMatch) || nameMatch;
  });
}

function analyzeText(input: string): ProductResult {
  const cleaned = normalize(input);
  const matched = ingredientDb
    .filter((ingredient) =>
      ingredient.aliases.some((alias) => cleaned.includes(normalize(alias))),
    )
    .map((ingredient) => ({
      ...ingredient,
      matched: ingredient.aliases.find((alias) => cleaned.includes(normalize(alias))) ?? ingredient.name,
    }));

  const base = 10;
  const penalty = matched.reduce((sum, item) => {
    if (item.severity === 'High') return sum + 3;
    if (item.severity === 'Medium') return sum + 2;
    return sum + 1;
  }, 0);

  const score = Math.max(1, Math.min(10, base - penalty + (matched.length ? 0 : 1)));

  return {
    name: 'Scanned Product',
    brand: 'Unknown brand',
    category: 'Personal care / household',
    score,
    summary:
      matched.length > 0
        ? 'We found ingredient concerns worth reviewing.'
        : 'No major concern keywords were matched in the text you entered.',
    ingredients: matched,
  };
}

function analyzeBarcode(barcode: string): ProductResult {
  const known = findCatalogMatch(barcode);
  if (known) {
    return {
      name: known.name,
      brand: known.brand,
      category: known.category,
      score: known.category === 'Household' ? 6 : 8,
      summary: known.summary,
      barcode,
      ingredients: [],
    };
  }

  return {
    name: 'Unknown barcode',
    brand: 'Not in local catalog',
    category: 'Beauty / household',
    score: 6,
    summary:
      'Barcode scanned successfully, but this product is not in the offline catalog. Looking up online...',
    barcode,
    ingredients: [],
  };
}

async function lookupBarcodeOnline(barcode: string): Promise<ProductResult | null> {
  try {
    // Try Open Food Facts first (covers food, beauty, household products)
    const urls = [
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`,
      `https://world.openbeautyfacts.org/api/v2/product/${barcode}.json`,
    ];
    for (const url of urls) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!response.ok) continue;
        const json = await response.json();
        if (json.status === 1 && json.product) {
          const p = json.product;
          const name = p.product_name || p.product_name_en || 'Unknown product';
          const brand = p.brands || 'Unknown brand';
          const categories = p.categories || p.categories_tags?.join(', ') || 'General';
          const ingredientsText = p.ingredients_text || p.ingredients_text_en || '';

          // If we have ingredients text, analyze it
          if (ingredientsText) {
            const analysis = analyzeText(ingredientsText);
            return {
              ...analysis,
              name,
              brand,
              category: categories.split(',')[0].trim(),
              barcode,
              summary: `Product found online: ${name} by ${brand}. Ingredients analyzed automatically.`,
            };
          }

          return {
            name,
            brand,
            category: categories.split(',')[0].trim(),
            score: 7,
            summary: `Product found online: ${name} by ${brand}. No ingredient list available online — scan the label for a full analysis.`,
            barcode,
            ingredients: [],
          };
        }
      } catch {
        // Try next URL
      }
    }
  } catch {
    // Network error — return null to indicate lookup failed
  }
  return null;
}

function productSearchHint(query: string) {
  const match = findCatalogMatch(query);
  if (match) {
    return match;
  }
  return null;
}

function scoreTone(score: number) {
  if (score >= 8) return { label: 'Green', color: '#1f7a3f', bg: '#e7f6ec' };
  if (score >= 5) return { label: 'Yellow', color: '#997100', bg: '#fff6d9' };
  return { label: 'Red', color: '#b42318', bg: '#ffe5e3' };
}

function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanMode, setScanMode] = useState<'home' | 'camera' | 'text'>('home');
  const [cameraHint, setCameraHint] = useState('Point at a barcode or ingredient label.');
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState(
    'Water, Glycerin, Fragrance, Methylparaben, Citric Acid, Sodium Laureth Sulfate',
  );
  const [history, setHistory] = useState<ProductResult[]>(seedHistory);
  const [result, setResult] = useState<ProductResult | null>(null);
  const lastBarcodeRef = useRef<string | null>(null);

  const badge = useMemo(() => (result ? scoreTone(result.score) : scoreTone(7)), [result]);

  const saveResult = useCallback((next: ProductResult) => {
    setResult(next);
    setHistory((prev) => [next, ...prev]);
  }, []);

  const runScan = () => {
    const next = analyzeText(input);
    const suggested = productSearchHint(input);
    saveResult(
      suggested
        ? {
            ...next,
            name: suggested.name,
            brand: suggested.brand,
            category: suggested.category,
            summary: suggested.summary,
          }
        : next,
    );
    setScanMode('home');
  };

  const handleBarcodeScanned = useCallback(({ data }: { data: string }) => {
    if (!data || lastBarcodeRef.current === data) return;
    lastBarcodeRef.current = data;
    setLastScan(data);
    const localResult = analyzeBarcode(data);
    saveResult(localResult);

    if (localResult.name === 'Unknown barcode') {
      setCameraHint(`Barcode ${data} found. Searching online...`);
      setLoading(true);
      lookupBarcodeOnline(data).then((onlineResult) => {
        setLoading(false);
        if (onlineResult) {
          saveResult(onlineResult);
          setCameraHint(`Found: ${onlineResult.name} by ${onlineResult.brand}`);
        } else {
          setCameraHint(`Barcode ${data} not found online. Scan the ingredient label instead.`);
        }
      });
    } else {
      setCameraHint(`Found: ${localResult.name} by ${localResult.brand}`);
    }
  }, [saveResult]);

  const openCamera = async () => {
    if (!permission?.granted) {
      const response = await requestPermission();
      if (!response.granted) {
        Alert.alert('Camera permission needed', 'Allow camera access to scan barcodes and labels.');
        return;
      }
    }
    lastBarcodeRef.current = null;
    setCameraHint('Point at a barcode or ingredient label.');
    setScanMode('camera');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.shell}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>CleanCheck</Text>
            <Text style={styles.subtitle}>Scan products for ingredient concerns in seconds.</Text>
          </View>
          <View style={[styles.scorePill, { backgroundColor: badge.bg }]}>
            <Text style={[styles.scorePillText, { color: badge.color }]}>
              {result ? `${result.score}/10` : 'Ready'}
            </Text>
          </View>
        </View>

        {scanMode === 'home' && (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Pressable style={styles.primaryButton} onPress={openCamera}>
              <Ionicons name="camera" size={22} color="#fff" />
              <Text style={styles.primaryButtonText}>Scan Barcode or Label</Text>
            </Pressable>

            <Pressable style={styles.secondaryButton} onPress={() => setScanMode('text')}>
              <Ionicons name="create-outline" size={20} color="#1e293b" />
              <Text style={styles.secondaryButtonText}>Paste Ingredient Text</Text>
            </Pressable>

            <View style={styles.panel}>
              <Text style={styles.panelTitle}>How it works</Text>
              <Text style={styles.panelText}>
                1. Scan a barcode. 2. If nothing appears, scan the label. 3. We flag questionable
                ingredients and score the product from 1 to 10.
              </Text>
            </View>

            {result && (
              <View style={styles.panel}>
                <Text style={styles.panelTitle}>Latest Result</Text>
                <Text style={styles.resultName}>{result.brand}</Text>
                <Text style={styles.resultProduct}>{result.name}</Text>
                <Text style={styles.resultMeta}>{result.category}</Text>
            <View style={[styles.resultBadge, { backgroundColor: badge.bg }]}>
                  <Text style={{ color: badge.color, fontWeight: '800' }}>
                    {badge.label} rating: {result.score}/10
                  </Text>
                </View>
                {result.barcode ? (
                  <Text style={styles.resultMeta}>Barcode: {result.barcode}</Text>
                ) : null}
                <Text style={styles.panelText}>{result.summary}</Text>
                {!result.ingredients.length ? (
                  <Text style={styles.disclaimer}>
                    This product came from the local catalog. For full ingredient scoring, scan the
                    ingredient label after the barcode result.
                  </Text>
                ) : null}
                {result.ingredients.map((item) => (
                  <View key={`${item.name}-${item.matched}`} style={styles.ingredientCard}>
                    <Text style={styles.ingredientName}>{item.name}</Text>
                    <Text style={styles.ingredientLine}>Matched: {item.matched}</Text>
                    <Text style={styles.ingredientLine}>Severity: {item.severity}</Text>
                    <Text style={styles.ingredientLine}>Why it matters: {item.reason}</Text>
                    <Text style={styles.ingredientLine}>Common use: {item.use}</Text>
                    <Text style={styles.ingredientLine}>Safer alternative: {item.alternative}</Text>
                  </View>
                ))}
                <Text style={styles.disclaimer}>
                  Informational only. Not medical advice. If you have allergies, pregnancy concerns,
                  asthma, skin conditions, or chemical sensitivity, consult a qualified professional.
                </Text>
              </View>
            )}

            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Recent Scans</Text>
              {history.slice(0, 3).map((item, index) => (
                <View key={`${item.name}-${index}`} style={styles.historyRow}>
                  <Text style={styles.historyName}>{item.name}</Text>
                  <Text style={styles.historyScore}>{item.score}/10</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        )}

        {scanMode === 'text' && (
          <View style={styles.content}>
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Paste Ingredients</Text>
              <Text style={styles.panelText}>
                Paste the label text here. You can edit OCR mistakes before analysis.
              </Text>
              <TextInput
                multiline
                value={input}
                onChangeText={setInput}
                style={styles.input}
                placeholder="Water, Glycerin, Fragrance..."
                placeholderTextColor="#94a3b8"
              />
              <Pressable style={styles.primaryButton} onPress={runScan}>
                <Ionicons name="analytics" size={20} color="#fff" />
                <Text style={styles.primaryButtonText}>Analyze Ingredients</Text>
              </Pressable>
              <Pressable style={styles.linkButton} onPress={() => setScanMode('home')}>
                <Text style={styles.linkButtonText}>Back</Text>
              </Pressable>
            </View>
          </View>
        )}

        {scanMode === 'camera' && (
          <View style={styles.cameraWrap}>
            <CameraView
              style={styles.camera}
              facing="back"
              onBarcodeScanned={handleBarcodeScanned}
              barcodeScannerSettings={{
                barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'itf14'],
              }}
            />
            <View style={styles.cameraOverlay}>
              <Text style={styles.cameraText}>{cameraHint}</Text>
              {loading ? <ActivityIndicator size="small" color="#fff" style={{ marginVertical: 4 }} /> : null}
              {lastScan ? <Text style={styles.cameraCode}>Last code: {lastScan}</Text> : null}
              <Pressable
                style={styles.primaryButton}
                onPress={() => {
                  const next = analyzeText(input);
                  saveResult(next);
                }}
              >
                <Ionicons name="document-text-outline" size={20} color="#fff" />
                <Text style={styles.primaryButtonText}>Analyze Label Text</Text>
              </Pressable>
              <Pressable style={styles.secondaryButton} onPress={() => setScanMode('home')}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f6f7fb' },
  shell: { flex: 1, padding: 16, gap: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: { fontSize: 34, fontWeight: '900', color: '#0f172a' },
  subtitle: { marginTop: 4, fontSize: 14, color: '#475569', maxWidth: 260 },
  scorePill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  scorePillText: { fontWeight: '800' },
  content: { gap: 14, paddingBottom: 24 },
  primaryButton: {
    backgroundColor: '#0f172a',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  secondaryButton: {
    backgroundColor: '#e2e8f0',
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  secondaryButtonText: { color: '#0f172a', fontSize: 16, fontWeight: '700' },
  panel: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  panelTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  panelText: { color: '#334155', lineHeight: 20 },
  resultName: { fontSize: 13, color: '#64748b', textTransform: 'uppercase', fontWeight: '800' },
  resultProduct: { fontSize: 22, fontWeight: '900', color: '#0f172a' },
  resultMeta: { color: '#475569' },
  resultBadge: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, alignSelf: 'flex-start' },
  ingredientCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  ingredientName: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  ingredientLine: { color: '#334155', fontSize: 13, lineHeight: 18 },
  disclaimer: { color: '#64748b', fontSize: 12, lineHeight: 18 },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  historyName: { color: '#0f172a', fontWeight: '700' },
  historyScore: { color: '#475569', fontWeight: '800' },
  input: {
    minHeight: 160,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
    padding: 12,
    textAlignVertical: 'top',
    color: '#0f172a',
  },
  linkButton: { alignItems: 'center', paddingVertical: 8 },
  linkButtonText: { color: '#0f172a', fontWeight: '800' },
  cameraWrap: { flex: 1, borderRadius: 24, overflow: 'hidden' },
  camera: { flex: 1 },
  cameraOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    gap: 10,
    backgroundColor: 'rgba(15,23,42,0.8)',
  },
  cameraText: { color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  cameraCode: { color: '#cbd5e1', fontSize: 13, textAlign: 'center' },
});

export default App;
