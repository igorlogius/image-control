/* global browser */
(async function() {

    //const temporary = browser.runtime.id.endsWith('@temporary-addon'); // debugging?
    const manifest = browser.runtime.getManifest();
    const extname = manifest.name;

    const filter = {
        urls: ["<all_urls>"],
        types: ["image", "imageset"]
    };
    const extraInfoSpec = ["blocking"];

    let store = await browser.storage.local.get('dontLoadImages');
    store = (typeof store['dontLoadImages'] !== 'undefined') ? store['dontLoadImages'] : {} ;
    //console.log('store ', JSON.stringify(store,null,4));
    let mode = (typeof store['mode'] === 'boolean') ? store['mode'] : false; // false := whitelist

    browser.browserAction.setTitle({title: (mode?"black":"white") + "list" });
    browser.browserAction.setIcon({path: (mode?"black":"white") + ".png" });

    async function setStorage(store) {
        await browser.storage.local.set({'dontLoadImages': store});
    }

    async function BAonClicked() {
        mode=(!mode);
        browser.browserAction.setIcon({path: (mode?"black":"white") + ".png" });
        browser.browserAction.setTitle({title: (mode?"black":"white") + "list" });

        store['mode'] = mode;
        await setStorage(store);

        /*

        const can_notify = await browser.permissions.contains({
            permissions: ["notifications"]
        });

        //console.log('can_notify', can_notify);

        if(can_notify) {
        */
        const notify_title = extname + '\nSwitched to ' + ((mode)?"black":"white") + "list mode";
        let notify_message = "";
        if(mode) {
            notify_message = "added origin entries will not load and display images";
        }else{
            notify_message = "only added origin entries will load and display images";
        }
        const nID = await browser.notifications.create(extname, {
            "type": "basic",
            "iconUrl": browser.runtime.getURL("icon.png"),
            "title": notify_title,
            "message":  notify_message
        });
        //}

        // wait 5 Seconds to clear the notification
        setTimeout(() => {
             browser.notifications.clear(nID);
        },4*1000);
    }

    async function onBeforeRequest (details) {

        // the url of the tab which triggered the request
        // determines if all subsequent images will be loaded
        const tab = await browser.tabs.get(details.tabId);
        const domain = new URL(tab.url);
        const origin = domain.origin;


        if(mode) { // blacklist
            if(typeof store[origin] === 'boolean'){
                //console.log('blacklist block request to ', details.url , " from " ,  origin);
                return {cancel: true};
            }
        }else{ // whitelist
            if(typeof store[origin] !== 'boolean'){
                //console.log('whitelist block request to ', details.url , " from " ,  origin);
                return {cancel: true};
            }
        }
        //console.log('loaded', details.url);


    }


    async function PAonClicked(tab) {
        const domain = new URL(tab.url);

        //console.log('PAonClicked domain: ' + domain.origin);

        let notify_title = '';
        let notify_message = '';
        if (typeof store[domain.origin] === 'boolean') {
            delete store[domain.origin];

            if(mode) { // blacklist
                notify_title = extname + '\nremoved "' + domain.origin + '" from blacklist';
                notify_message = 'tabs with this origin will load images';
            }else{
                notify_title = extname + '\nremoved "' + domain.origin + '" from whitelist';
                notify_message = 'tabs with this origin will not load images';
            }

            browser.pageAction.setIcon({tabId: tab.id, path: "plus.png" });
            browser.pageAction.setTitle({tabId: tab.id, title: "add to list" });
        }else{
            store[domain.origin] = true;

            if(mode) { // blacklist
                notify_title = extname + '\nadded "' + domain.origin + '" to blacklist';
                notify_message = 'tabs with this origin will not load images';
            }else{
                notify_title = extname + '\nadded "' + domain.origin + '" to whitelist';
                notify_message = 'tabs with this origin will load images';
            }

            browser.pageAction.setIcon({tabId: tab.id, path: "minus.png" });
            browser.pageAction.setTitle({tabId: tab.id, title: "remove from list" });
        }
        //console.log(store);
        setStorage(store);

        /*
        const can_notify = await browser.permissions.contains({
            permissions: ["notifications"]
        });

        if(can_notify) {
        */
        browser.notifications.create(extname, {
            "type": "basic",
            "iconUrl": browser.runtime.getURL("icon.png"),
            "title": notify_title,
            "message":  notify_message
        });
        //}
    }

    function onUpdated(tabId, changeInfo, tab) {

        if (changeInfo.status === 'complete' && typeof tab.url === 'string'){

            const domain = new URL(tab.url);
            if (typeof store[domain.origin] !== 'boolean') {
                browser.pageAction.setIcon({tabId: tabId, path: "plus.png" });
                browser.pageAction.setTitle({tabId: tabId, title: "add to list" });

                if(mode) { // blacklist
                }else{
                    browser.tabs.insertCSS(tabId,{
                        file: "inject.css"
                        ,allFrames: true
                        ,runAt: "document_end"
                        ,cssOrigin: "user"
                    });

                    browser.tabs.executeScript(tabId,{
                        file: "inject.js"
                        ,allFrames: true
                        ,runAt: "document_end"
                    });
                }
            }else {
                browser.pageAction.setIcon({tabId: tabId, path: "minus.png" });
                browser.pageAction.setTitle({tabId: tabId, title: "remove from list" });

                if(mode) { // blacklist
                    browser.tabs.insertCSS(tabId,{
                        file: "inject.css"
                        ,allFrames: true
                        ,runAt: "document_end"
                        ,cssOrigin: "user"
                    });
                    browser.tabs.executeScript(tabId,{
                        file: "inject.js"
                        ,allFrames: true
                        ,runAt: "document_end"
                    });
                }
            }

        }

    }

    browser.tabs.onUpdated.addListener(onUpdated, { urls: ["<all_urls>"], properties: ["status"] });
    browser.webRequest.onBeforeRequest.addListener(onBeforeRequest,filter,extraInfoSpec);
    browser.browserAction.onClicked.addListener(BAonClicked);
    browser.pageAction.onClicked.addListener(PAonClicked);

}());
