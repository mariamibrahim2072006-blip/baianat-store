const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const products = [
    {
        legacyId: 1,
        name: 'Breed Dry Dog Food',
        price: 100,
        category: 'animals',
        description: 'Dry dog food high quality.',
        image: 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=400&q=80',
        rating: 4.5,
        reviews: 35,
    },
    {
        legacyId: 2,
        name: 'CANON EOS DSLR Camera',
        price: 360,
        category: 'electronics',
        description: 'Professional camera for photography.',
        image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&q=80',
        rating: 4.8,
        reviews: 95,
    },
    {
        legacyId: 101,
        name: 'HAVIT HV-G92 Gamepad',
        price: 120,
        oldPrice: 160,
        category: 'electronics',
        description: 'High quality gamepad for gaming.',
        image: 'https://images.unsplash.com/photo-1600080972464-8e5f35f63d08?w=400&q=80',
        discount: '-40%',
        rating: 5.0,
        reviews: 88,
    },
    {
        legacyId: 102,
        name: 'AK-900 Wired Keyboard',
        price: 960,
        oldPrice: 1160,
        category: 'electronics',
        description: 'Wired gaming keyboard.',
        image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400&q=80',
        discount: '-35%',
        rating: 4.0,
        reviews: 75,
    },
    {
        legacyId: 103,
        name: 'IPS LCD Gaming Monitor',
        price: 370,
        oldPrice: 400,
        category: 'electronics',
        description: 'Gaming monitor IPS LCD.',
        image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400&q=80',
        discount: '-30%',
        rating: 5.0,
        reviews: 99,
    },
    {
        legacyId: 104,
        name: 'S-Series Comfort Chair',
        price: 375,
        oldPrice: 400,
        category: 'furniture',
        description: 'Comfortable chair for office and gaming.',
        image: 'https://images.unsplash.com/photo-1580481072645-022f9a6d83d0?w=400&q=80',
        discount: '-25%',
        rating: 4.5,
        reviews: 99,
    },
    {
        legacyId: 201,
        name: 'The north coat',
        price: 260,
        oldPrice: 360,
        category: 'clothing',
        description: 'Warm and comfortable north coat.',
        image: 'https://images.unsplash.com/photo-1544441893-675973e31985?w=400&q=80',
        rating: 5.0,
        reviews: 65,
    },
    {
        legacyId: 202,
        name: 'Gucci duffle bag',
        price: 960,
        oldPrice: 1160,
        category: 'bags',
        description: 'Luxury Gucci duffle bag.',
        image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&q=80',
        rating: 5.0,
        reviews: 65,
    },
    {
        legacyId: 203,
        name: 'RGB liquid CPU Cooler',
        price: 160,
        oldPrice: 170,
        category: 'electronics',
        description: 'High performance RGB liquid CPU cooler.',
        image: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=400&q=80',
        rating: 4.5,
        reviews: 65,
    },
];

async function main() {
    console.log('🔄 بدء إدخال المنتجات...');

    for (const product of products) {
        await prisma.product.upsert({
            where: {
                legacyId: product.legacyId,
            },
            update: product,
            create: product,
        });
    }

    console.log(`✅ تم حفظ ${products.length} منتجات في MongoDB.`);
}

main()
    .catch((error) => {
        console.error('❌ خطأ أثناء إدخال المنتجات:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });