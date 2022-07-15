/* global browser */
(async function() {

    const onBeforeRequestFilter = { urls: ["<all_urls>"], types: ["image", "imageset"] };
    const onBeforeRequestExtraInfoSpec = ["blocking"];
    const onUpdatedFilter = { urls: ["<all_urls>"], properties: ["status"] };

    let list;
    let mode;

    //const temporary = browser.runtime.id.endsWith('@temporary-addon'); // debugging?
    const manifest = browser.runtime.getManifest();
    const extname = manifest.name;

    async function getFromStorage(type, id, fallback) {
		let tmp = await browser.storage.local.get(id);
		return (typeof tmp[id] === type) ? tmp[id] : fallback;
	}

    async function saveList() {
        return browser.storage.local.set({'list': [...list]});
	}
    async function saveMode() {
        return browser.storage.local.set({'mode': mode});
	}

    async function onBrowserActionClicked() {
        mode=(!mode);
        browser.browserAction.setIcon({path: (mode?"black":"white") + ".png" });
        browser.browserAction.setTitle({title: (mode?"black":"white") + "list" });
        saveMode();

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

        // wait 4 Seconds to clear the notification
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
            if(list.has(origin)){
                //console.log('blacklist block request to ', details.url , " from " ,  origin);
                return {cancel: true};
            }
        }else{ // whitelist
            if(!list.has(origin)){
                //console.log('whitelist block request to ', details.url , " from " ,  origin);
                return {cancel: true};
            }
        }
        //console.log('loaded', details.url);
    }

    async function onPageActionClicked(tab) {
        const domain = new URL(tab.url);
        //console.log('onPageActionClicked domain: ' + domain.origin);

        let notify_title = '';
        let notify_message = '';
        if (list.has(domain.origin)) {
            list.delete(domain.origin);

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
            //console.debug('list.add', domain.origin);
            list.add(domain.origin);

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
        await saveList();

        browser.notifications.create(extname, {
            "type": "basic",
            "iconUrl": browser.runtime.getURL("icon.png"),
            "title": notify_title,
            "message":  notify_message
        });
    }

    function onUpdated(tabId, changeInfo, tab) {

        if (changeInfo.status === 'complete' && typeof tab.url === 'string'){

            const domain = new URL(tab.url);
            if (!list.has(domain.origin)) {
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


    // init
    list = new Set(await getFromStorage('Array', 'list', []));
    mode = await getFromStorage('boolean','mode', false); // false := whitelist

    browser.browserAction.setTitle({title: (mode?"black":"white") + "list" });
    browser.browserAction.setIcon({path: (mode?"black":"white") + ".png" });

    // register listeners
    browser.tabs.onUpdated.addListener(onUpdated, onUpdatedFilter);
    browser.webRequest.onBeforeRequest.addListener(onBeforeRequest,onBeforeRequestFilter,onBeforeRequestExtraInfoSpec);
    browser.browserAction.onClicked.addListener(onBrowserActionClicked);
    browser.pageAction.onClicked.addListener(onPageActionClicked);


    //  migrate old storage data on update
    async function onInstalled(details) {
        if(details.reason === "update") {
            const id = 'dontLoadImages';
            let tmp = await getFromStorage(typeof {},id, {}); // false := whitelist
            tmp = Object.keys(tmp); // to array
            list = new Set(tmp); // to set  & to "list"
            saveList(); // save
            // remove ported storage
            browser.storage.local.remove('dontLoadImages');
        }
    }
    browser.runtime.onInstalled.addListener(onInstalled);

}());
