const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');

// ============================================================
// LOAD ENVIRONMENT VARIABLES
// ============================================================

dotenv.config();

// ============================================================
// STRIPE
// ============================================================

const stripe = require('stripe')(
    process.env.STRIPE_SECRET_KEY
);

// ============================================================
// APP SETUP
// ============================================================

const app = express();

const PORT =
    process.env.PORT || 5000;

// ============================================================
// IMPORTANT FOR RAILWAY / PROXY
// ============================================================

app.set('trust proxy', 1);

// ============================================================
// ENVIRONMENT
// ============================================================

const isProduction =
    process.env.NODE_ENV === 'production' ||
    Boolean(process.env.RAILWAY_PUBLIC_DOMAIN);

console.log(
    '🌍 Environment:',
    isProduction
        ? 'PRODUCTION'
        : 'DEVELOPMENT'
);

// ============================================================
// REQUIRED ENVIRONMENT VARIABLES
// ============================================================

if (!process.env.DATABASE_URL) {
    console.error(
        '❌ DATABASE_URL غير موجود'
    );
    process.exit(1);
}

if (!process.env.JWT_SECRET) {
    console.error(
        '❌ JWT_SECRET غير موجود'
    );
    process.exit(1);
}

// ============================================================
// PRISMA
// ============================================================

const prisma =
    new PrismaClient();

// ============================================================
// NODEMAILER
// ============================================================

const transporter =
    nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user:
                process.env.EMAIL_USER,
            pass:
                process.env.EMAIL_PASS,
        },
    });

// ============================================================
// MIDDLEWARE
// ============================================================

app.use(
    helmet()
);

// ============================================================
// CORS (تم التحديث ليقبل أي رابط فرعي أو أساسي على Vercel تلقائياً)
// ============================================================

const allowedOrigins = [
    'http://localhost:5173',
    'https://baianat-store.vercel.app',
];

app.use(
    cors({
        origin: function (
            origin,
            callback
        ) {
            if (!origin) {
                return callback(
                    null,
                    true
                );
            }

            if (
                allowedOrigins.includes(
                    origin
                ) ||
                origin.endsWith('.vercel.app')
            ) {
                return callback(
                    null,
                    true
                );
            }

            console.error(
                '❌ CORS blocked origin:',
                origin
            );

            return callback(
                new Error(
                    `Not allowed by CORS: ${origin}`
                )
            );
        },
        credentials: true,
    })
);

// ============================================================
// BODY PARSERS
// ============================================================

app.use(
    express.json({
        limit: '100kb',
    })
);

app.use(
    cookieParser()
);

// ============================================================
// RATE LIMIT
// ============================================================

const authLimiter =
    rateLimit({
        windowMs:
            15 * 60 * 1000,
        max: 10,
        standardHeaders: true,
        legacyHeaders: false,
        message: {
            message:
                'محاولات كثيرة. يرجى الانتظار قليلاً ثم المحاولة مرة أخرى.',
        },
    });

// ============================================================
// COOKIE OPTIONS
// ============================================================

function getAuthCookieOptions() {
    return {
        httpOnly: true,
        secure: isProduction,
        sameSite:
            isProduction
                ? 'none'
                : 'lax',
        maxAge:
            7 *
            24 *
            60 *
            60 *
            1000,
        path: '/',
    };
}

// ============================================================
// FORMAT PRODUCT
// ============================================================

function formatProduct(
    product
) {
    return {
        id: String(
            product.legacyId
        ),
        name:
            product.name,
        price:
            Number(
                product.price
            ),
        oldPrice:
            product.oldPrice !==
                null &&
                product.oldPrice !==
                undefined
                ? Number(
                    product.oldPrice
                )
                : undefined,
        category:
            product.category,
        description:
            product.description,
        image:
            product.image,
        discount:
            product.discount !==
                null &&
                product.discount !==
                undefined
                ? String(
                    product.discount
                )
                : undefined,
        rating:
            Number(
                product.rating
            ) || 0,
        reviews:
            Number(
                product.reviews
            ) || 0,
        stock:
            Number(
                product.stock
            ) || 0,
    };
}

// ============================================================
// ROOT
// ============================================================

app.get(
    '/',
    (req, res) => {
        res.status(200).json({
            message:
                'Backend API is running',
            status: 'ok',
        });
    }
);

// ============================================================
// HEALTH
// ============================================================

app.get(
    '/api/health',
    async (req, res) => {
        try {
            await prisma.$connect();
            res.status(200).json({
                status: 'ok',
                database:
                    'connected',
            });
        } catch (error) {
            console.error(
                'Health check error:',
                error
            );
            res.status(503).json({
                status:
                    'error',
                database:
                    'disconnected',
            });
        }
    }
);

// ============================================================
// AUTH MIDDLEWARE
// ============================================================

function authenticateToken(
    req,
    res,
    next
) {
    let token = req.cookies?.token;

    if (!token && req.headers.authorization) {
        const authHeader = req.headers.authorization;
        if (authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        }
    }

    console.log(
        '🍪 Token received:',
        token
            ? 'YES'
            : 'NO'
    );

    if (!token) {
        return res.status(401).json({
            message:
                'غير مصرح. يرجى تسجيل الدخول.',
        });
    }

    try {
        const decoded =
            jwt.verify(
                token,
                process.env.JWT_SECRET
            );

        req.userId =
            decoded.userId;

        next();
    } catch (error) {
        console.error(
            '❌ JWT verification error:',
            error.message
        );

        return res.status(401).json({
            message:
                'جلسة تسجيل الدخول غير صالحة أو منتهية.',
        });
    }
}

// ============================================================
// PRODUCTS
// ============================================================

app.get(
    '/api/products',
    async (req, res) => {
        try {
            const products =
                await prisma.product.findMany({
                    orderBy: {
                        legacyId:
                            'asc',
                    },
                });

            res.status(200).json(
                products.map(
                    formatProduct
                )
            );
        } catch (error) {
            console.error(
                '❌ Get products error:',
                error
            );

            res.status(500).json({
                message:
                    'حدث خطأ أثناء تحميل المنتجات.',
            });
        }
    }
);

// ============================================================
// SINGLE PRODUCT
// ============================================================

app.get(
    '/api/products/:id',
    async (req, res) => {
        try {
            const productId =
                Number(
                    req.params.id
                );

            if (
                !Number.isInteger(
                    productId
                )
            ) {
                return res.status(400).json({
                    message:
                        'معرف المنتج غير صالح.',
                });
            }

            const product =
                await prisma.product.findUnique({
                    where: {
                        legacyId:
                            productId,
                    },
                });

            if (!product) {
                return res.status(404).json({
                    message:
                        'المنتج غير موجود.',
                });
            }

            res.status(200).json(
                formatProduct(
                    product
                )
            );
        } catch (error) {
            console.error(
                '❌ Get product error:',
                error
            );

            res.status(500).json({
                message:
                    'حدث خطأ أثناء تحميل المنتج.',
            });
        }
    }
);

// ============================================================
// SIGN UP
// ============================================================

app.post(
    '/api/signup',
    authLimiter,
    async (req, res) => {
        try {
            const {
                username,
                email,
                password,
            } = req.body;

            const cleanUsername =
                typeof username ===
                    'string'
                    ? username.trim()
                    : '';

            const cleanEmail =
                typeof email ===
                    'string'
                    ? email
                        .trim()
                        .toLowerCase()
                    : '';

            if (
                !cleanUsername ||
                !cleanEmail ||
                !password
            ) {
                return res.status(400).json({
                    message:
                        'يرجى ملء جميع الحقول المطلوبة.',
                });
            }

            const existingUser =
                await prisma.user.findUnique({
                    where: {
                        email:
                            cleanEmail,
                    },
                });

            if (existingUser) {
                return res.status(409).json({
                    message:
                        'هذا البريد الإلكتروني مسجل بالفعل.',
                });
            }

            const hashedPassword =
                await bcrypt.hash(
                    password,
                    12
                );

            await prisma.user.create({
                data: {
                    username:
                        cleanUsername,
                    email:
                        cleanEmail,
                    password:
                        hashedPassword,
                },
            });

            res.status(201).json({
                message:
                    'تم إنشاء الحساب بنجاح!',
            });
        } catch (error) {
            console.error(
                '❌ Signup error:',
                error
            );

            res.status(500).json({
                message:
                    'حدث خطأ داخلي في السيرفر.',
            });
        }
    }
);

// ============================================================
// LOGIN
// ============================================================

app.post(
    '/api/login',
    authLimiter,
    async (req, res) => {
        try {
            const {
                email,
                password,
            } = req.body;

            const cleanEmail =
                typeof email ===
                    'string'
                    ? email
                        .trim()
                        .toLowerCase()
                    : '';

            if (
                !cleanEmail ||
                !password
            ) {
                return res.status(400).json({
                    message:
                        'البريد الإلكتروني وكلمة المرور مطلوبان.',
                });
            }

            const user =
                await prisma.user.findUnique({
                    where: {
                        email:
                            cleanEmail,
                    },
                });

            if (
                !user ||
                !(await bcrypt.compare(
                    password,
                    user.password
                ))
            ) {
                return res.status(401).json({
                    message:
                        'خطأ في البريد الإلكتروني أو كلمة المرور.',
                });
            }

            const token =
                jwt.sign(
                    {
                        userId:
                            user.id,
                    },
                    process.env.JWT_SECRET,
                    {
                        expiresIn:
                            '7d',
                    }
                );

            res.cookie(
                'token',
                token,
                getAuthCookieOptions()
            );

            console.log(
                '✅ Login successful for:',
                user.email
            );
            console.log(
                '🍪 Auth cookie set'
            );

            res.status(200).json({
                message:
                    'تم تسجيل الدخول بنجاح!',
                token: token,
                user: {
                    id:
                        user.id,
                    username:
                        user.username,
                    email:
                        user.email,
                },
            });
        } catch (error) {
            console.error(
                '❌ Login error:',
                error
            );

            res.status(500).json({
                message:
                    'حدث خطأ داخلي في السيرفر.',
            });
        }
    }
);

// ============================================================
// CURRENT USER
// ============================================================

app.get(
    '/api/me',
    authenticateToken,
    async (req, res) => {
        try {
            const user =
                await prisma.user.findUnique({
                    where: {
                        id:
                            req.userId,
                    },
                    select: {
                        id:
                            true,
                        username:
                            true,
                        email:
                            true,
                        address:
                            true,
                        createdAt:
                            true,
                    },
                });

            if (!user) {
                return res.status(404).json({
                    message:
                        'المستخدم غير موجود.',
                });
            }

            res.status(200).json({
                user,
            });
        } catch (error) {
            console.error(
                '❌ Get me error:',
                error
            );

            res.status(500).json({
                message:
                    'حدث خطأ داخلي.',
            });
        }
    }
);

// ============================================================
// UPDATE USER
// ============================================================

app.put(
    '/api/me',
    authenticateToken,
    async (req, res) => {
        try {
            const {
                firstName,
                lastName,
                email,
                address,
                currentPassword,
                newPassword,
                confirmPassword,
            } = req.body;

            const existingUser =
                await prisma.user.findUnique({
                    where: {
                        id:
                            req.userId,
                    },
                });

            if (!existingUser) {
                return res.status(404).json({
                    message:
                        'المستخدم غير موجود.',
                });
            }

            const cleanEmail =
                typeof email ===
                    'string'
                    ? email
                        .trim()
                        .toLowerCase()
                    : '';

            const updateData = {
                username:
                    `${firstName || ''} ${lastName || ''
                        }`.trim() ||
                    existingUser.username,
                email:
                    cleanEmail ||
                    existingUser.email,
                address:
                    address !==
                        undefined
                        ? String(
                            address
                        ).trim()
                        : existingUser.address,
            };

            if (newPassword) {
                if (
                    !currentPassword ||
                    !(await bcrypt.compare(
                        currentPassword,
                        existingUser.password
                    ))
                ) {
                    return res.status(400).json({
                        message:
                            'كلمة المرور الحالية غير صحيحة.',
                    });
                }

                if (
                    newPassword !==
                    confirmPassword
                ) {
                    return res.status(400).json({
                        message:
                            'تأكيد كلمة المرور غير مطابق.',
                    });
                }

                updateData.password =
                    await bcrypt.hash(
                        newPassword,
                        12
                    );
            }

            const updatedUser =
                await prisma.user.update({
                    where: {
                        id:
                            req.userId,
                    },
                    data:
                        updateData,
                    select: {
                        id:
                            true,
                        username:
                            true,
                        email:
                            true,
                        address:
                            true,
                        createdAt:
                            true,
                    },
                });

            res.status(200).json({
                message:
                    'تم حفظ التغييرات بنجاح.',
                user:
                    updatedUser,
            });
        } catch (error) {
            console.error(
                '❌ Update user error:',
                error
            );

            res.status(500).json({
                message:
                    'حدث خطأ أثناء حفظ البيانات.',
            });
        }
    }
);

// ============================================================
// LOGOUT
// ============================================================

app.post(
    '/api/logout',
    (req, res) => {
        res.clearCookie(
            'token',
            {
                ...getAuthCookieOptions(),
                maxAge:
                    undefined,
            }
        );

        res.status(200).json({
            message:
                'تم تسجيل الخروج بنجاح.',
        });
    }
);

// ============================================================
// CART - GET
// ============================================================

app.get(
    '/api/cart',
    authenticateToken,
    async (req, res) => {
        try {
            const cart =
                await prisma.cart.findUnique({
                    where: {
                        userId:
                            req.userId,
                    },
                    include: {
                        items:
                            true,
                    },
                });

            if (!cart) {
                return res.status(200).json({
                    items: [],
                });
            }

            const products =
                await prisma.product.findMany();

            const formattedItems =
                cart.items
                    .map(
                        (item) => {
                            const product =
                                products.find(
                                    (p) =>
                                        p.legacyId ===
                                        item.productLegacyId
                                );

                            if (
                                !product
                            ) {
                                return null;
                            }

                            return {
                                id: String(
                                    product.legacyId
                                ),
                                name:
                                    product.name,
                                price:
                                    Number(
                                        product.price
                                    ),
                                oldPrice:
                                    product.oldPrice ??
                                    undefined,
                                image:
                                    product.image,
                                quantity:
                                    item.quantity,
                                selectedSize:
                                    item.selectedSize ??
                                    undefined,
                            };
                        }
                    )
                    .filter(Boolean);

            res.status(200).json({
                items:
                    formattedItems,
            });
        } catch (error) {
            console.error(
                '❌ Get cart error:',
                error
            );

            res.status(500).json({
                message:
                    'خطأ في تحميل السلة.',
            });
        }
    }
);

// ============================================================
// CART - SAVE
// ============================================================

app.put(
    '/api/cart',
    authenticateToken,
    async (req, res) => {
        try {
            const {
                items,
            } = req.body;

            const cart =
                await prisma.cart.upsert({
                    where: {
                        userId:
                            req.userId,
                    },
                    update: {},
                    create: {
                        userId:
                            req.userId,
                    },
                });

            await prisma.cartItem.deleteMany({
                where: {
                    cartId:
                        cart.id,
                },
            });

            if (
                Array.isArray(
                    items
                ) &&
                items.length > 0
            ) {
                const cartItems =
                    items
                        .map(
                            (item) => ({
                                cartId:
                                    cart.id,
                                productLegacyId:
                                    Number(
                                        item.id
                                    ),
                                quantity:
                                    Number(
                                        item.quantity
                                    ) || 1,
                                selectedSize:
                                    item.selectedSize ||
                                    null,
                            })
                        )
                        .filter(
                            (item) =>
                                Number.isInteger(
                                    item.productLegacyId
                                )
                        );

                if (
                    cartItems.length >
                    0
                ) {
                    await prisma.cartItem.createMany(
                        {
                            data:
                                cartItems,
                        }
                    );
                }
            }

            res.status(200).json({
                message:
                    'تم حفظ السلة بنجاح.',
            });
        } catch (error) {
            console.error(
                '❌ Save cart error:',
                error
            );

            res.status(500).json({
                message:
                    'خطأ في حفظ السلة.',
            });
        }
    }
);

// ============================================================
// STRIPE CHECKOUT
// ============================================================

app.post(
    '/api/create-checkout-session',
    authenticateToken,
    async (req, res) => {
        try {
            const {
                items,
            } = req.body;

            if (
                !Array.isArray(
                    items
                ) ||
                items.length ===
                0
            ) {
                return res.status(400).json({
                    message:
                        'السلة فارغة.',
                });
            }

            const session =
                await stripe.checkout.sessions.create(
                    {
                        payment_method_types:
                            [
                                'card',
                            ],
                        line_items:
                            items.map(
                                (
                                    item
                                ) => ({
                                    price_data:
                                    {
                                        currency:
                                            'usd',
                                        product_data:
                                        {
                                            name:
                                                item.name,
                                        },
                                        unit_amount:
                                            Math.round(
                                                Number(
                                                    item.price
                                                ) *
                                                100
                                            ),
                                    },
                                    quantity:
                                        Number(
                                            item.quantity
                                        ) || 1,
                                })
                            ),
                        mode:
                            'payment',
                        success_url:
                            'https://baianat-store.vercel.app/success',
                        cancel_url:
                            'https://baianat-store.vercel.app/cart',
                    }
                );

            res.status(200).json({
                id:
                    session.id,
                url:
                    session.url,
            });
        } catch (error) {
            console.error(
                '❌ Stripe error:',
                error
            );

            res.status(500).json({
                message:
                    'حدث خطأ في عملية الدفع.',
            });
        }
    }
);

// ============================================================
// CREATE ORDER
// ============================================================

app.post(
    '/api/orders',
    authenticateToken,
    async (req, res) => {
        try {
            const {
                address,
                paymentMethod,
                items,
            } = req.body;

            if (
                !address ||
                !Array.isArray(
                    items
                ) ||
                items.length ===
                0
            ) {
                return res.status(400).json({
                    message:
                        'بيانات الطلب غير مكتملة.',
                });
            }

            const result =
                await prisma.$transaction(
                    async (tx) => {
                        let total = 0;

                        for (
                            const item of items
                        ) {
                            const product =
                                await tx.product.findUnique(
                                    {
                                        where:
                                        {
                                            legacyId:
                                                Number(
                                                    item.id
                                                ),
                                        },
                                    }
                                );

                            if (!product) {
                                throw new Error(
                                    `المنتج ${item.name} غير موجود.`
                                );
                            }

                            const quantity =
                                Number(
                                    item.quantity
                                ) || 1;

                            if (
                                product.stock <
                                quantity
                            ) {
                                throw new Error(
                                    `عذراً، الكمية المطلوبة من المنتج (${product.name}) غير متوفرة في المخزن (المتبقي: ${product.stock}).`
                                );
                            }

                            await tx.product.update(
                                {
                                    where:
                                    {
                                        id:
                                            product.id,
                                    },
                                    data:
                                    {
                                        stock:
                                            product.stock -
                                            quantity,
                                    },
                                }
                            );

                            total +=
                                Number(
                                    product.price
                                ) *
                                quantity;
                        }

                        return await tx.order.create(
                            {
                                data:
                                {
                                    userId:
                                        req.userId,
                                    total,
                                    address,
                                    status:
                                        'Pending',
                                    items:
                                    {
                                        create:
                                            items.map(
                                                (
                                                    item
                                                ) => ({
                                                    productLegacyId:
                                                        Number(
                                                            item.id
                                                        ),
                                                    name:
                                                        item.name,
                                                    price:
                                                        Number(
                                                            item.price
                                                        ) || 0,
                                                    image:
                                                        item.image ||
                                                        '',
                                                    quantity:
                                                        Number(
                                                            item.quantity
                                                        ) || 1,
                                                    selectedSize:
                                                        item.selectedSize ||
                                                        null,
                                                })
                                            ),
                                    },
                                },
                                include:
                                {
                                    items:
                                        true,
                                },
                            }
                        );
                    }
                );

            const cart =
                await prisma.cart.findUnique({
                    where: {
                        userId:
                            req.userId,
                    },
                });

            if (cart) {
                await prisma.cartItem.deleteMany({
                    where: {
                        cartId:
                            cart.id,
                    },
                });
            }

            const user =
                await prisma.user.findUnique({
                    where: {
                        id:
                            req.userId,
                    },
                });

            if (
                user &&
                user.email
            ) {
                const isCod =
                    paymentMethod ===
                    'cod';

                const paymentText =
                    isCod
                        ? 'الدفع عند الاستلام (Cash on Delivery)'
                        : 'الدفع الإلكتروني (Online Payment)';

                const mailOptions =
                {
                    from:
                        '"BAIANAT Store" <no-reply@baianat.com>',
                    to:
                        user.email,
                    subject:
                        '🛍️ تأكيد طلبك من متجر بـيانات',
                    html: `
                            <div style="font-family: Arial, sans-serif; direction: rtl; padding: 25px; background-color: #f8fafc; border-radius: 12px; color: #111;">
                                <h2 style="color: #DB4444;">
                                    شكراً لك يا ${user.username ||
                        'عميلنا العزيز'
                        }! 🎉
                                </h2>

                                <p style="font-size: 16px;">
                                    تم استلام طلبك بنجاح، وتحديث المخزون، وهو الآن قيد التجهيز للشحن.
                                </p>

                                <div style="background: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 20px 0;">
                                    <h3>
                                        تفاصيل الفاتورة:
                                    </h3>

                                    <p>
                                        <strong>
                                            طريقة الدفع:
                                        </strong>

                                        ${paymentText}
                                    </p>

                                    <p>
                                        <strong>
                                            إجمالي المبلغ:
                                        </strong>

                                        $${result.total.toFixed(
                            2
                        )}
                                    </p>

                                    <p>
                                        <strong>
                                            عنوان الشحن:
                                        </strong>

                                        ${address}
                                    </p>
                                </div>

                                ${isCod
                            ? `
                                        <p>
                                            📦 سيقوم فريق التوصيل بالاتصال بك هاتفياً لتأكيد موعد وصول الشحنة.
                                        </p>
                                    `
                            : ''
                        }

                                <hr />

                                <p style="font-size: 12px; color: #94a3b8; text-align: center;">
                                    متجر بـيانات - جميع الحقوق محفوظة © 2026
                                </p>
                            </div>
                        `,
                };

                transporter.sendMail(
                    mailOptions,
                    (error, info) => {
                        if (error) {
                            console.error(
                                '❌ Email error:',
                                error
                            );
                        } else {
                            console.log(
                                '✅ Email sent:',
                                info.response
                            );
                        }
                    }
                );
            }

            res.status(201).json({
                message:
                    'تم إنشاء الطلب وخصم الكمية من المخزن بنجاح.',
                order:
                    result,
            });
        } catch (error) {
            console.error(
                '❌ Create order error:',
                error
            );

            res.status(400).json({
                message:
                    error.message ||
                    'خطأ أثناء إنشاء الطلب أو تحديث المخزن.',
            });
        }
    }
);

// ============================================================
// GET ORDERS
// ============================================================

app.get(
    '/api/orders',
    authenticateToken,
    async (req, res) => {
        try {
            const orders =
                await prisma.order.findMany({
                    where: {
                        userId:
                            req.userId,
                    },
                    include: {
                        items:
                            true,
                    },
                    orderBy: {
                        createdAt:
                            'desc',
                    },
                });

            res.status(200).json(
                orders
            );
        } catch (error) {
            console.error(
                '❌ Get orders error:',
                error
            );

            res.status(500).json({
                message:
                    'خطأ في تحميل الطلبات.',
            });
        }
    }
);

// ============================================================
// ADD REVIEW
// ============================================================

app.post(
    '/api/reviews',
    authenticateToken,
    async (req, res) => {
        try {
            const {
                productId,
                rating,
                comment,
            } = req.body;

            if (
                !productId ||
                !rating
            ) {
                return res.status(400).json({
                    message:
                        'معرف المنتج والتقييم مطلوبان.',
                });
            }

            const product =
                await prisma.product.findUnique(
                    {
                        where: {
                            legacyId:
                                Number(
                                    productId
                                ),
                        },
                    }
                );

            if (!product) {
                return res.status(404).json({
                    message:
                        'المنتج غير موجود.',
                });
            }

            const userOrders =
                await prisma.order.findMany({
                    where: {
                        userId:
                            req.userId,
                    },
                    include: {
                        items:
                            true,
                    },
                });

            const hasPurchased =
                userOrders.some(
                    (
                        order
                    ) =>
                        order.items.some(
                            (
                                item
                            ) =>
                                Number(
                                    item.productLegacyId
                                ) ===
                                Number(
                                    productId
                                )
                        )
                );

            if (!hasPurchased) {
                return res.status(403).json({
                    message:
                        'عذراً، يجب شراء المنتج أولاً لتتمكن من إضافة تقييم أو تعليق! 🛒',
                });
            }

            const newReview =
                await prisma.review.create({
                    data: {
                        productId:
                            product.id,
                        rating:
                            Number(
                                rating
                            ),
                        comment:
                            comment ||
                            '',
                        userId:
                            req.userId,
                    },
                });

            res.status(201).json({
                message:
                    'تم إضافة التعليق والتقييم بنجاح',
                review:
                    newReview,
            });
        } catch (error) {
            console.error(
                '❌ Add review error:',
                error
            );

            res.status(500).json({
                message:
                    'فشل في إضافة التقييم',
                error:
                    error.message,
            });
        }
    }
);

// ============================================================
// GET REVIEWS
// ============================================================

app.get(
    '/api/products/:productId/reviews',
    async (req, res) => {
        try {
            const product =
                await prisma.product.findUnique(
                    {
                        where: {
                            legacyId:
                                Number(
                                    req.params.productId
                                ),
                        },
                    }
                );

            if (!product) {
                return res.status(404).json({
                    message:
                        'المنتج غير موجود.',
                });
            }

            const reviews =
                await prisma.review.findMany({
                    where: {
                        productId:
                            product.id,
                    },
                    include: {
                        user: {
                            select: {
                                username:
                                    true,
                            },
                        },
                    },
                    orderBy: {
                        createdAt:
                            'desc',
                    },
                });

            res.status(200).json(
                reviews
            );
        } catch (error) {
            console.error(
                '❌ Get reviews error:',
                error
            );

            res.status(500).json({
                message:
                    'فشل في جلب التقييمات',
                error:
                    error.message,
            });
        }
    }
);

// ============================================================
// ADMIN AUTH
// ============================================================

async function authenticateAdmin(
    req,
    res,
    next
) {
    try {
        const user =
            await prisma.user.findUnique({
                where: {
                    id:
                        req.userId,
                },
            });

        if (
            !user ||
            user.email !==
            process.env.ADMIN_EMAIL
        ) {
            return res.status(403).json({
                message:
                    'غير مسموح لك بالوصول.',
            });
        }

        req.adminUser =
            user;

        next();
    } catch (error) {
        console.error(
            '❌ Admin authentication error:',
            error
        );

        res.status(500).json({
            message:
                'حدث خطأ أثناء التحقق من صلاحيات الأدمن.',
        });
    }
}

// ============================================================
// ADMIN ADD PRODUCT
// ============================================================

app.post(
    '/api/admin/products',
    authenticateToken,
    authenticateAdmin,
    async (req, res) => {
        try {
            const {
                name,
                price,
                oldPrice,
                category,
                description,
                image,
                discount,
                rating,
                reviews,
                stock,
            } = req.body;

            if (
                !name ||
                price ===
                undefined ||
                price ===
                null
            ) {
                return res.status(400).json({
                    message:
                        'اسم المنتج والسعر مطلوبان.',
                });
            }

            const lastProduct =
                await prisma.product.findFirst(
                    {
                        orderBy: {
                            legacyId:
                                'desc',
                        },
                    }
                );

            const newLegacyId =
                lastProduct
                    ? lastProduct.legacyId +
                    1
                    : 1;

            const newProduct =
                await prisma.product.create({
                    data: {
                        legacyId:
                            newLegacyId,
                        name:
                            String(
                                name
                            ).trim(),
                        price:
                            Number(
                                price
                            ),
                        oldPrice:
                            oldPrice
                                ? Number(
                                    oldPrice
                                )
                                : null,
                        category:
                            category
                                ? String(
                                    category
                                )
                                : 'General',
                        description:
                            description
                                ? String(
                                    description
                                )
                                : '',
                        image:
                            image
                                ? String(
                                    image
                                )
                                : '',
                        discount:
                            discount
                                ? String(
                                    discount
                                )
                                : null,
                        rating:
                            Number(
                                rating
                            ) || 0,
                        reviews:
                            Number(
                                reviews
                            ) || 0,
                        stock:
                            stock !==
                                undefined
                                ? Number(
                                    stock
                                )
                                : 10,
                    },
                });

            res.status(201).json({
                message:
                    'تمت إضافة المنتج بنجاح.',
                product:
                    formatProduct(
                        newProduct
                    ),
            });
        } catch (error) {
            console.error(
                '❌ Add product error:',
                error
            );

            res.status(500).json({
                message:
                    'حدث خطأ أثناء إضافة المنتج.',
            });
        }
    }
);

// ============================================================
// ADMIN DELETE PRODUCT
// ============================================================

app.delete(
    '/api/admin/products/:id',
    authenticateToken,
    authenticateAdmin,
    async (req, res) => {
        try {
            const legacyId =
                Number(
                    req.params.id
                );

            await prisma.product.delete({
                where: {
                    legacyId,
                },
            });

            res.status(200).json({
                message:
                    'تم حذف المنتج بنجاح.',
            });
        } catch (error) {
            console.error(
                '❌ Delete product error:',
                error
            );

            res.status(500).json({
                message:
                    'حدث خطأ أثناء حذف المنتج.',
            });
        }
    }
);

// ============================================================
// ADMIN UPDATE PRODUCT
// ============================================================

app.put(
    '/api/admin/products/:id',
    authenticateToken,
    authenticateAdmin,
    async (req, res) => {
        try {
            const legacyId =
                Number(
                    req.params.id
                );

            const existingProduct =
                await prisma.product.findUnique(
                    {
                        where: {
                            legacyId,
                        },
                    }
                );

            if (!existingProduct) {
                return res.status(404).json({
                    message:
                        'المنتج غير موجود.',
                });
            }

            const {
                name,
                price,
                oldPrice,
                category,
                description,
                image,
                discount,
                rating,
                reviews,
                stock,
            } = req.body;

            const updatedProduct =
                await prisma.product.update({
                    where: {
                        id:
                            existingProduct.id,
                    },
                    data: {
                        name:
                            name !==
                                undefined
                                ? String(
                                    name
                                ).trim()
                                : existingProduct.name,
                        price:
                            price !==
                                undefined
                                ? Number(
                                    price
                                )
                                : existingProduct.price,
                        oldPrice:
                            oldPrice !==
                                undefined
                                ? oldPrice
                                    ? Number(
                                        oldPrice
                                    )
                                    : null
                                : existingProduct.oldPrice,
                        category:
                            category !==
                                undefined
                                ? String(
                                    category
                                )
                                : existingProduct.category,
                        description:
                            description !==
                                undefined
                                ? String(
                                    description
                                )
                                : existingProduct.description,
                        image:
                            image !==
                                undefined
                                ? String(
                                    image
                                )
                                : existingProduct.image,
                        discount:
                            discount !==
                                undefined
                                ? discount
                                    ? String(
                                        discount
                                    )
                                    : null
                                : existingProduct.discount,
                        rating:
                            rating !==
                                undefined
                                ? Number(
                                    rating
                                )
                                : existingProduct.rating,
                        reviews:
                            reviews !==
                                undefined
                                ? Number(
                                    reviews
                                )
                                : existingProduct.reviews,
                        stock:
                            stock !==
                                undefined
                                ? Number(
                                    stock
                                )
                                : existingProduct.stock,
                    },
                });

            res.status(200).json({
                message:
                    'تم تعديل المنتج بنجاح.',
                product:
                    formatProduct(
                        updatedProduct
                    ),
            });
        } catch (error) {
            console.error(
                '❌ Update product error:',
                error
            );

            res.status(500).json({
                message:
                    'حدث خطأ أثناء تعديل المنتج.',
            });
        }
    }
);

// ============================================================
// ADMIN UPDATE ORDER STATUS
// ============================================================

app.put(
    '/api/admin/orders/:id/status',
    authenticateToken,
    authenticateAdmin,
    async (req, res) => {
        try {
            const {
                status,
            } = req.body;

            if (!status) {
                return res.status(400).json({
                    message:
                        'حالة الطلب مطلوبة.',
                });
            }

            const updatedOrder =
                await prisma.order.update({
                    where: {
                        id:
                            req.params.id,
                    },
                    data: {
                        status,
                    },
                    include: {
                        items:
                            true,
                    },
                });

            res.status(200).json({
                message:
                    'تم تحديث حالة الطلب بنجاح.',
                order:
                    updatedOrder,
            });
        } catch (error) {
            console.error(
                '❌ Update order status error:',
                error
            );

            res.status(500).json({
                message:
                    'حدث خطأ أثناء تحديث حالة الطلب.',
            });
        }
    }
);

// ============================================================
// ERROR HANDLER
// ============================================================

app.use(
    (
        error,
        req,
        res,
        next
    ) => {
        console.error(
            '❌ Server error:',
            error
        );

        if (
            error.message &&
            error.message.includes(
                'Not allowed by CORS'
            )
        ) {
            return res.status(403).json({
                message:
                    'CORS blocked this origin.',
            });
        }

        res.status(500).json({
            message:
                'حدث خطأ في السيرفر.',
        });
    }
);

// ============================================================
// SERVER START
// ============================================================

async function startServer() {
    try {
        await prisma.$connect();
        console.log(
            '✅ متصل بـ MongoDB Atlas باستخدام Prisma'
        );

        app.listen(
            PORT,
            '0.0.0.0',
            () => {
                console.log(
                    `🚀 Backend يعمل على port ${PORT}`
                );
                console.log(
                    `🍪 Cookies mode: ${isProduction
                        ? 'PRODUCTION / Secure + SameSite=None'
                        : 'DEVELOPMENT / Lax'
                    }`
                );
            }
        );
    } catch (error) {
        console.error(
            '❌ فشل الاتصال:',
            error
        );
        await prisma.$disconnect();
        process.exit(1);
    }
}

startServer();