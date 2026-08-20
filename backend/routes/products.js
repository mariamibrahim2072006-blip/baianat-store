const express = require('express');
const router = express.Router();

const products = [
    { id: 1, title: 'منتج تجريبي 1', price: 100, description: 'وصف المنتج التجريبي الأول', image: 'https://via.placeholder.com/150' },
    { id: 2, title: 'منتج تجريبي 2', price: 200, description: 'وصف المنتج التجريبي الثاني', image: 'https://via.placeholder.com/150' }
];

router.get('/', (req, res) => {
    res.json(products);
});

router.get('/:id', (req, res) => {
    const product = products.find(p => p.id === parseInt(req.params.id));
    if (!product) {
        return res.status(404).json({ message: 'المنتج غير موجود' });
    }
    res.json(product);
});

module.exports = router;