const Apify = require('apify');
const util = require('util');


Apify.main(async () => {

    // Get queue and enqueue first url.
    const requestQueue = await Apify.openRequestQueue();
    await requestQueue.addRequest(new Apify.Request({ url: 'https://www.visithoustontexas.com/event/zumba-in-the-plaza/59011/' }));

    // Create crawler.
    const crawler = new Apify.PuppeteerCrawler({
        requestQueue,

        // This page is executed for each request.
        // If request failes then it's retried 3 times.
        // Parameter page is Puppeteers page object with loaded page.
        handlePageFunction: async function pageFunction(context) {
            const { page, request, log } = context;
        
        
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
        
        console.log(event);
    },

        // If request failed 4 times then this function is executed.
        handleFailedRequestFunction: async ({ request }) => {
            console.log(`Request ${request.url} failed 4 times`);
        },
    });

    // Run crawler.
    await crawler.run();
    
});

    // Log data (util is a tool that nicely formats objects in the console)
    // console.log(util.inspect(url, false, null));
