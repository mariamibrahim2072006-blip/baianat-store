const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    const email = process.argv[2];

    if (!email) {
        console.error(
            '❌ استخدمي الأمر: node prisma/make-admin.js your@email.com'
        );
        process.exit(1);
    }

    const cleanEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
        where: {
            email: cleanEmail,
        },
    });

    if (!user) {
        console.error(
            '❌ لا يوجد حساب بهذا البريد الإلكتروني.'
        );
        process.exit(1);
    }

    await prisma.user.update({
        where: {
            id: user.id,
        },
        data: {
            role: 'ADMIN',
        },
    });

    console.log(
        `✅ أصبح الحساب Admin: ${cleanEmail}`
    );
}

main()
    .catch((error) => {
        console.error(
            '❌ خطأ:',
            error
        );
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });