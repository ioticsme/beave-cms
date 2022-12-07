const Product = require('../../model/Product')
const Category = require('../../model/Category')
const ProductResource = require('../../resources/api/product.resource')

const getProductWithInCategory = async (req, res) => {
    try {
        let products = []
        const category = await Category.find({
            brand: req.brand._id,
            country: req.country._id,
            published: true,
        }).sort('position')
        if (category?.length) {
            for (i = 0; i < category.length; i++) {
                let items = await Product.aggregate([
                    {
                        $match: {
                            brand: req.brand._id,
                            country: req.country._id,
                            category: category[i]._id,
                            product_type: 'regular',
                            published: true,
                            isDeleted: false,
                        },
                    },
                    {
                        $addFields: {
                            currency: req.brand.currency_symbol,
                            decimal_points: req.brand.currency_decimal_points,
                        },
                    },
                    // {
                    //     $lookup: {
                    //         from: 'countries',
                    //         localField: 'country',
                    //         foreignField: '_id',
                    //         as: 'country',
                    //     },
                    // },
                    { $project: { category: 0 } },
                    { $sort: { position: 1 } },
                ])

                // let items = await Product.find({
                //     country: req.country._id,
                //     category: category[i]._id,
                //     product_type: 'regular',
                // })
                //     .sort('position')
                //     .populate('country')
                //     .select('-category')
                let obj = {
                    _id: category[i]._id,
                    slug: category[i].slug,
                    name: category[i].name,
                    description: category[i].description,
                    image: category[i].image,
                    products: ProductResource.collection(items),
                }
                products.push(obj)
            }
        }
        res.status(200).json(products)
    } catch (error) {
        return res.status(500).json({ error: `Something went wrong` })
    }
}

// Product
const productList = async (req, res) => {
    try {
        let products = []
        if (req.query.withInCategory) {
            getProductWithInCategory(req, res)
        } else {
            products = await Product.find({
                published: true,
                product_type: 'regular',
                brand: req.brand._id,
                country: req.country._id,
                isDeleted: false,
            })
                .sort('position')
                .populate('category')
                .populate('country')
            res.status(200).json(products)
            // res.status(200).json(ProductResource.collection(products))
        }
    } catch (error) {
        return res.status(500).json({ error: `Something went wrong` })
    }
}
const productDetail = async (req, res) => {
    try {
        const product = await Product.findOne({
            _id: req.params.id,
            free_product: false,
            deletedAt: null,
            published: true,
            brand: req.brand._id,
            country: req.country._id,
            isDeleted: false,
        })
            .populate('category')
            .populate('country')
        res.status(200).json(new ProductResource(product).exec())
    } catch (error) {
        return res.status(500).json({ error: `Something went wrong` })
    }
}

module.exports = {
    productList,
    productDetail,
}
