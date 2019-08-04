const Apify = require('apify');
const util = require('util');


Apify.main(async () => {
    const sources = ['https://www.visithoustontexas.com/events/']

const requestList = await Apify.openRequestList('events', sources);
const requestQueue = await Apify.openRequestQueue();

    const crawler = new Apify.PuppeteerCrawler({
        maxRequestsPerCrawl: 15,
        requestList,
        requestQueue,
        handlePageFunction: async function(context) {
            const { page, request} = context;
            console.log(`Processing ${request.url}`);

            if (request.userData.eventPage) { 
                //find the description
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
            
                    //find the address
            
                    //the address is split into an array to be itterated
                    const addressArray = place.split(/[|,]/).map(function(item){
                        //trim white space to properly parse and format
                        return item.trim();
                    });
            
                    //destructure address array into variables
                    const [street, city, statePostal] = [addressArray[0], addressArray[1], addressArray[2]]
                    const [state, postal] = statePostal.split(" ");
            
                    //create an array of the information contained in the details div
            
                    //this is important, as the formatting of the details is within
                    //divs with no classes
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
            
                    //timestamp
                    const timestamp = Date.now();
            
                    //format as object
                    const event = {
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
            
            
                // Log data and push to dataset
                console.log(util.inspect(event, false, null));
                await Apify.pushData(event);
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