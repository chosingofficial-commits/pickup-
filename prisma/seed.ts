/**
 * Demonstration seed data focused on Khagrachari Sadar town.
 * Every place name, boundary, delivery fee, and price below is example data
 * for development/demo only — an administrator must verify and replace it
 * before a real launch (see README "Seed data").
 */
import "dotenv/config";
import { PrismaClient, type Prisma } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

const DEMO_PASSWORD = "Password123!";

async function hash(password: string) {
  return bcrypt.hash(password, 10);
}

function square(center: { lat: number; lng: number }, halfWidthDeg = 0.0035) {
  const { lat, lng } = center;
  return [
    { lat: lat + halfWidthDeg, lng: lng - halfWidthDeg },
    { lat: lat + halfWidthDeg, lng: lng + halfWidthDeg },
    { lat: lat - halfWidthDeg, lng: lng + halfWidthDeg },
    { lat: lat - halfWidthDeg, lng: lng - halfWidthDeg },
  ];
}

async function main() {
  console.log("Seeding Pick Up demo data...");

  // ---------------------------------------------------------------------
  // Locations — Division -> District (zila) -> Town -> Neighbourhood
  // (no Upazila — the business only ever operates by zila and town; see
  // PLAN-remove-upazila for why that level was dropped)
  // ---------------------------------------------------------------------
  const division = await db.division.upsert({
    where: { slug: "chattogram" },
    create: { name: "Chattogram", nameBn: "চট্টগ্রাম", slug: "chattogram" },
    update: {},
  });

  const district = await db.district.upsert({
    where: { divisionId_slug: { divisionId: division.id, slug: "khagrachari" } },
    create: { divisionId: division.id, name: "Khagrachari", nameBn: "খাগড়াছড়ি", slug: "khagrachari" },
    update: {},
  });

  const town = await db.town.upsert({
    where: { districtId_slug: { districtId: district.id, slug: "khagrachari-sadar-town" } },
    create: { districtId: district.id, name: "Khagrachari Sadar", nameBn: "খাগড়াছড়ি সদর", slug: "khagrachari-sadar-town" },
    update: {},
  });

  const existingServiceArea = await db.serviceArea.findFirst({ where: { townId: town.id } });
  const serviceArea =
    existingServiceArea ??
    (await db.serviceArea.create({
      data: {
        townId: town.id,
        name: "Khagrachari Sadar",
        nameBn: "খাগড়াছড়ি সদর",
        isActive: true,
        launchedAt: new Date(),
        description: "Pick Up's first active service area.",
      },
    }));

  const neighbourhoodDefs = [
    { slug: "khagrachari-town-centre", name: "Khagrachari Town Centre", nameBn: "খাগড়াছড়ি টাউন সেন্টার", center: { lat: 23.1206, lng: 91.9853 }, fee: 25, min: 15, max: 25 },
    { slug: "shapla-chattar", name: "Shapla Chattar", nameBn: "শাপলা চত্বর", center: { lat: 23.118, lng: 91.987 }, fee: 30, min: 20, max: 30 },
    { slug: "mahajan-para", name: "Mahajan Para", nameBn: "মহাজন পাড়া", center: { lat: 23.123, lng: 91.982 }, fee: 30, min: 20, max: 32 },
    { slug: "madhupur", name: "Madhupur", nameBn: "মধুপুর", center: { lat: 23.11, lng: 91.99 }, fee: 35, min: 25, max: 40 },
    { slug: "perachhara", name: "Perachhara", nameBn: "পেরাছড়া", center: { lat: 23.13, lng: 91.978 }, fee: 40, min: 25, max: 40 },
  ];

  const neighbourhoods: Record<string, { id: string; name: string; townName: string }> = {};

  for (const def of neighbourhoodDefs) {
    const n = await db.neighbourhood.upsert({
      where: { townId_slug: { townId: town.id, slug: def.slug } },
      create: {
        townId: town.id,
        name: def.name,
        nameBn: def.nameBn,
        slug: def.slug,
        centerLat: def.center.lat,
        centerLng: def.center.lng,
      },
      update: { centerLat: def.center.lat, centerLng: def.center.lng },
    });
    neighbourhoods[def.slug] = { id: n.id, name: n.name, townName: town.name };

    const existingZone = await db.deliveryZone.findFirst({ where: { neighbourhoodId: n.id } });
    const zone = existingZone
      ? await db.deliveryZone.update({
          where: { id: existingZone.id },
          data: { deliveryFee: def.fee, estimatedMinutesMin: def.min, estimatedMinutesMax: def.max, isActive: true },
        })
      : await db.deliveryZone.create({
          data: {
            serviceAreaId: serviceArea.id,
            neighbourhoodId: n.id,
            name: def.name,
            nameBn: def.nameBn,
            isActive: true,
            deliveryFee: def.fee,
            freeDeliveryThreshold: 500,
            estimatedMinutesMin: def.min,
            estimatedMinutesMax: def.max,
          },
        });

    await db.deliveryZoneBoundaryPoint.deleteMany({ where: { deliveryZoneId: zone.id } });
    const points = square(def.center);
    await db.deliveryZoneBoundaryPoint.createMany({
      data: points.map((p, i) => ({ deliveryZoneId: zone.id, sequence: i, lat: p.lat, lng: p.lng })),
    });
  }

  // Example geographic exclusion zone (school) for the tobacco module —
  // inactive feature, but the exclusion-zone data model is demonstrated here.
  const townCentre = neighbourhoodDefs[0]!.center;
  const existingExclusion = await db.geographicExclusionZone.findFirst({ where: { name: "Khagrachari Govt. High School (demo)" } });
  if (!existingExclusion) {
    await db.geographicExclusionZone.create({
      data: {
        name: "Khagrachari Govt. High School (demo)",
        category: "SCHOOL",
        centerLat: townCentre.lat + 0.001,
        centerLng: townCentre.lng + 0.001,
        radiusMeters: 100,
        appliesToTobacco: true,
        isActive: true,
      },
    });
  }

  // ---------------------------------------------------------------------
  // Categories
  // ---------------------------------------------------------------------
  async function upsertCategory(data: {
    slug: string;
    name: string;
    nameBn?: string;
    parentSlug?: string;
    isAgeRestricted?: boolean;
    isActive?: boolean;
    icon?: string;
    sortOrder?: number;
  }) {
    const parent = data.parentSlug ? await db.category.findUnique({ where: { slug: data.parentSlug } }) : null;
    return db.category.upsert({
      where: { slug: data.slug },
      create: {
        slug: data.slug,
        name: data.name,
        nameBn: data.nameBn,
        parentId: parent?.id,
        isAgeRestricted: data.isAgeRestricted ?? false,
        isActive: data.isActive ?? true,
        icon: data.icon,
        sortOrder: data.sortOrder ?? 0,
      },
      update: { parentId: parent?.id },
    });
  }

  await upsertCategory({ slug: "groceries", name: "Groceries", nameBn: "মুদি পণ্য", icon: "ShoppingBasket", sortOrder: 1 });
  await upsertCategory({ slug: "rice-grains", name: "Rice & Grains", nameBn: "চাল ও শস্য", parentSlug: "groceries" });
  await upsertCategory({ slug: "vegetables", name: "Vegetables", nameBn: "সবজি", parentSlug: "groceries" });
  await upsertCategory({ slug: "fruits", name: "Fruits", nameBn: "ফল", parentSlug: "groceries" });
  await upsertCategory({ slug: "dairy-eggs", name: "Dairy & Eggs", nameBn: "দুধ ও ডিম", parentSlug: "groceries" });
  await upsertCategory({ slug: "meat-fish", name: "Meat & Fish", nameBn: "মাছ ও মাংস", parentSlug: "groceries" });
  await upsertCategory({ slug: "cooking-oil-spices", name: "Cooking Oil & Spices", nameBn: "তেল ও মসলা", parentSlug: "groceries" });
  await upsertCategory({ slug: "beverages", name: "Beverages", nameBn: "পানীয়", parentSlug: "groceries" });
  await upsertCategory({ slug: "snacks", name: "Snacks", nameBn: "নাস্তা", parentSlug: "groceries" });

  await upsertCategory({ slug: "everyday-essentials", name: "Everyday Essentials", nameBn: "নিত্যপ্রয়োজনীয় পণ্য", icon: "Package", sortOrder: 2 });
  await upsertCategory({ slug: "baby-care", name: "Baby Care", nameBn: "শিশু যত্ন", parentSlug: "everyday-essentials" });
  await upsertCategory({ slug: "stationery", name: "Stationery", nameBn: "স্টেশনারি", parentSlug: "everyday-essentials" });

  await upsertCategory({ slug: "household-products", name: "Household Products", nameBn: "গৃহস্থালি পণ্য", icon: "Home", sortOrder: 3 });
  await upsertCategory({ slug: "cleaning-supplies", name: "Cleaning Supplies", nameBn: "পরিষ্কারক সামগ্রী", parentSlug: "household-products" });
  await upsertCategory({ slug: "kitchen-dining", name: "Kitchen & Dining", nameBn: "রান্নাঘর সামগ্রী", parentSlug: "household-products" });

  await upsertCategory({ slug: "personal-care", name: "Personal Care", nameBn: "ব্যক্তিগত যত্ন", icon: "Sparkles", sortOrder: 4 });
  await upsertCategory({ slug: "bath-body", name: "Bath & Body", nameBn: "স্নান ও শরীরচর্চা", parentSlug: "personal-care" });
  await upsertCategory({ slug: "hair-care", name: "Hair Care", nameBn: "চুলের যত্ন", parentSlug: "personal-care" });

  // Age-restricted category: kept inactive and separate from Everyday Essentials.
  await upsertCategory({
    slug: "cigarettes-smoking-accessories",
    name: "Cigarettes & Smoking Accessories",
    nameBn: "সিগারেট ও ধূমপান সামগ্রী",
    icon: "Ban",
    isAgeRestricted: true,
    isActive: false,
    sortOrder: 99,
  });

  // ---------------------------------------------------------------------
  // Users: admin, vendors, restaurant owners, rider, customer
  // ---------------------------------------------------------------------
  const demoPasswordHash = await hash(DEMO_PASSWORD);

  const admin = await db.user.upsert({
    where: { phone: "+8801700000001" },
    create: { phone: "+8801700000001", name: "Pick Up Admin", email: "admin@pickup.example", passwordHash: demoPasswordHash, role: "ADMIN" },
    update: {},
  });

  const groceryOwner1 = await db.user.upsert({
    where: { phone: "+8801700000002" },
    create: { phone: "+8801700000002", name: "Rahim Uddin", email: "vendor1@pickup.example", passwordHash: demoPasswordHash, role: "VENDOR" },
    update: {},
  });
  const groceryOwner2 = await db.user.upsert({
    where: { phone: "+8801700000003" },
    create: { phone: "+8801700000003", name: "Karim Chakma", email: "vendor2@pickup.example", passwordHash: demoPasswordHash, role: "VENDOR" },
    update: {},
  });
  const restaurantOwner1 = await db.user.upsert({
    where: { phone: "+8801700000004" },
    create: { phone: "+8801700000004", name: "Anupam Tripura", email: "restaurant1@pickup.example", passwordHash: demoPasswordHash, role: "VENDOR" },
    update: {},
  });
  const restaurantOwner2 = await db.user.upsert({
    where: { phone: "+8801700000005" },
    create: { phone: "+8801700000005", name: "Sultana Begum", email: "restaurant2@pickup.example", passwordHash: demoPasswordHash, role: "VENDOR" },
    update: {},
  });
  const restaurantOwner3 = await db.user.upsert({
    where: { phone: "+8801700000006" },
    create: { phone: "+8801700000006", name: "Jamal Hossain", email: "restaurant3@pickup.example", passwordHash: demoPasswordHash, role: "VENDOR" },
    update: {},
  });
  const rider = await db.user.upsert({
    where: { phone: "+8801700000007" },
    create: { phone: "+8801700000007", name: "Milon Tripura", email: "rider@pickup.example", passwordHash: demoPasswordHash, role: "RIDER" },
    update: {},
  });
  const customer = await db.user.upsert({
    where: { phone: "+8801700000008" },
    create: {
      phone: "+8801700000008",
      name: "Nusrat Jahan",
      email: "customer@pickup.example",
      passwordHash: demoPasswordHash,
      role: "CUSTOMER",
      customerProfile: { create: { dateOfBirth: new Date("1998-04-12") } },
      cart: { create: {} },
      wishlist: { create: {} },
    },
    update: {},
  });

  await db.riderProfile.upsert({
    where: { userId: rider.id },
    create: { userId: rider.id, vehicleType: "Motorcycle", licenseNumber: "DHK-RIDER-0001", isOnline: true, isApproved: true },
    update: {},
  });

  const customerAddress = await db.address.findFirst({ where: { userId: customer.id } });
  if (!customerAddress) {
    const zone = await db.deliveryZone.findFirst({ where: { neighbourhoodId: neighbourhoods["khagrachari-town-centre"]!.id } });
    await db.address.create({
      data: {
        userId: customer.id,
        label: "Home",
        recipientName: "Nusrat Jahan",
        recipientPhone: "+8801700000008",
        neighbourhoodId: neighbourhoods["khagrachari-town-centre"]!.id,
        deliveryZoneId: zone?.id,
        streetOrVillage: "Central Road, House 12",
        landmark: "Near Khagrachari Stadium",
        lat: townCentre.lat,
        lng: townCentre.lng,
        isDefault: true,
      },
    });
  }

  // ---------------------------------------------------------------------
  // Grocery vendors + products
  // ---------------------------------------------------------------------
  async function upsertVendor(input: {
    userId: string;
    businessName: string;
    slug: string;
    businessType: "GROCERY_VENDOR" | "RESTAURANT";
    neighbourhoodSlug: string;
    description: string;
    phone: string;
  }) {
    const nb = neighbourhoodDefs.find((n) => n.slug === input.neighbourhoodSlug)!;
    return db.vendor.upsert({
      where: { userId: input.userId },
      create: {
        userId: input.userId,
        businessName: input.businessName,
        slug: input.slug,
        businessType: input.businessType,
        description: input.description,
        phone: input.phone,
        email: `${input.slug}@pickup.example`,
        addressText: `${nb.name}, Khagrachari Sadar`,
        neighbourhoodId: neighbourhoods[input.neighbourhoodSlug]!.id,
        lat: nb.center.lat,
        lng: nb.center.lng,
        commissionRatePct: 10,
        isApproved: true,
      },
      update: {},
    });
  }

  const vendor1 = await upsertVendor({
    userId: groceryOwner1.id,
    businessName: "Sadar Fresh Mart",
    slug: "sadar-fresh-mart",
    businessType: "GROCERY_VENDOR",
    neighbourhoodSlug: "khagrachari-town-centre",
    description: "Fresh groceries, produce, and daily essentials in the heart of Khagrachari Sadar.",
    phone: "+8801800000001",
  });

  const vendor2 = await upsertVendor({
    userId: groceryOwner2.id,
    businessName: "Green Valley Grocers",
    slug: "green-valley-grocers",
    businessType: "GROCERY_VENDOR",
    neighbourhoodSlug: "shapla-chattar",
    description: "Household essentials and personal care, delivered fast from Shapla Chattar.",
    phone: "+8801800000002",
  });

  type ProductSeed = { name: string; price: number; compareAt?: number; unit: string; categorySlug: string; ageRestricted?: boolean };

  async function upsertProducts(vendorId: string, items: ProductSeed[]) {
    for (const item of items) {
      const category = await db.category.findUniqueOrThrow({ where: { slug: item.categorySlug } });
      const slug = item.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-");
      const product = await db.product.upsert({
        where: { vendorId_slug: { vendorId, slug } },
        create: {
          vendorId,
          categoryId: category.id,
          name: item.name,
          slug,
          description: `${item.name} — fresh from Pick Up's Khagrachari Sadar vendor network.`,
          price: item.price,
          compareAtPrice: item.compareAt,
          unit: item.unit,
          isAgeRestricted: item.ageRestricted ?? false,
          isPublished: true,
          availability: "AVAILABLE",
        },
        update: { price: item.price, compareAtPrice: item.compareAt },
      });
      await db.inventory.upsert({
        where: { productId: product.id },
        create: { productId: product.id, quantityInStock: 100, lowStockThreshold: 10 },
        update: {},
      });
    }
  }

  await upsertProducts(vendor1.id, [
    { name: "Basmati Rice 5kg", price: 650, unit: "5 kg bag", categorySlug: "rice-grains" },
    { name: "Miniket Rice 5kg", price: 420, unit: "5 kg bag", categorySlug: "rice-grains" },
    { name: "Red Lentils (Masoor Dal) 1kg", price: 140, unit: "1 kg pack", categorySlug: "rice-grains" },
    { name: "Soybean Oil 5L", price: 880, compareAt: 950, unit: "5 litre bottle", categorySlug: "cooking-oil-spices" },
    { name: "Potato 1kg", price: 35, unit: "1 kg", categorySlug: "vegetables" },
    { name: "Onion 1kg", price: 80, unit: "1 kg", categorySlug: "vegetables" },
    { name: "Tomato 1kg", price: 60, unit: "1 kg", categorySlug: "vegetables" },
    { name: "Banana (Dozen)", price: 60, unit: "12 pcs", categorySlug: "fruits" },
    { name: "Mango 1kg", price: 120, unit: "1 kg", categorySlug: "fruits" },
    { name: "Pasteurized Milk 1L", price: 90, unit: "1 litre", categorySlug: "dairy-eggs" },
    { name: "Eggs (Dozen)", price: 140, unit: "12 pcs", categorySlug: "dairy-eggs" },
    { name: "Rui Fish 1kg", price: 320, unit: "1 kg", categorySlug: "meat-fish" },
    { name: "Broiler Chicken 1kg", price: 190, unit: "1 kg", categorySlug: "meat-fish" },
    { name: "Lays Chips 40g", price: 20, unit: "40 g pack", categorySlug: "snacks" },
    { name: "Coca-Cola 500ml", price: 40, unit: "500 ml bottle", categorySlug: "beverages" },
  ]);

  await upsertProducts(vendor2.id, [
    { name: "Detergent Powder 1kg", price: 180, unit: "1 kg pack", categorySlug: "cleaning-supplies" },
    { name: "Dishwashing Liquid 500ml", price: 110, unit: "500 ml bottle", categorySlug: "cleaning-supplies" },
    { name: "Toothpaste 100g", price: 75, unit: "100 g tube", categorySlug: "bath-body" },
    { name: "Shampoo 200ml", price: 220, unit: "200 ml bottle", categorySlug: "hair-care" },
    { name: "Baby Diapers (Pack of 20)", price: 650, unit: "pack of 20", categorySlug: "baby-care" },
    { name: "Notebook 200 Pages", price: 45, unit: "1 pc", categorySlug: "stationery" },
  ]);

  // ---------------------------------------------------------------------
  // Restaurants
  // ---------------------------------------------------------------------
  async function upsertRestaurant(input: {
    userId: string;
    businessName: string;
    slug: string;
    neighbourhoodSlug: string;
    description: string;
    phone: string;
    cuisineTags: string[];
    prepTime: number;
    opensAt: string;
    closesAt: string;
    menuName: string;
    items: { name: string; price: number; description?: string }[];
  }) {
    const vendor = await upsertVendor({
      userId: input.userId,
      businessName: input.businessName,
      slug: input.slug,
      businessType: "RESTAURANT",
      neighbourhoodSlug: input.neighbourhoodSlug,
      description: input.description,
      phone: input.phone,
    });

    const restaurant = await db.restaurant.upsert({
      where: { vendorId: vendor.id },
      create: {
        vendorId: vendor.id,
        cuisineTags: input.cuisineTags,
        minimumOrderAmount: 150,
        preparationTimeMinutes: input.prepTime,
        scheduledOrderingEnabled: true,
      },
      update: { cuisineTags: input.cuisineTags },
    });

    for (let day = 0; day < 7; day++) {
      await db.restaurantWeeklyHours.upsert({
        where: { restaurantId_dayOfWeek: { restaurantId: restaurant.id, dayOfWeek: day } },
        create: { restaurantId: restaurant.id, dayOfWeek: day, opensAt: input.opensAt, closesAt: input.closesAt, isClosed: false },
        update: { opensAt: input.opensAt, closesAt: input.closesAt },
      });
    }

    const menu = await db.restaurantMenu.findFirst({ where: { vendorId: vendor.id, name: input.menuName } });
    const menuRecord =
      menu ?? (await db.restaurantMenu.create({ data: { vendorId: vendor.id, name: input.menuName, isActive: true } }));

    for (const item of input.items) {
      const existing = await db.menuItem.findFirst({ where: { menuId: menuRecord.id, name: item.name } });
      if (!existing) {
        await db.menuItem.create({
          data: {
            menuId: menuRecord.id,
            name: item.name,
            description: item.description ?? `${item.name} — a Pick Up favourite.`,
            price: item.price,
            isAvailable: true,
          },
        });
      }
    }

    return vendor;
  }

  await upsertRestaurant({
    userId: restaurantOwner1.id,
    businessName: "Pahari Rannaghor",
    slug: "pahari-rannaghor",
    neighbourhoodSlug: "mahajan-para",
    description: "Authentic indigenous Pahari cuisine from Mahajan Para.",
    phone: "+8801800000003",
    cuisineTags: ["Indigenous", "Bangla"],
    prepTime: 30,
    opensAt: "10:00",
    closesAt: "22:00",
    menuName: "Main Menu",
    items: [
      { name: "Bamboo Chicken", price: 320, description: "Chicken slow-cooked in bamboo, a Khagrachari specialty." },
      { name: "Pahari Style Fish Curry", price: 280 },
      { name: "Bamboo Shoot Curry (Bashkoral)", price: 220 },
      { name: "Plain Rice", price: 40 },
    ],
  });

  await upsertRestaurant({
    userId: restaurantOwner2.id,
    businessName: "Chatgang Biriyani House",
    slug: "chatgang-biriyani-house",
    neighbourhoodSlug: "perachhara",
    description: "Kacchi biriyani and Bangla classics from Perachhara.",
    phone: "+8801800000004",
    cuisineTags: ["Biriyani", "Bangla"],
    prepTime: 25,
    opensAt: "11:00",
    closesAt: "23:00",
    menuName: "Biriyani & More",
    items: [
      { name: "Kacchi Biriyani (Regular)", price: 280 },
      { name: "Chicken Biriyani", price: 220 },
      { name: "Beef Tehari", price: 200 },
      { name: "Borhani (Glass)", price: 30 },
    ],
  });

  await upsertRestaurant({
    userId: restaurantOwner3.id,
    businessName: "Madhupur Fast Food Corner",
    slug: "madhupur-fast-food-corner",
    neighbourhoodSlug: "madhupur",
    description: "Fast food, Chinese, and snacks from Madhupur.",
    phone: "+8801800000005",
    cuisineTags: ["Fast Food", "Chinese", "Snacks"],
    prepTime: 20,
    opensAt: "12:00",
    closesAt: "23:30",
    menuName: "Fast Food Menu",
    items: [
      { name: "Chicken Burger", price: 150 },
      { name: "Chicken Fried Rice", price: 180 },
      { name: "Chowmein (Chicken)", price: 160 },
      { name: "Cold Coffee", price: 90 },
    ],
  });

  // ---------------------------------------------------------------------
  // Coupons
  // ---------------------------------------------------------------------
  await db.coupon.upsert({
    where: { code: "WELCOME50" },
    create: {
      code: "WELCOME50",
      type: "FIXED",
      value: 50,
      minOrderAmount: 300,
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
      perCustomerLimit: 1,
    },
    update: {},
  });
  await db.coupon.upsert({
    where: { code: "SAVE10" },
    create: {
      code: "SAVE10",
      type: "PERCENTAGE",
      value: 10,
      maxDiscountAmount: 100,
      minOrderAmount: 500,
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
      perCustomerLimit: 3,
    },
    update: {},
  });

  // ---------------------------------------------------------------------
  // Advertising: placements + pricing (no live campaigns by default)
  // ---------------------------------------------------------------------
  const placementDefs: { code: Prisma.AdPlacementCreateInput["code"]; name: string; desktop: [number, number]; mobile: [number, number]; daily: number; weekly: number; monthly: number }[] = [
    { code: "HERO_BANNER", name: "Homepage hero banner", desktop: [1200, 400], mobile: [600, 400], daily: 800, weekly: 4500, monthly: 15000 },
    { code: "BELOW_CATEGORIES_BANNER", name: "Below categories banner", desktop: [1200, 200], mobile: [600, 300], daily: 400, weekly: 2200, monthly: 7500 },
    { code: "BETWEEN_SECTIONS_BANNER", name: "Between sections banner", desktop: [1200, 200], mobile: [600, 300], daily: 350, weekly: 2000, monthly: 6800 },
    { code: "RESTAURANT_PROMO_BANNER", name: "Restaurant promo banner", desktop: [1200, 300], mobile: [600, 300], daily: 500, weekly: 2800, monthly: 9500 },
    { code: "SIDEBAR_BANNER", name: "Desktop sidebar banner", desktop: [300, 600], mobile: [0, 0], daily: 250, weekly: 1400, monthly: 4800 },
    { code: "MOBILE_PROMO_CARD", name: "Mobile promo card", desktop: [0, 0], mobile: [340, 160], daily: 200, weekly: 1100, monthly: 3800 },
    { code: "SPONSORED_VENDOR", name: "Sponsored vendor placement", desktop: [280, 320], mobile: [220, 280], daily: 300, weekly: 1700, monthly: 5800 },
    { code: "SPONSORED_RESTAURANT", name: "Sponsored restaurant placement", desktop: [280, 320], mobile: [220, 280], daily: 300, weekly: 1700, monthly: 5800 },
  ];

  for (const p of placementDefs) {
    const placement = await db.adPlacement.upsert({
      where: { code: p.code },
      create: {
        code: p.code,
        name: p.name,
        desktopWidth: p.desktop[0],
        desktopHeight: p.desktop[1],
        mobileWidth: p.mobile[0],
        mobileHeight: p.mobile[1],
      },
      update: {},
    });
    for (const [cycle, price] of [
      ["DAILY", p.daily],
      ["WEEKLY", p.weekly],
      ["MONTHLY", p.monthly],
    ] as const) {
      await db.adPricing.upsert({
        where: { placementId_billingCycle: { placementId: placement.id, billingCycle: cycle } },
        create: { placementId: placement.id, billingCycle: cycle, price },
        update: { price },
      });
    }
  }

  // ---------------------------------------------------------------------
  // Age-restricted settings (module stays disabled)
  // ---------------------------------------------------------------------
  const existingSetting = await db.ageRestrictedProductSetting.findFirst();
  if (!existingSetting) {
    await db.ageRestrictedProductSetting.create({
      data: {
        tobaccoSalesEnabled: false,
        minimumAge: 18,
        exclusionRadiusMeters: 100,
        healthWarningText: "Smoking is injurious to health.",
      },
    });
  }

  // ---------------------------------------------------------------------
  // Site settings
  // ---------------------------------------------------------------------
  const settingDefaults: Record<string, string> = {
    support_phone: "+8801700000000",
    support_email: "support@pickup.example",
    support_address: "Khagrachari Sadar, Khagrachari, Chattogram, Bangladesh",
    whatsapp_number: "+8801700000000",
    default_commission_rate_pct: "10",
    free_delivery_threshold: "500",
  };
  for (const [key, value] of Object.entries(settingDefaults)) {
    await db.siteSetting.upsert({ where: { key }, create: { key, value }, update: {} });
  }

  // ---------------------------------------------------------------------
  // One completed demo order so account/order-history pages have data
  // ---------------------------------------------------------------------
  const existingOrder = await db.orderGroup.findFirst({ where: { customerId: customer.id } });
  if (!existingOrder) {
    const address = await db.address.findFirstOrThrow({ where: { userId: customer.id } });
    const zone = await db.deliveryZone.findFirstOrThrow({ where: { neighbourhoodId: neighbourhoods["khagrachari-town-centre"]!.id } });
    const rice = await db.product.findFirstOrThrow({ where: { vendorId: vendor1.id, name: "Basmati Rice 5kg" } });
    const eggs = await db.product.findFirstOrThrow({ where: { vendorId: vendor1.id, name: "Eggs (Dozen)" } });

    const subtotal = Number(rice.price) * 1 + Number(eggs.price) * 2;
    const deliveryFee = Number(zone.deliveryFee);
    const total = subtotal + deliveryFee;
    const commissionRatePct = 10;
    const commissionAmount = Math.round(subtotal * (commissionRatePct / 100));

    const orderGroup = await db.orderGroup.create({
      data: {
        groupNumber: `PU-${Date.now()}`,
        customerId: customer.id,
        subtotal,
        deliveryFeeTotal: deliveryFee,
        grandTotal: total,
        orders: {
          create: [
            {
              orderNumber: `PU-${Date.now()}-1`,
              customerId: customer.id,
              vendorId: vendor1.id,
              addressId: address.id,
              deliveryZoneId: zone.id,
              status: "DELIVERED",
              subtotal,
              deliveryFee,
              total,
              commissionRatePct,
              commissionAmount,
              vendorEarnings: subtotal - commissionAmount,
              items: {
                create: [
                  { productId: rice.id, nameSnapshot: rice.name, unitPriceSnapshot: rice.price, quantity: 1, lineTotal: rice.price },
                  { productId: eggs.id, nameSnapshot: eggs.name, unitPriceSnapshot: eggs.price, quantity: 2, lineTotal: Number(eggs.price) * 2 },
                ],
              },
              statusHistory: {
                create: [
                  { status: "ORDER_PLACED" },
                  { status: "CONFIRMED" },
                  { status: "PREPARING" },
                  { status: "RIDER_ASSIGNED" },
                  { status: "PICKED_UP" },
                  { status: "ON_THE_WAY" },
                  { status: "DELIVERED" },
                ],
              },
            },
          ],
        },
      },
      include: { orders: true },
    });

    const order = orderGroup.orders[0]!;
    const riderProfile = await db.riderProfile.findUniqueOrThrow({ where: { userId: rider.id } });
    await db.delivery.create({
      data: {
        orderId: order.id,
        riderId: riderProfile.id,
        pickupLat: vendor1.lat,
        pickupLng: vendor1.lng,
        dropLat: address.lat,
        dropLng: address.lng,
        deliveredAt: new Date(),
        isTrackingActive: false,
      },
    });

    await db.payment.create({
      data: {
        orderGroupId: orderGroup.id,
        provider: "COD",
        status: "PAID",
        amount: total,
        isSandbox: true,
        paidAt: new Date(),
      },
    });

    await db.commissionEntry.create({
      data: {
        orderId: order.id,
        vendorId: vendor1.id,
        ratePct: commissionRatePct,
        commissionAmount,
        vendorEarnings: subtotal - commissionAmount,
      },
    });

    await db.review.create({
      data: {
        customerId: customer.id,
        orderId: order.id,
        productId: rice.id,
        vendorId: vendor1.id,
        rating: 5,
        comment: "Great quality rice, delivered quickly!",
      },
    });
  }

  // ---------------------------------------------------------------------
  // Vendor payouts, a refund request, and advertising requests — so these
  // admin/vendor pages aren't empty in the demo.
  // ---------------------------------------------------------------------
  const existingPayout = await db.vendorPayout.findFirst({ where: { vendorId: vendor1.id } });
  if (!existingPayout) {
    const now = new Date();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    await db.vendorPayout.create({
      data: {
        vendorId: vendor1.id,
        amount: 18450,
        status: "PAID",
        periodStart: lastMonthStart,
        periodEnd: lastMonthEnd,
        requestedAt: lastMonthEnd,
        processedAt: new Date(lastMonthEnd.getTime() + 3 * 24 * 60 * 60 * 1000),
        payoutMethod: "bKash",
        referenceNo: "PYT-8841203",
      },
    });
    await db.vendorPayout.create({
      data: {
        vendorId: vendor1.id,
        amount: 6120,
        status: "PENDING",
        periodStart: thisMonthStart,
        periodEnd: now,
      },
    });
  }

  const existingRefund = await db.refund.findFirst();
  if (!existingRefund) {
    const demoPayment = await db.payment.findFirst({ where: { orderGroup: { customerId: customer.id } } });
    if (demoPayment) {
      await db.refund.create({
        data: {
          paymentId: demoPayment.id,
          amount: 60,
          reason: "One item arrived damaged — a pack of eggs was broken.",
          status: "REQUESTED",
        },
      });
    }
  }

  const existingAdvertiser = await db.advertiser.findFirst();
  if (!existingAdvertiser) {
    const heroPlacement = await db.adPlacement.findUniqueOrThrow({ where: { code: "HERO_BANNER" } });

    // Pending request — demonstrates the Approve/Reject flow.
    const advertiser1 = await db.advertiser.create({
      data: {
        advertiserName: "Karim Chakma",
        businessName: "Green Valley Grocers",
        phone: "+8801800000002",
        email: "vendor2@pickup.example",
      },
    });
    await db.advertisement.create({
      data: {
        advertiserId: advertiser1.id,
        title: "10% off your first Green Valley order",
        description: "Sponsored placement promoting Green Valley Grocers to new customers in Shapla Chattar.",
        targetUrl: "/marketplace/green-valley-grocers",
        preferredPlacementCode: "SPONSORED_VENDOR",
        budget: 1700,
        paymentMethod: "BKASH",
        agreementAccepted: true,
        status: "SUBMITTED",
      },
    });

    // Approved + running campaign — demonstrates the live campaign card, CTR stats, and Cancel control.
    const advertiser2 = await db.advertiser.create({
      data: {
        advertiserName: "Anupam Tripura",
        businessName: "Pahari Rannaghor",
        phone: "+8801700000004",
        email: "restaurant1@pickup.example",
      },
    });
    const ad2 = await db.advertisement.create({
      data: {
        advertiserId: advertiser2.id,
        title: "Pahari Rannaghor — homepage hero feature",
        description: "Hero banner promoting our weekend thali special.",
        targetUrl: "/restaurants/pahari-rannaghor",
        preferredPlacementCode: "HERO_BANNER",
        budget: 15000,
        paymentMethod: "SSLCOMMERZ",
        agreementAccepted: true,
        status: "APPROVED",
      },
    });
    const campaignStart = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const campaignEnd = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    const campaign = await db.adCampaign.create({
      data: {
        advertisementId: ad2.id,
        placementId: heroPlacement.id,
        startDate: campaignStart,
        endDate: campaignEnd,
        status: "ACTIVE",
      },
    });
    await db.adPayment.create({
      data: { campaignId: campaign.id, amount: 15000, provider: "SSLCOMMERZ", status: "PAID", isSandbox: true, paidAt: campaignStart },
    });
    await db.adImpression.createMany({ data: Array.from({ length: 240 }, () => ({ campaignId: campaign.id })) });
    await db.adClick.createMany({ data: Array.from({ length: 18 }, () => ({ campaignId: campaign.id })) });
  }

  console.log("Seed complete.");
  console.log("Demo accounts (password for all: %s):", DEMO_PASSWORD);
  console.log("  Admin:      +8801700000001 /", admin.email);
  console.log("  Vendor 1:   +8801700000002 (Sadar Fresh Mart)");
  console.log("  Vendor 2:   +8801700000003 (Green Valley Grocers)");
  console.log("  Restaurant 1: +8801700000004 (Pahari Rannaghor)");
  console.log("  Restaurant 2: +8801700000005 (Chatgang Biriyani House)");
  console.log("  Restaurant 3: +8801700000006 (Madhupur Fast Food Corner)");
  console.log("  Rider:      +8801700000007");
  console.log("  Customer:   +8801700000008");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
