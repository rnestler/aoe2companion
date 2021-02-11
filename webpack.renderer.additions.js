module.exports = {
    module: {
        rules: [
            {
                test: /\.json.lazy$/,
                use: 'json-loader'
            }
        ]
    }
}
