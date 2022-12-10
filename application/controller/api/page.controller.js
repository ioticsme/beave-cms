const collect = require('collect.js')
// const Content = require('../../node_modules/@ioticsme/cms/model/Content')
// const Banner = require('../../node_modules/@ioticsme/cms/model/Banner')
const Product = require('../../model/Product')
const Brand = require('../../model/Brand')
// const Gallery = require('../../node_modules/@ioticsme/cms/model/Gallery')

const ProductResource = require('../../resources/api/product.resource')

// Home
const homePage = async (req, res) => {
    try {
        const banner = await Banner.findOne({
            brand: req.brand._id,
            country: req.country._id,
            published: true,
            in_home: true,
        }).select(
            '-brand -country -author -in_home -created_at -updated_at -published -isDeleted -deletedAt -__v'
        )
        const gallery = await Gallery.findOne({
            brand: req.brand._id,
            country: req.country._id,
            published: true,
            in_home: true,
        }).select(
            '-brand -country -author -in_home -created_at -updated_at -published -isDeleted -deletedAt -__v'
        )

        const contents = await Content.find({
            brand: req.brand._id,
            country: req.country._id,
            published: true,
            in_home: true,
            // [`content.${req.language || 'en'}.in_home`]: true,
        })
            .sort('position')
            .select(
                '-brand -attached_type -template_name -in_home -author -country -custom_fields -__v -created_at -updated_at -published -isDeleted -deletedAt -meta -type_slug'
            )
            .populate('banner')
            .populate('gallery')
            .populate('type_id', '-_id slug')
        const collection = collect(contents)
        const grouped = collection.groupBy('type_id.slug')
        const data = grouped.all()

        const products = ProductResource.collection(
            await Product.aggregate([
                {
                    $match: {
                        brand: req.brand._id,
                        country: req.country._id,
                        product_type: 'regular',
                        featured: true,
                        published: true,
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

            // await Product.find({
            //     brand: req.brand._id,
            //     country: req.country._id,
            //     product_type: 'regular',
            //     featured: true,
            //     published: true,
            // })
            //     .sort('position')
            //     .populate('country')
            //     .select(
            //         '-cat_id -author -brand -created_at -updated_at -published -isDeleted -deletedAt  -__v -free_product -category'
            //     )
        )

        // const products = ProductResource.collection(
        //     await Product.aggregate([
        //         {
        //             $match: {
        //                 brand: req.brand._id,
        //                 country: req.country._id,
        //                 product_type: 'regular',
        //                 published: true,
        //             },
        //         },
        //         {
        //             $addFields: {
        //                 currency: 'aed',
        //             },
        //         },
        //         {
        //             $lookup: {
        //                 from: 'countries',
        //                 localField: 'country',
        //                 foreignField: '_id',
        //                 as: 'country',
        //             },
        //         },
        //         { $sort: { position: 1 } },
        //     ])
        // )

        const brands = await Brand.find({
            // _id: { $ne: req.brand._id },
            active: true,
        }).select(
            ' -languages -domains -created_at -updated_at -published -isDeleted -deletedAt -__v'
        )
        const globalMeta = req.brand?.domains?.meta
        // Restructuring the global meta
        const newGlobalMeta = {
            en: {
                title: globalMeta.title.en,
                description: globalMeta.description.en,
                keywords: globalMeta.keywords.en,
                og_image: globalMeta.og_image.en,
            },
            ar: {
                title: globalMeta.title.ar,
                description: globalMeta.description.ar,
                keywords: globalMeta.keywords.ar,
                og_image: globalMeta.og_image.ar,
            },
        }
        const navigation = req.navigation
        const home = {
            banner,
            gallery,
            ...data,
            products,
            brands,
            navigation,
            meta: newGlobalMeta,
        }

        return res.status(200).json(home)
    } catch (error) {
        return res.status(500).json({ error: `Something went wrong` })
    }
}

module.exports = {
    homePage,
}
