require('dotenv').config()
const ImageKit = require('imagekit')
const Media = require('../model/Media')
var FileReader = require('filereader')

// Upload function internally uses the ImageKit.io javascript SDK
const uploadMedia = async (media, folder, new_name) => {
    // SDK initialization
    const imagekit = new ImageKit({
        publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
        privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
        urlEndpoint: process.env.IMAGEKIT_URL,
    })

    // URL generation
    const imageURL = imagekit.url({
        path: '/default-image.jpg',
        transformation: [
            {
                height: '300',
                width: '400',
            },
        ],
    })

    let nodeEnv = process.env.NODE_ENV
    let baseFolder = `${process.env.IMAGEKIT_FOLDER}/${
        nodeEnv.charAt(0).toUpperCase() + nodeEnv.slice(1)
    }`
    const uploaded = imagekit
        .upload({
            folder: `${baseFolder}/${folder}`,
            file: media,
            fileName: new_name,
            // tags : ["tag1"]
        })
        .then(async (result) => {
            // const rendered_url = await imagekit.url({
            //     src: result.url,
            //     transformation: [{ height: 300, width: 400 }],
            // })

            const insertedMedia = await Media.create({
                url: result.url,
                response: result,
            })

            return insertedMedia
        })
        .catch((error) => {
            console.log('ERR', error)
            return false
        })

    return uploaded
}

module.exports = {
    uploadMedia,
}
