const fs = require('fs')

const fileLogs = async (req, res) => {
    // let bannersRawData = fs.readFileSync('log/debug-13-10-2022.log')
    // let bannersRawData = fs.readFileSync(
    //     'log/debug-13-10-2022.log',
    //     [encoding],
    //     [callback]
    // )
    // fs.readFile(file, [encoding], [callback]);
    const bannersRawData = fs.readFileSync('log/debug-13-10-2022.log', 'utf8')

    // let banners = await JSON.parse([bannersRawData])

    return res.status(200).json([await JSON.parse(JSON.stringify(bannersRawData))])
}

module.exports = {
    fileLogs,
}
