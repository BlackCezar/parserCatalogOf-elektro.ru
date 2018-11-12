let needle = require('needle'),
    cheerio = require('cheerio'),
    fs = require('fs'),
    counter = 0,
    badUrl = [],
    badCatalog = []

    process.on('uncaughtException', err => {
        console.log('ERROR ' + err)
    })

    parseLowCatalog('https://www.elektro.ru/catalog/')


    function parseLowCatalog(url) {
            needle.get(url, function(error, response) {
                if (!error && response.statusCode == 200) {
                    page = cheerio.load(response.body)
                    lowCatalog = page('.catalogue_section').toArray()
                    for (div of lowCatalog) {
                        for (a of page(div).children().toArray()) {
                            let href = 'https://www.elektro.ru' + page(a).attr().href
                            parsePagesOfCatalog(href)
                            console.log('Parse pages of ' + href)
                        }
                    }
                } else {
                    badCatalog.push(url)
                }
            })
        
    }

    function parsePagesOfCatalog(url) {
            needle.get(url, function(error, response) {
                if (!error && response.statusCode == 200) {
                    page = cheerio.load(response.body)
                    if (page('div.last.box').children().toArray()[0]) {
                        pageCount = page('div.last.box').children().toArray()[0].attribs['data-page-num']

                        let i = 0;
                        let id = setInterval(function() {
                            if (i == 3) {
                                clearInterval(id)
                            }
                            parsePageOfCatalog(url + `?page=${i}`); 
                            i++
                            console.log(i)
                        }, 10000)
                    } else {
                        console.log('parsing low catalog')
                        parseLowCatalog(url)
                    }
                    
                } else {
                    badCatalog.push(url)
                }
            })
    }

    function parsePageOfCatalog(url) {
            needle.get(url, function(error, response) {
                if (!error && response.statusCode == 200) {
                    page = cheerio.load(response.body)
                    pageOfCatalog = page('.name').toArray()
                    for (item of pageOfCatalog) {
                        let a = page(item).children()[0]
                        parsePage('https://www.elektro.ru' + page(a).attr().href)
                        setTimeout(()=> {}, 1000)
                    }
                } else {
                    badUrl.push(url)
                }
            })
    }

   
    function parsePage(url) {
            needle.get(url, function(error, response) {
                console.log(url)
                if (!error && response.statusCode == 200) {
                    let data = {},
                        props = [],
                        page = cheerio.load(response.body)
                    
                    data.title = page('body > div.wrapper > div.middle > div > div.product.productPageOne > h1').text()
                    data.catalog = getBreadcrums(page)
                    if (page('div.width360.float-left.image_block > div > a > img').attr()) {
                        data.img = page('div.width360.float-left.image_block > div > a > img').attr().src
                    } else  data.img = 'https://www.elektro.ru/upload/photo_500.png'
                    data.article = page('.product_article > b').text()
                    data.price = page('div.buy_block__top > div:nth-child(1) > div').text()
                    let desc = page('.product_desc  > p').toArray(),
                        descc = ""
                    for (el of desc) {
                        descc += page(el).text()
                        descc = descc.replace(/\r?\n/g, "")
                    }
                    data.desc = descc
                    data.props = getShortDesc(page)
        
                    let pushHeader = checkFirstString('test.csv', 'title')
                    pushInFile(data, pushHeader)                    
                } else {
                    badUrl.push(url)
                }
                })
    }

    function getBreadcrums(page) {
        let br = page('.breadcrums').children().toArray(),
            path = ''
        for (element of br) {
            if (page(element).text().trim() != 'Главная' & page(element).text().trim() != 'Каталог товаров' & page(element).text().trim() != '') {
                path += page(element).text().trim().replace(/\n/, "") + ' '
                if (br.indexOf(element) != br.length -1) {
                    path += '-> '
                }
            }
        }
        return path
    }
    function checkFirstString(file, checkString) {
        let first = true,
            content = fs.readFileSync(file, 'utf8'),
            line = content.split('\n')
        for (prop of line) {
            if (first) {
                if (prop.split(';')[0] != checkString)  {
                    return true
                }
            }
            first = false
        }
        return false
    }
    function pushInFile(data, headers) {
        try {
            if (headers) {
                for (prop in data) {
                        fs.appendFileSync("test.csv", prop + ';');
                }
                fs.appendFileSync("test.csv", '\n')
                for (prop in data) {
                    fs.appendFileSync("test.csv", data[prop] + ';');
                }
                fs.appendFileSync("test.csv", '\n')
            } else {
                for (prop in data) {
                    fs.appendFileSync("test.csv", data[prop] + ';');
                }
                fs.appendFileSync("test.csv", '\n')
            }
            return true
        } catch (ex) {
            console.log('WARNING, error ' + ex)
        }
    }
    function getShortDesc(page) {
        let names = [],
            values = []
        for (name of page('.prop_name').toArray())  {
            name = page(name).text()
            name = name.trim()
            names.push(name)
        }
        for (name of page('.prop_value').toArray())  {
            values.push(page(name).text())
        }
        let list = '<div class="props-list">'
        for (let i = 0; i < names.length; i++) {
            let table = `<table class="top_props"><tbody><tr><td class=""><div class="prop_name">${names[i]}</div></td><td class=""><div class="prop_value">${values[i]}</div></td></tr></tbody></table>`
            list +=table
        }
        list +='</div>'
        return list

    }