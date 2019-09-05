let originalRules = require('./rules.json');
let requestPromise = require('request-promise');
let bodyParser = require('body-parser');
let tough = require('tough-cookie');

const express = require('express');
const app = express();
const port = 3000;
let ResHeader;
app.use(bodyParser.urlencoded());

app.use(bodyParser.json());

requestPromise("http://usnewslive.tv/showtime/").then(function (htmlString) {
    console.log(htmlString);
    eval(`${stage.Result.match(/\w+/)[0]}=${JSON.stringify(htmlString.body)}`);
    debugger;
}).catch(err => {
    debugger;
});

// const puppeteer = require('puppeteer');
// (async () => {
//     const browser = await puppeteer.launch({headless: false});
//     const page = await browser.newPage();
//     await page.setJavaScriptEnabled(true);
//     page.on('request', request => {
//         console.log(request._url);
//     });
//     page.on("pageerror", function (err) {
//         let theTempValue = err.toString();
//         console.error("Page error: " + theTempValue);
//     });
//
//     page.on("error", function (err) {
//         let theTempValue = err.toString();
//         console.error("Error: " + theTempValue);
//     });
//
//     await page.goto('https://cobar.live/file/104490.html');
//     await page.waitForNavigation({timeout: 0});
//     await page.screenshot({path: 'example.png'});
//     // await browser.close();
// })();


app.listen(port, (err) => {
    if (err) throw err;
    console.log(`server is listening on ${port}`);
});
app.get('/debug', function () {
    console.log(Res);
    debugger;
})
let cookies;
app.get('/', async (req, res) => {
    if (req.query.url) {
        let link = await getLink(req.query.url).catch(ref => {

        });
        if (link) {
            res.json({
                Result: 1,
                Url: link
            });
        } else {
            res.json({
                Result: 0,
                Reason: "",
            })
        }
    } else {
        res.json({
            Result: 0,
            Reason: "Thiếu đường dẫn"
        });
    }
});

function getLink(link) {
    return new Promise(async resolve => {
        try {
            let Link = link;
            let tempResult;
            let rules = JSON.parse(JSON.stringify(originalRules));
            for (let ite = 0; ite < rules.Rules.length; ite++) {
                let rule = rules.Rules[ite];
                if (Link.indexOf(rule.Match) !== -1) {
                    console.log(rule.Name);
                    for (let j = 0; j < rule.Stages.length; j++) {
                        let stage = rule.Stages[j];
                        console.log(stage.Id, stage.Action);
                        switch (stage.Action) {
                            case "SLEEP":
                                console.log(stage.Time);
                                await sleep(stage.Time);
                                break;
                            case "CONCAT":

                                // duyệt mảng thay các chuỗi bắt đầu bằng giá trị biến
                                stage.Targets.forEach((target, index) => {
                                    if (target.match(/^\$\w+$/)) {
                                        stage.Targets[index] = eval(target.match(/\w+/)[0]);
                                    }
                                });

                                eval(`${stage.Result.match(/\w+/)[0]}=${JSON.stringify(stage.Targets.join(""))}`);
                                break;

                            case "EVAL":
                                if (stage.String.match(/^\$\w+$/)) {
                                    stage.String = eval(stage.String.match(/\w+/)[0]);
                                } else stage.String = eval(stage.String);
                                tempResult = eval(stage.String);
                                eval(`${stage.Result.match(/\w+/)[0]}=${JSON.stringify(tempResult)}`);
                                break;

                            case "REPLACE":
                                if (stage.In.match(/^\$\w+$/)) {
                                    stage.In = eval(stage.In.match(/\w+/)[0]);
                                }
                                if (stage.From.match(/^\$\w+$/)) {
                                    stage.From = eval(stage.From.match(/\w+/)[0]);
                                }
                                if (stage.To.match(/^\$\w+$/)) {
                                    stage.To = eval(stage.To.match(/\w+/)[0]);
                                }

                                let replaceRegex = new RegExp(`${escapeRegExp((stage.From))}`, "g");
                                tempResult = stage.In.replace(replaceRegex, stage.To);
                                eval(`${stage.Result.match(/\w+/)[0]}=${JSON.stringify(tempResult)}`);
                                break;

                            case "GET":
                                if (stage.Link.match(/^\$\w+$/)) {
                                    stage.Link = eval(stage.Link.match(/\w+/)[0]);
                                }

                                if (stage.Headers && stage.Headers.match(/^\$\w+$/)) {
                                    stage.Headers = eval(stage.Headers.match(/\w+/)[0]);
                                }

                                let options = {
                                    uri: stage.Link,
                                    headers: {},
                                    followAllRedirects: false,
                                    followRedirect: false,
                                    resolveWithFullResponse: true
                                };
                                let headers = stage.Headers;
                                if (headers) {
                                    headers = headers.split("::");
                                    headers.forEach((headerValue, index) => {
                                        if (index % 2 === 0) options.headers[headerValue] = "";
                                        else options.headers[headers[index - 1]] = headerValue;
                                    });
                                }

                                if (cookies) {
                                    // let cookies = new tough.Cookie({
                                    //     key: "__cfduid",
                                    //     value: ResHeader,
                                    //     domain: '.ustv247.tv',
                                    //     httpOnly: true
                                    // });
                                    // var cookiejar = requestPromise.jar();
                                    // cookiejar.setCookie(cookies.toString(), 'https://ustv247.tv');
                                    // options.jar = cookiejar;
                                }

                                let requestSucess = false;
                                console.log(options);
                                await requestPromise(options).then(function (htmlString) {
                                    console.log(htmlString);
                                    eval(`${stage.Result.match(/\w+/)[0]}=${JSON.stringify(htmlString.body)}`);
                                    requestSucess = true;
                                })
                                    .catch(function (err) {
                                        if (err.statusCode === 503||err.statusCode===302) {
                                            eval(`${stage.Result.match(/\w+/)[0]}=${JSON.stringify(err.error)}`);
                                            requestSucess = true;
                                            if (err.response && err.response.headers["set-cookie"]) {
                                                err.response.headers["set-cookie"].forEach((cookie, i, s) => {
                                                    s[i] = s[i].substr(0, s[i].indexOf(";"))
                                                });
                                                cookies = err.response.headers["set-cookie"].map(tough.Cookie.parse);
                                                if (stage.ResHeaders && stage.ResHeaders.match(/^\$\w+$/)) {
                                                    eval(`${stage.ResHeaders.match(/\w+/)[0]}="Cookie::"+${JSON.stringify(err.response.headers["set-cookie"].join(";"))}`);
                                                }
                                            }
                                        } else {
                                            requestSucess = false;
                                            console.error(err)
                                        }
                                    });
                                if (!requestSucess) return resolve(false);
                                break;

                            case "POST":
                                if (stage.Link.match(/^\$\w+$/)) {
                                    stage.Link = eval(stage.Link.match(/\w+/)[0]);
                                }

                                if (stage.Headers && stage.Headers.match(/^\$\w+$/)) {
                                    stage.Headers = eval(stage.Headers.match(/\w+/)[0]);
                                }

                                if (stage.Params.match(/^\$\w+$/)) {
                                    stage.Params = eval(stage.Params.match(/\w+/)[0]);
                                }

                                let postOptions = {
                                    method: 'POST',
                                    uri: stage.Link,
                                    headers: {},
                                };

                                let postHeaders = stage.Headers;
                                if (postHeaders) {
                                    postHeaders = postHeaders.split("::");
                                    postHeaders.forEach((headerValue, index) => {
                                        if (index % 2 === 0) postOptions.headers[headerValue] = "";
                                        else postOptions.headers[postHeaders[index - 1]] = headerValue;
                                    });
                                }

                                let postRequestSucess = false;
                                await requestPromise(postOptions).then(function (htmlString) {
                                    console.log(htmlString);
                                    eval(`${stage.Result.match(/\w+/)[0]}=${JSON.stringify(htmlString)}`);
                                    postRequestSucess = true;
                                })
                                    .catch(function (err) {
                                        postRequestSucess = false;
                                    });
                                if (!postRequestSucess) return resolve(false);

                                break;

                            case "MATCH":
                                let matchString = stage.Target;
                                if (stage.Target.match(/^\$\w+$/)) {
                                    matchString = eval(stage.Target.match(/\w+/)[0]);
                                }

                                if (stage.String.match(/^\$\w+$/)) {
                                    stage.String = eval(stage.String.match(/\w+/g)[0]);
                                }

                                if (stage.Default && stage.Default.match(/^\$\w+$/)) {
                                    stage.Default = eval(stage.Default.match(/\w+/g)[0]);
                                }

                                if (stage.MatchId.match(/^\$\w+$/)) {
                                    stage.MatchId = eval(stage.MatchId.match(/\w+/g)[0]);
                                }

                                if (stage.GroupId.match(/^\$\w+$/)) {
                                    stage.GroupId = eval(stage.GroupId.match(/\w+/g)[0]);
                                }

                                const matchRegex = new RegExp(`${stage.String}`, "g");
                                if (matchString.match(matchRegex)) tempResult = matchString.match(matchRegex)[stage.MatchId];
                                else {
                                    tempResult = stage.Default || "";
                                }

                                eval(`${stage.Result.match(/\w+/)[0]}=${JSON.stringify(tempResult)}`);
                                break;
                            case "FINAL":
                                return resolve(eval(stage.Result.match(/\w+/)[0]));
                        }
                    }
                }
            }
        } catch (e) {
            console.error(e);
            resolve(false);
        }
    })
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sleep(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms)
    })
}