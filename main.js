const Apify = require('apify');

Apify.main(async () => {
    const sources = ['https://www.visithoustontexas.com/events/']

const requestList = await Apify.openRequestList('events', sources);
const requestQueue = await Apify.openRequestQueue();

    const crawler = new Apify.PuppeteerCrawler({
        maxRequestsPerCrawl: 50,
        requestList,
        requestQueue,
        handlePageFunction: async function(context) {
            const { page, request, log } = context;
            console.log(`Processing ${request.url}`);

            if (request.userData.eventPage) {
                // find the description
                const description = await page.evaluate(
                () => document.querySelector("#tab-details").innerText
            );
                
                //find the date    
                const date = await page.evaluate(
                () => document.querySelector("div.detail-top > div.detail-c2.left > div.dates").innerText
            );

                //   find the place
                const place = await page.evaluate(
                    () => document.querySelector("div.detail-top > div.detail-c2.left > div.adrs").innerText
                );

                const addressArray = place.split(/[|,]/).map(function(item){
                    return item.trim();
                });
                const [street, city, statePostal] = [addressArray[0], addressArray[1], addressArray[2]]
                const [state, postal] = statePostal.split(" ")

                //create an array of the information contained in the details div
                const eventArray = await page.evaluate(
                () => [...document.querySelectorAll('div.detail-top > div.detail-c2.left > div')].map(elem => elem.innerText)
            );

                //filter for eventArray for specific information without a selector
                const recurring = eventArray.filter(info => 
                info.includes('Recurring'))
                .toString();
                
                const phone = eventArray.filter(info => 
                info.includes('Phone:'))
                .toString().replace('Phone: ', "");

                const time = eventArray.filter(info => 
                info.includes('Times:'))
                .toString().replace('Times: ', "");

                const contact = eventArray.filter(info => 
                info.includes('Contact:'))
                .toString().replace('Contact: ', "");

                const admission = eventArray.filter(info => 
                info.includes('Admission:'))
                .toString().replace('Admission: ', "");

                //   timestamp
                const timestamp = Date.now();

                let event = {
                    "url": request.url,
                    "description": description,
                    "date": date,
                    "time": time,
                    "recurring": recurring,

                    "place": {
                        "street": street,
                        "city": city,
                        "state": state,
                        "postal": postal
                    },

                    "details": {
                        "contact": contact,
                        "phone": phone,
                        "admission": admission
                    },

                    "timestamp": timestamp
                }
                console.log('Events: ', event )
            }

            if (request.userData.eventsPage) {
                // A function to be evaluated by Puppeteer within the browser context.
                const getMoreLinks = $links => {
                    const data = [];

                    // Find the href of each header for each event
                    $links.forEach($link => {
                        data.push({
                            url: $link.querySelector('.title a').href,
                        });
                    });

                    return data;
                };
                const data = await page.$$eval('.eventItem', getMoreLinks);

                // Store the results to the default dataset.
                await Apify.pushData(data);

            }

            if (!request.userData.eventsPage) {
                await Apify.utils.enqueueLinks({
                    page,
                    requestQueue,
                    pseudoUrls: ['https://www.visithoustontexas.com/events/?page=[\d+]'],
                    transformRequestFunction: req => {
                        req.userData.eventsPage = true;
                        return req;
                    },
                });
            }

            if (!request.userData.eventPage) {
                await Apify.utils.enqueueLinks({
                    page,
                    requestQueue,
                    selector: '.title a',
                    transformRequestFunction: req => {
                        req.userData.eventPage = true;
                        return req;
                    },
                });
            }
        },
    });

    await crawler.run();
});